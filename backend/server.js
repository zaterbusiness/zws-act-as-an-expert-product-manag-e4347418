import os
from datetime import datetime, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field, validator
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from jose import jwt, JWTError
from passlib.context import CryptContext
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
JWT_SECRET = os.getenv('JWT_SECRET', 'change-this-secret')
JWT_ALGORITHM = 'HS256'
TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

app = FastAPI(title='Zater API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

client = AsyncIOMotorClient(MONGO_URI)
db = client['zater']

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
oauth2_scheme = OAuth2PasswordBearer(tokenUrl='auth/login', auto_error=False)


# ---------- Models ----------
class SignupModel(BaseModel):
    name: str = Field(..., min_length=2, max_length=60)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    role: Literal['customer', 'driver', 'merchant'] = 'customer'


class LoginModel(BaseModel):
    email: EmailStr
    password: str


class TokenModel(BaseModel):
    access_token: str
    token_type: str = 'bearer'


class OrderItem(BaseModel):
    menu_item_id: str
    name: str
    price: float = Field(..., gt=0)
    qty: int = Field(..., gt=0, le=50)


class OrderCreate(BaseModel):
    restaurant_id: str
    items: List[OrderItem]
    total: float = Field(..., gt=0)

    @validator('items')
    def items_not_empty(cls, v):
        if not v:
            raise ValueError('Order must contain at least one item')
        return v


class OrderUpdate(BaseModel):
    status: Optional[Literal['pending', 'preparing', 'on_the_way', 'delivered', 'cancelled']] = None


# ---------- Helpers ----------
def create_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    payload = {'sub': user_id, 'exp': expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def serialize(doc: dict) -> dict:
    doc = dict(doc)
    doc['_id'] = str(doc['_id'])
    if 'restaurant_id' in doc and isinstance(doc['restaurant_id'], ObjectId):
        doc['restaurant_id'] = str(doc['restaurant_id'])
    doc.pop('password', None)
    return doc


async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)):
    if not token:
        raise HTTPException(status_code=401, detail='Not authenticated')
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('sub')
        if not user_id:
            raise HTTPException(status_code=401, detail='Invalid token')
    except JWTError:
        raise HTTPException(status_code=401, detail='Invalid or expired token')
    user = await db.users.find_one({'_id': ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail='User not found')
    return user


# ---------- Startup ----------
@app.on_event('startup')
async def startup():
    await db.users.create_index('email', unique=True)
    await db.restaurants.create_index('cuisine')
    await db.menu_items.create_index('restaurant_id')
    await db.orders.create_index('customer_id')


# ---------- Auth ----------
@app.post('/auth/signup', response_model=TokenModel)
async def signup(data: SignupModel):
    existing = await db.users.find_one({'email': data.email})
    if existing:
        raise HTTPException(status_code=400, detail='Email already registered')
    doc = {
        'name': data.name,
        'email': data.email,
        'password': pwd_context.hash(data.password),
        'role': data.role,
        'created_at': datetime.utcnow(),
    }
    result = await db.users.insert_one(doc)
    return TokenModel(access_token=create_token(str(result.inserted_id)))


@app.post('/auth/login', response_model=TokenModel)
async def login(data: LoginModel):
    user = await db.users.find_one({'email': data.email})
    if not user or not pwd_context.verify(data.password, user['password']):
        raise HTTPException(status_code=401, detail='Invalid email or password')
    return TokenModel(access_token=create_token(str(user['_id'])))


@app.get('/auth/me')
async def me(user=Depends(get_current_user)):
    return serialize(user)


# ---------- Restaurants ----------
@app.get('/restaurants')
async def list_restaurants(user=Depends(get_current_user)):
    docs = await db.restaurants.find().to_list(200)
    return [serialize(d) for d in docs]


@app.get('/restaurants/{rid}')
async def get_restaurant(rid: str, user=Depends(get_current_user)):
    try:
        doc = await db.restaurants.find_one({'_id': ObjectId(rid)})
    except Exception:
        raise HTTPException(status_code=400, detail='Invalid restaurant id')
    if not doc:
        raise HTTPException(status_code=404, detail='Restaurant not found')
    return serialize(doc)


@app.get('/restaurants/{rid}/menu')
async def get_menu(rid: str, user=Depends(get_current_user)):
    docs = await db.menu_items.find({'restaurant_id': rid}).to_list(200)
    return [serialize(d) for d in docs]


# ---------- Recommendations (simple AI heuristic) ----------
@app.get('/recommendations')
async def recommendations(user=Depends(get_current_user)):
    # Build preference profile from user's past orders, else fall back to top-rated items.
    orders = await db.orders.find({'customer_id': str(user['_id'])}).to_list(100)
    category_scores = {}
    for o in orders:
        for it in o.get('items', []):
            mi = await db.menu_items.find_one({'_id': ObjectId(it['menu_item_id'])}) if ObjectId.is_valid(it['menu_item_id']) else None
            if mi:
                cat = mi.get('category', 'Other')
                category_scores[cat] = category_scores.get(cat, 0) + it.get('qty', 1)
    if category_scores:
        top_cats = sorted(category_scores, key=category_scores.get, reverse=True)[:2]
        docs = await db.menu_items.find({'category': {'$in': top_cats}}).sort('popularity', -1).to_list(8)
    else:
        docs = await db.menu_items.find().sort('popularity', -1).to_list(8)
    return [serialize(d) for d in docs]


# ---------- Orders (CRUD) ----------
@app.get('/orders')
async def list_orders(user=Depends(get_current_user)):
    docs = await db.orders.find({'customer_id': str(user['_id'])}).sort('created_at', -1).to_list(200)
    return [serialize(d) for d in docs]


@app.post('/orders')
async def create_order(data: OrderCreate, user=Depends(get_current_user)):
    if not ObjectId.is_valid(data.restaurant_id):
        raise HTTPException(status_code=400, detail='Invalid restaurant id')
    rest = await db.restaurants.find_one({'_id': ObjectId(data.restaurant_id)})
    if not rest:
        raise HTTPException(status_code=404, detail='Restaurant not found')
    doc = {
        'customer_id': str(user['_id']),
        'restaurant_id': data.restaurant_id,
        'items': [i.dict() for i in data.items],
        'total': data.total,
        'status': 'pending',
        'created_at': datetime.utcnow(),
    }
    result = await db.orders.insert_one(doc)
    created = await db.orders.find_one({'_id': result.inserted_id})
    return serialize(created)


@app.patch('/orders/{oid}')
async def update_order(oid: str, data: OrderUpdate, user=Depends(get_current_user)):
    if not ObjectId.is_valid(oid):
        raise HTTPException(status_code=400, detail='Invalid order id')
    order = await db.orders.find_one({'_id': ObjectId(oid)})
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')
    if order['customer_id'] != str(user['_id']) and user['role'] not in ('driver', 'merchant'):
        raise HTTPException(status_code=403, detail='Not allowed')
    updates = {k: v for k, v in data.dict().items() if v is not None}
    if updates:
        await db.orders.update_one({'_id': ObjectId(oid)}, {'$set': updates})
    updated = await db.orders.find_one({'_id': ObjectId(oid)})
    return serialize(updated)


@app.delete('/orders/{oid}')
async def delete_order(oid: str, user=Depends(get_current_user)):
    if not ObjectId.is_valid(oid):
        raise HTTPException(status_code=400, detail='Invalid order id')
    order = await db.orders.find_one({'_id': ObjectId(oid)})
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')
    if order['customer_id'] != str(user['_id']):
        raise HTTPException(status_code=403, detail='Not allowed')
    if order['status'] != 'pending':
        raise HTTPException(status_code=400, detail='Only pending orders can be cancelled')
    await db.orders.update_one({'_id': ObjectId(oid)}, {'$set': {'status': 'cancelled'}})
    return {'ok': True}


@app.get('/')
async def root():
    return {'service': 'Zater API', 'status': 'running'}
