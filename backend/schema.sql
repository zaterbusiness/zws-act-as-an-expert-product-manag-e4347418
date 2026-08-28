import os
import asyncio
from datetime import datetime
from typing import List, Optional, Literal

from pydantic import BaseModel, EmailStr, Field
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

client = AsyncIOMotorClient(MONGO_URI)
db = client['zater']


# ---------- Document Models ----------
class UserDoc(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Literal['customer', 'driver', 'merchant'] = 'customer'
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RestaurantDoc(BaseModel):
    name: str
    cuisine: str
    rating: float
    eta_minutes: int
    address: str
    lat: float
    lng: float
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MenuItemDoc(BaseModel):
    restaurant_id: str
    name: str
    description: str
    category: str
    price: float
    popularity: int = 0


class OrderItemDoc(BaseModel):
    menu_item_id: str
    name: str
    price: float
    qty: int


class OrderDoc(BaseModel):
    customer_id: str
    restaurant_id: str
    items: List[OrderItemDoc]
    total: float
    status: Literal['pending', 'preparing', 'on_the_way', 'delivered', 'cancelled'] = 'pending'
    driver_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


async def seed_data():
    # Indexes
    await db.users.create_index('email', unique=True)
    await db.restaurants.create_index('cuisine')
    await db.menu_items.create_index('restaurant_id')
    await db.orders.create_index('customer_id')

    # Users
    if await db.users.count_documents({}) == 0:
        users = [
            {'name': 'Alice Customer', 'email': 'alice@zater.io', 'password': pwd_context.hash('password123'), 'role': 'customer', 'created_at': datetime.utcnow()},
            {'name': 'Bob Customer', 'email': 'bob@zater.io', 'password': pwd_context.hash('password123'), 'role': 'customer', 'created_at': datetime.utcnow()},
            {'name': 'Carla Diaz', 'email': 'carla@zater.io', 'password': pwd_context.hash('password123'), 'role': 'customer', 'created_at': datetime.utcnow()},
            {'name': 'Dan Rider', 'email': 'dan@zater.io', 'password': pwd_context.hash('password123'), 'role': 'driver', 'created_at': datetime.utcnow()},
            {'name': 'Eve Rider', 'email': 'eve@zater.io', 'password': pwd_context.hash('password123'), 'role': 'driver', 'created_at': datetime.utcnow()},
            {'name': 'Frank Merchant', 'email': 'frank@zater.io', 'password': pwd_context.hash('password123'), 'role': 'merchant', 'created_at': datetime.utcnow()},
            {'name': 'Grace Merchant', 'email': 'grace@zater.io', 'password': pwd_context.hash('password123'), 'role': 'merchant', 'created_at': datetime.utcnow()},
            {'name': 'Heidi Customer', 'email': 'heidi@zater.io', 'password': pwd_context.hash('password123'), 'role': 'customer', 'created_at': datetime.utcnow()},
        ]
        await db.users.insert_many(users)
        print('Seeded users')

    # Restaurants
    if await db.restaurants.count_documents({}) == 0:
        restaurants = [
            {'name': 'Bella Napoli', 'cuisine': 'Italian', 'rating': 4.7, 'eta_minutes': 25, 'address': '12 Roma St', 'lat': 40.7128, 'lng': -74.0060, 'created_at': datetime.utcnow()},
            {'name': 'Sakura Sushi', 'cuisine': 'Japanese', 'rating': 4.8, 'eta_minutes': 30, 'address': '88 Tokyo Ave', 'lat': 40.7180, 'lng': -74.0020, 'created_at': datetime.utcnow()},
            {'name': 'Taco Fiesta', 'cuisine': 'Mexican', 'rating': 4.5, 'eta_minutes': 20, 'address': '5 Sol Blvd', 'lat': 40.7200, 'lng': -74.0100, 'created_at': datetime.utcnow()},
            {'name': 'Curry House', 'cuisine': 'Indian', 'rating': 4.6, 'eta_minutes': 35, 'address': '9 Spice Rd', 'lat': 40.7090, 'lng': -74.0150, 'created_at': datetime.utcnow()},
            {'name': 'Burger Barn', 'cuisine': 'American', 'rating': 4.3, 'eta_minutes': 18, 'address': '77 Grill Ln', 'lat': 40.7150, 'lng': -74.0080, 'created_at': datetime.utcnow()},
            {'name': 'Green Bowl', 'cuisine': 'Healthy', 'rating': 4.4, 'eta_minutes': 22, 'address': '3 Fresh St', 'lat': 40.7250, 'lng': -74.0030, 'created_at': datetime.utcnow()},
            {'name': 'Dragon Wok', 'cuisine': 'Chinese', 'rating': 4.5, 'eta_minutes': 28, 'address': '21 East Way', 'lat': 40.7110, 'lng': -74.0050, 'created_at': datetime.utcnow()},
            {'name': 'Le Petit Cafe', 'cuisine': 'French', 'rating': 4.9, 'eta_minutes': 32, 'address': '4 Paris Ct', 'lat': 40.7300, 'lng': -74.0000, 'created_at': datetime.utcnow()},
        ]
        res = await db.restaurants.insert_many(restaurants)
        ids = res.inserted_ids
        print('Seeded restaurants')

        # Menu items (at least 8 documents)
        menu = [
            {'restaurant_id': str(ids[0]), 'name': 'Margherita Pizza', 'description': 'Tomato, mozzarella, basil', 'category': 'Pizza', 'price': 12.5, 'popularity': 95},
            {'restaurant_id': str(ids[0]), 'name': 'Spaghetti Carbonara', 'description': 'Egg, pancetta, pecorino', 'category': 'Pasta', 'price': 14.0, 'popularity': 80},
            {'restaurant_id': str(ids[1]), 'name': 'Salmon Nigiri', 'description': 'Fresh salmon over rice', 'category': 'Sushi', 'price': 9.0, 'popularity': 90},
            {'restaurant_id': str(ids[1]), 'name': 'Dragon Roll', 'description': 'Eel, avocado, cucumber', 'category': 'Sushi', 'price': 15.0, 'popularity': 88},
            {'restaurant_id': str(ids[2]), 'name': 'Beef Tacos', 'description': 'Three soft tacos with salsa', 'category': 'Tacos', 'price': 10.0, 'popularity': 85},
            {'restaurant_id': str(ids[3]), 'name': 'Chicken Tikka Masala', 'description': 'Creamy tomato curry', 'category': 'Curry', 'price': 13.5, 'popularity': 92},
            {'restaurant_id': str(ids[4]), 'name': 'Classic Cheeseburger', 'description': 'Beef, cheddar, lettuce', 'category': 'Burger', 'price': 11.0, 'popularity': 78},
            {'restaurant_id': str(ids[5]), 'name': 'Quinoa Power Bowl', 'description': 'Quinoa, kale, avocado', 'category': 'Healthy', 'price': 12.0, 'popularity': 70},
            {'restaurant_id': str(ids[6]), 'name': 'Kung Pao Chicken', 'description': 'Spicy peanut stir-fry', 'category': 'Chinese', 'price': 12.5, 'popularity': 82},
            {'restaurant_id': str(ids[7]), 'name': 'Croque Monsieur', 'description': 'Ham and cheese toast', 'category': 'French', 'price': 10.5, 'popularity': 65},
        ]
        await db.menu_items.insert_many(menu)
        print('Seeded menu items')

    # Orders
    if await db.orders.count_documents({}) == 0:
        cust = await db.users.find_one({'email': 'alice@zater.io'})
        rest = await db.restaurants.find_one({'name': 'Bella Napoli'})
        item = await db.menu_items.find_one({'name': 'Margherita Pizza'})
        if cust and rest and item:
            orders = []
            statuses = ['delivered', 'delivered', 'preparing', 'pending', 'delivered', 'cancelled', 'on_the_way', 'delivered']
            for s in statuses:
                orders.append({
                    'customer_id': str(cust['_id']),
                    'restaurant_id': str(rest['_id']),
                    'items': [{'menu_item_id': str(item['_id']), 'name': item['name'], 'price': item['price'], 'qty': 1}],
                    'total': item['price'],
                    'status': s,
                    'driver_id': None,
                    'created_at': datetime.utcnow(),
                })
            await db.orders.insert_many(orders)
            print('Seeded orders')

    print('Seeding complete.')


if __name__ == '__main__':
    asyncio.run(seed_data())
