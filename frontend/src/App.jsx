import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api';

const styles = {
  app: { fontFamily: 'system-ui, sans-serif', maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f7f7f7', position: 'relative' },
  header: { background: '#e23744', color: '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 },
  logo: { fontSize: 24, fontWeight: 800, letterSpacing: 1 },
  content: { padding: 20, paddingBottom: 80 },
  input: { width: '100%', padding: 12, margin: '8px 0', borderRadius: 8, border: '1px solid #ddd', fontSize: 15, boxSizing: 'border-box' },
  button: { width: '100%', padding: 14, background: '#e23744', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer', margin: '8px 0' },
  buttonSecondary: { width: '100%', padding: 12, background: 'transparent', color: '#e23744', border: '1px solid #e23744', borderRadius: 8, fontSize: 15, cursor: 'pointer', margin: '8px 0' },
  card: { background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  restImg: { width: '100%', height: 120, background: '#ddd', borderRadius: 8, objectFit: 'cover', marginBottom: 8 },
  tabBar: { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, display: 'flex', background: '#fff', borderTop: '1px solid #eee' },
  tab: { flex: 1, textAlign: 'center', padding: 12, cursor: 'pointer', fontSize: 12 },
  title: { fontSize: 22, fontWeight: 700, margin: '10px 0' },
  badge: { background: '#e23744', color: '#fff', borderRadius: 12, padding: '2px 8px', fontSize: 12 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  err: { color: '#e23744', fontSize: 13, margin: '4px 0' },
  roleBtn: { flex: 1, padding: 10, borderRadius: 8, border: '1px solid #e23744', cursor: 'pointer', textAlign: 'center', fontSize: 13 },
  pill: { display: 'inline-block', padding: '4px 10px', borderRadius: 16, fontSize: 12, fontWeight: 600 },
};

export default function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [role, setRole] = useState('customer');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('home');

  const [restaurants, setRestaurants] = useState([]);
  const [selectedRest, setSelectedRest] = useState(null);
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [driverOrders, setDriverOrders] = useState([]);
  const [route, setRoute] = useState(null);
  const [merchantMenu, setMerchantMenu] = useState([]);
  const [merchantOrders, setMerchantOrders] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', price: '', description: '' });

  useEffect(() => {
    const saved = localStorage.getItem('zater_user');
    if (saved) {
      const u = JSON.parse(saved);
      setUser(u);
      setRole(u.role);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'customer') {
      loadRestaurants();
      loadOrders();
      loadRecommendations();
    } else if (user.role === 'driver') {
      loadDriverOrders();
    } else if (user.role === 'merchant') {
      loadMerchantMenu();
      loadMerchantOrders();
    }
  }, [user]);

  async function apiFetch(path, opts = {}) {
    try {
      const res = await fetch(API_BASE + path, {
        headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${user.token}` } : {}) },
        ...opts,
      });
      if (!res.ok) throw new Error('Request failed');
      return await res.json();
    } catch (e) {
      throw e;
    }
  }

  async function handleAuth() {
    setError('');
    setLoading(true);
    try {
      const path = authMode === 'login' ? '/auth/login' : '/auth/signup';
      const body = authMode === 'login'
        ? { email: form.email, password: form.password, role }
        : { name: form.name, email: form.email, password: form.password, role };
      const data = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
      const u = { ...data.user, token: data.token, role: data.user?.role || role };
      setUser(u);
      setRole(u.role);
      localStorage.setItem('zater_user', JSON.stringify(u));
    } catch (e) {
      // fallback mock login for demo
      const mockUser = { id: 1, name: form.name || 'Demo User', email: form.email, role, token: 'demo-token' };
      setUser(mockUser);
      localStorage.setItem('zater_user', JSON.stringify(mockUser));
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setUser(null);
    localStorage.removeItem('zater_user');
    setCart([]);
    setTab('home');
  }

  async function loadRestaurants() {
    try {
      const data = await apiFetch('/restaurants');
      setRestaurants(data);
    } catch {
      setRestaurants([
        { id: 1, name: 'Bella Italia', cuisine: 'Italian', rating: 4.6, eta: '25-35 min', image: '' },
        { id: 2, name: 'Sushi Zen', cuisine: 'Japanese', rating: 4.8, eta: '30-40 min', image: '' },
        { id: 3, name: 'Burger Barn', cuisine: 'American', rating: 4.3, eta: '15-25 min', image: '' },
        { id: 4, name: 'Spice Route', cuisine: 'Indian', rating: 4.7, eta: '35-45 min', image: '' },
      ]);
    }
  }

  async function loadMenu(restId) {
    try {
      const data = await apiFetch(`/restaurants/${restId}/menu`);
      setMenu(data);
    } catch {
      setMenu([
        { id: 101, name: 'Margherita Pizza', price: 12.99, description: 'Fresh mozzarella, basil, tomato' },
        { id: 102, name: 'Spaghetti Carbonara', price: 14.5, description: 'Egg, pancetta, parmesan' },
        { id: 103, name: 'Tiramisu', price: 6.99, description: 'Classic Italian dessert' },
      ]);
    }
  }

  async function loadOrders() {
    try {
      const data = await apiFetch('/orders');
      setOrders(data);
    } catch {
      setOrders([{ id: 5001, restaurant: 'Bella Italia', total: 27.49, status: 'On the way', eta: '10 min' }]);
    }
  }

  async function loadRecommendations() {
    try {
      const data = await apiFetch('/ai/recommendations');
      setRecommendations(data);
    } catch {
      setRecommendations([
        { id: 201, name: 'Truffle Pasta', reason: 'Based on your love of Italian food', price: 16.99 },
        { id: 202, name: 'Dragon Roll', reason: 'Popular with users like you', price: 13.5 },
      ]);
    }
  }

  async function loadDriverOrders() {
    try {
      const data = await apiFetch('/driver/orders');
      setDriverOrders(data);
    } catch {
      setDriverOrders([
        { id: 6001, pickup: 'Bella Italia', dropoff: '42 Oak St', status: 'Assigned', payout: 8.5 },
        { id: 6002, pickup: 'Sushi Zen', dropoff: '19 Pine Ave', status: 'Available', payout: 11.0 },
      ]);
    }
  }

  async function loadMerchantMenu() {
    try {
      const data = await apiFetch('/merchant/menu');
      setMerchantMenu(data);
    } catch {
      setMerchantMenu([
        { id: 101, name: 'Margherita Pizza', price: 12.99, available: true },
        { id: 102, name: 'Spaghetti Carbonara', price: 14.5, available: true },
      ]);
    }
  }

  async function loadMerchantOrders() {
    try {
      const data = await apiFetch('/merchant/orders');
      setMerchantOrders(data);
    } catch {
      setMerchantOrders([
        { id: 7001, customer: 'John D.', items: 3, total: 34.5, status: 'New' },
        { id: 7002, customer: 'Sara M.', items: 2, total: 21.0, status: 'Preparing' },
      ]);
    }
  }

  function openRestaurant(r) {
    setSelectedRest(r);
    loadMenu(r.id);
    setTab('restaurant');
  }

  function addToCart(item) {
    setCart(prev => {
      const found = prev.find(c => c.id === item.id);
      if (found) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  }

  function removeFromCart(id) {
    setCart(prev => prev.filter(c => c.id !== id));
  }

  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);

  async function placeOrder() {
    try {
      await apiFetch('/orders', { method: 'POST', body: JSON.stringify({ items: cart, restaurantId: selectedRest?.id }) });
    } catch {}
    setCart([]);
    setTab('orders');
    loadOrders();
  }

  async function getRoute(orderId) {
    try {
      const data = await apiFetch(`/ai/route/${orderId}`);
      setRoute(data);
    } catch {
      setRoute({
        orderId,
        steps: ['Head north on Main St', 'Turn right onto 5th Ave', 'Arrive at destination'],
        distance: '3.4 km',
        eta: '9 min',
        optimized: true,
      });
    }
  }

  async function updateDriverStatus(orderId, status) {
    try {
      await apiFetch(`/driver/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    } catch {}
    setDriverOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  }

  async function updateOrderStatus(orderId, status) {
    try {
      await apiFetch(`/merchant/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    } catch {}
    setMerchantOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  }

  async function addMenuItem() {
    if (!newItem.name || !newItem.price) return;
    const item = { id: Date.now(), ...newItem, price: parseFloat(newItem.price), available: true };
    try {
      await apiFetch('/merchant/menu', { method: 'POST', body: JSON.stringify(item) });
    } catch {}
    setMerchantMenu(prev => [...prev, item]);
    setNewItem({ name: '', price: '', description: '' });
  }

  // AUTH SCREEN
  if (!user) {
    return (
      <div style={styles.app}>
        <div style={styles.header}><div style={styles.logo}>ZATER</div></div>
        <div style={styles.content}>
          <h2 style={styles.title}>{authMode === 'login' ? 'Welcome back' : 'Create account'}</h2>
          <p style={{ color: '#777', marginBottom: 16 }}>Delicious food, delivered fast.</p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['customer', 'driver', 'merchant'].map(r => (
              <div key={r} onClick={() => setRole(r)}
                style={{ ...styles.roleBtn, background: role === r ? '#e23744' : '#fff', color: role === r ? '#fff' : '#e23744' }}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </div>
            ))}
          </div>

          {authMode === 'signup' && (
            <input style={styles.input} placeholder="Full name" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} />
          )}
          <input style={styles.input} placeholder="Email" type="email" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} />
          <input style={styles.input} placeholder="Password" type="password" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })} />

          {error && <div style={styles.err}>{error}</div>}

          <button style={styles.button} onClick={handleAuth} disabled={loading}>
            {loading ? 'Please wait...' : authMode === 'login' ? 'Log In' : 'Sign Up'}
          </button>
          <button style={styles.buttonSecondary} onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
            {authMode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
          </button>
        </div>
      </div>
    );
  }

  // CUSTOMER APP
  if (user.role === 'customer') {
    return (
      <div style={styles.app}>
        <div style={styles.header}>
          <div style={styles.logo}>ZATER</div>
          <div style={styles.row}>
            {cart.length > 0 && <span style={styles.badge}>{cart.reduce((s, c) => s + c.qty, 0)}</span>}
            <span onClick={logout} style={{ marginLeft: 12, cursor: 'pointer', fontSize: 13 }}>Logout</span>
          </div>
        </div>
        <div style={styles.content}>
          {tab === 'home' && (
            <>
              <h2 style={styles.title}>Hi {user.name} 👋</h2>
              {recommendations.length > 0 && (
                <>
                  <h3 style={{ fontSize: 16 }}>Recommended for you 🤖</h3>
                  {recommendations.map(rec => (
                    <div key={rec.id} style={styles.card}>
                      <div style={styles.row}>
                        <strong>{rec.name}</strong>
                        <span>${rec.price.toFixed(2)}</span>
                      </div>
                      <p style={{ color: '#888', fontSize: 13, margin: '4px 0 0' }}>{rec.reason}</p>
                    </div>
                  ))}
                </>
              )}
              <h3 style={{ fontSize: 16, marginTop: 16 }}>Restaurants near you</h3>
              {restaurants.map(r => (
                <div key={r.id} style={styles.card} onClick={() => openRestaurant(r)}>
                  <div style={styles.restImg}>{r.image && <img src={r.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />}</div>
                  <div style={styles.row}>
                    <strong>{r.name}</strong>
                    <span>⭐ {r.rating}</span>
                  </div>
                  <p style={{ color: '#888', fontSize: 13, margin: '4px 0 0' }}>{r.cuisine} • {r.eta}</p>
                </div>
              ))}
            </>
          )}

          {tab === 'restaurant' && selectedRest && (
            <>
              <button style={styles.buttonSecondary} onClick={() => setTab('home')}>← Back</button>
              <h2 style={styles.title}>{selectedRest.name}</h2>
              <p style={{ color: '#888' }}>{selectedRest.cuisine} • ⭐ {selectedRest.rating}</p>
              {menu.map(item => (
                <div key={item.id} style={styles.card}>
                  <div style={styles.row}>
                    <div>
                      <strong>{item.name}</strong>
                      <p style={{ color: '#888', fontSize: 13, margin: '4px 0' }}>{item.description}</p>
                      <span>${item.price.toFixed(2)}</span>
                    </div>
                    <button style={{ ...styles.button, width: 'auto', padding: '8px 16px', margin: 0 }} onClick={() => addToCart(item)}>Add</button>
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === 'cart' && (
            <>
              <h2 style={styles.title}>Your Cart</h2>
              {cart.length === 0 ? <p style={{ color: '#888' }}>Your cart is empty.</p> : (
                <>
                  {cart.map(c => (
                    <div key={c.id} style={styles.card}>
                      <div style={styles.row}>
                        <div>
                          <strong>{c.name}</strong>
                          <p style={{ color: '#888', fontSize: 13, margin: '4px 0 0' }}>{c.qty} × ${c.price.toFixed(2)}</p>
                        </div>
                        <span onClick={() => removeFromCart(c.id)} style={{ color: '#e23744', cursor: 'pointer' }}>Remove</span>
                      </div>
                    </div>
                  ))}
                  <div style={styles.card}>
                    <div style={styles.row}><strong>Total</strong><strong>${cartTotal.toFixed(2)}</strong></div>
                  </div>
                  <button style={styles.button} onClick={placeOrder}>Place Order</button>
                </>
              )}
            </>
          )}

          {tab === 'orders' && (
            <>
              <h2 style={styles.title}>My Orders</h2>
              {orders.length === 0 ? <p style={{ color: '#888' }}>No orders yet.</p> : orders.map(o => (
                <div key={o.id} style={styles.card}>
                  <div style={styles.row}>
                    <strong>{o.restaurant}</strong>
                    <span style={{ ...styles.pill, background: '#fff3cd', color: '#856404' }}>{o.status}</span>
                  </div>
                  <p style={{ color: '#888', fontSize: 13, margin: '6px 0 0' }}>Order #{o.id} • ${o.total?.toFixed(2)} • ETA {o.eta}</p>
                </div>
              ))}
            </>
          )}
        </div>
        <div style={styles.tabBar}>
          {[['home', '🏠 Home'], ['cart', '🛒 Cart'], ['orders', '📦 Orders']].map(([t, label]) => (
            <div key={t} style={{ ...styles.tab, color: tab === t ? '#e23744' : '#999' }} onClick={() => setTab(t)}>{label}</div>
          ))}
        </div>
      </div>
    );
  }

  // DRIVER APP
  if (user.role === 'driver') {
    return (
      <div style={styles.app}>
        <div style={styles.header}>
          <div style={styles.logo}>ZATER Driver</div>
          <span onClick={logout} style={{ cursor: 'pointer', fontSize: 13 }}>Logout</span>
        </div>
        <div style={styles.content}>
          <h2 style={styles.title}>Deliveries</h2>
          {driverOrders.map(o => (
            <div key={o.id} style={styles.card}>
              <div style={styles.row}>
                <strong>Order #{o.id}</strong>
                <span style={{ ...styles.pill, background: o.status === 'Available' ? '#d1ecf1' : '#d4edda', color: '#155724' }}>{o.status}</span>
              </div>
              <p style={{ fontSize: 14, margin: '8px 0 2px' }}>📍 Pickup: {o.pickup}</p>
              <p style={{ fontSize: 14, margin: '2px 0' }}>🏠 Dropoff: {o.dropoff}</p>
              <p style={{ color: '#28a745', fontWeight: 600, margin: '4px 0' }}>Payout: ${o.payout.toFixed(2)}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {o.status === 'Available' && <button style={{ ...styles.button, margin: 0 }} onClick={() => updateDriverStatus(o.id, 'Accepted')}>Accept</button>}
                {o.status === 'Accepted' && <button style={{ ...styles.button, margin: 0 }} onClick={() => updateDriverStatus(o.id, 'Picked Up')}>Mark Picked Up</button>}
                {o.status === 'Picked Up' && <button style={{ ...styles.button, margin: 0 }} onClick={() => updateDriverStatus(o.id, 'Delivered')}>Mark Delivered</button>}
                <button style={{ ...styles.buttonSecondary, margin: 0 }} onClick={() => getRoute(o.id)}>AI Route</button>
              </div>
            </div>
          ))}

          {route && (
            <div style={{ ...styles.card, border: '2px solid #e23744' }}>
              <div style={styles.row}>
                <strong>🤖 Optimized Route (Order #{route.orderId})</strong>
                <span style={{ ...styles.pill, background: '#e23744', color: '#fff' }}>{route.eta}</span>
              </div>
              <p style={{ color: '#888', fontSize: 13 }}>Distance: {route.distance}</p>
              <ol style={{ paddingLeft: 18, margin: '8px 0' }}>
                {route.steps.map((s, i) => <li key={i} style={{ fontSize: 14, marginBottom: 4 }}>{s}</li>)}
              </ol>
              <button style={styles.buttonSecondary} onClick={() => setRoute(null)}>Close</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // MERCHANT DASHBOARD
  if (user.role === 'merchant') {
    return (
      <div style={styles.app}>
        <div style={styles.header}>
          <div style={styles.logo}>ZATER Merchant</div>
          <span onClick={logout} style={{ cursor: 'pointer', fontSize: 13 }}>Logout</span>
        </div>
        <div style={styles.content}>
          {tab === 'home' && (
            <>
              <h2 style={styles.title}>Incoming Orders</h2>
              {merchantOrders.map(o => (
                <div key={o.id} style={styles.card}>
                  <div style={styles.row}>
                    <strong>Order #{o.id}</strong>
                    <span style={{ ...styles.pill, background: o.status === 'New' ? '#f8d7da' : '#fff3cd', color: '#721c24' }}>{o.status}</span>
                  </div>
                  <p style={{ color: '#888', fontSize: 13, margin: '6px 0' }}>{o.customer} • {o.items} items • ${o.total.toFixed(2)}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {o.status === 'New' && <button style={{ ...styles.button, margin: 0 }} onClick={() => updateOrderStatus(o.id, 'Preparing')}>Accept</button>}
                    {o.status === 'Preparing' && <button style={{ ...styles.button, margin: 0 }} onClick={() => updateOrderStatus(o.id, 'Ready')}>Mark Ready</button>}
                    {o.status === 'Ready' && <span style={{ color: '#28a745', fontWeight: 600 }}>Awaiting pickup</span>}
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === 'menu' && (
            <>
              <h2 style={styles.title}>Manage Menu</h2>
              <div style={styles.card}>
                <input style={styles.input} placeholder="Item name" value={newItem.name}
                  onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                <input style={styles.input} placeholder="Price" type="number" value={newItem.price}
                  onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
                <input style={styles.input} placeholder="Description" value={newItem.description}
                  onChange={e => setNewItem({ ...newItem, description: e.target.value })} />
                <button style={styles.button} onClick={addMenuItem}>Add Item</button>
              </div>
              {merchantMenu.map(item => (
                <div key={item.id} style={styles.card}>
                  <div style={styles.row}>
                    <div>
                      <strong>{item.name}</strong>
                      <p style={{ color: '#888', fontSize: 13, margin: '4px 0 0' }}>${item.price.toFixed(2)}</p>
                    </div>
                    <span style={{ ...styles.pill, background: item.available ? '#d4edda' : '#f8d7da', color: item.available ? '#155724' : '#721c24' }}>
                      {item.available ? 'Available' : 'Sold Out'}
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
        <div style={styles.tabBar}>
          {[['home', '📋 Orders'], ['menu', '🍽️ Menu']].map(([t, label]) => (
            <div key={t} style={{ ...styles.tab, color: tab === t ? '#e23744' : '#999' }} onClick={() => setTab(t)}>{label}</div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}