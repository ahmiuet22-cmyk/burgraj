// Burger Garage - State Store (Cart, Favorites, Orders, Session)

class AppStore {
  constructor() {
    this.cartKey = 'bg_cart';
    this.favKey = 'bg_favs';
    this.cityKey = 'bg_selected_city';
    this.areaKey = 'bg_selected_area';
    this.branchKey = 'bg_selected_branch';
    this.outletKey = 'bg_selected_outlet';
    this.ordersKey = 'bg_orders';
    this.userKey = 'bg_current_user';
    this.usersListKey = 'bg_registered_users';
    this.locConfirmedKey = 'bg_location_confirmed';

    this.cart = this.load(this.cartKey, []);
    this.favorites = this.load(this.favKey, []);
    this.selectedCity = this.load(this.cityKey, 'Gujranwala');
    this.selectedArea = this.load(this.areaKey, 'Rahwali');
    this.selectedBranch = this.load(this.branchKey, 'Rahwali Cantt');
    this.selectedOutlet = this.load(this.outletKey, 'Rahwali');
    this.orders = this.load(this.ordersKey, []);
    this.user = this.load(this.userKey, null);
    this.users = this.load(this.usersListKey, [
      { name: 'Ali Khan', email: 'user@burgergarage.com', phone: '0300-1234567', password: 'password123' }
    ]);
    this.isLocationConfirmed = this.load(this.locConfirmedKey, false);

    this.listeners = [];
    this.audioAlert = new Audio('assets/ring.mp3');
  }

  load(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  save(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(event, payload) {
    this.listeners.forEach(fn => fn(event, payload));
  }

  playChime() {
    try {
      this.audioAlert.currentTime = 0;
      this.audioAlert.play().catch(() => {});
    } catch (e) {}
  }

  // --- CART MANAGEMENT ---
  addToCart(product, quantity = 1, size = 'M', customPrice = null) {
    const finalPrice = customPrice !== null ? customPrice : (product.sizes && product.sizes[size] ? product.sizes[size] : product.price);
    const itemKey = `${product.id}_${size}`;
    
    const existingIndex = this.cart.findIndex(item => item.key === itemKey);

    if (existingIndex > -1) {
      this.cart[existingIndex].quantity += quantity;
    } else {
      this.cart.push({
        key: itemKey,
        productId: product.id,
        name: product.name,
        category: product.category,
        image: product.image,
        size: size,
        price: finalPrice,
        quantity: quantity
      });
    }

    this.save(this.cartKey, this.cart);
    this.playChime();
    this.notify('cart_updated', this.cart);
  }

  updateQuantity(itemKey, delta) {
    const itemIndex = this.cart.findIndex(i => i.key === itemKey);
    if (itemIndex === -1) return;

    this.cart[itemIndex].quantity += delta;
    if (this.cart[itemIndex].quantity <= 0) {
      this.cart.splice(itemIndex, 1);
    }

    this.save(this.cartKey, this.cart);
    this.notify('cart_updated', this.cart);
  }

  removeFromCart(itemKey) {
    this.cart = this.cart.filter(i => i.key !== itemKey);
    this.save(this.cartKey, this.cart);
    this.notify('cart_updated', this.cart);
  }

  clearCart() {
    this.cart = [];
    this.save(this.cartKey, this.cart);
    this.notify('cart_updated', this.cart);
  }

  get cartCount() {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  get subtotal() {
    return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  get deliveryFee() {
    if (this.cart.length === 0) return 0;
    return this.selectedCity === 'Gujranwala' ? 120 : 180;
  }

  get total() {
    return this.subtotal + this.deliveryFee;
  }

  // --- FAVORITES / WISHLIST ---
  isFavorite(productId) {
    return this.favorites.includes(productId);
  }

  toggleFavorite(productId) {
    if (this.isFavorite(productId)) {
      this.favorites = this.favorites.filter(id => id !== productId);
    } else {
      this.favorites.push(productId);
    }
    this.save(this.favKey, this.favorites);
    this.notify('favorites_updated', this.favorites);
  }

  // --- LOCATION / CITY & OUTLET ---
  canonicalOutlet(input) {
    if (!input) return 'Rahwali';
    const s = String(input).toLowerCase().trim();
    if (s.includes('rahwali')) return 'Rahwali';
    if (s.includes('daska') || s.includes('college road')) return 'Daska City';
    if (s.includes('wazirabad') || s.includes('katchery') || s.includes('cantt') && !s.includes('rahwali')) return 'Wazirabad City';
    if (s.includes('sialkot')) return 'Sialkot Road';
    if (s.includes('model') || s.includes('gujranwala')) return 'Gujranwala City';
    return 'Rahwali';
  }

  setCityArea(city, area, branchName = '') {
    this.selectedCity = city;
    this.selectedArea = area;
    this.selectedBranch = branchName || `${city} (${area})`;
    this.selectedOutlet = this.canonicalOutlet(this.selectedBranch || area || city);
    this.isLocationConfirmed = true;
    this.save(this.cityKey, city);
    this.save(this.areaKey, area);
    this.save(this.branchKey, this.selectedBranch);
    this.save(this.outletKey, this.selectedOutlet);
    this.save(this.locConfirmedKey, true);
    this.notify('city_updated', { city, area, branch: this.selectedBranch, outlet: this.selectedOutlet });
  }

  // --- USER AUTHENTICATION ---
  signup(name, email, phone, password) {
    if (!name || !email || !password) {
      throw new Error('Please enter all required fields.');
    }
    const existing = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('An account with this email already exists!');
    }
    const newUser = {
      id: 'usr_' + Date.now(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: (phone || '').trim(),
      password: password,
      createdAt: new Date().toISOString()
    };
    this.users.push(newUser);
    this.save(this.usersListKey, this.users);
    this.user = newUser;
    this.save(this.userKey, newUser);
    this.notify('user_updated', newUser);

    // Sync to Firebase Auth & Firestore 'users' collection (matches Mobile App)
    if (typeof firebaseService !== 'undefined' && firebaseService.isReady) {
      firebaseService.signup(name, email, phone, password).catch(e => {
        console.warn('Firebase signup notice:', e.message);
      });
    }

    return newUser;
  }

  login(email, password) {
    if (!email || !password) {
      throw new Error('Please enter your email and password.');
    }
    const found = this.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password);
    if (!found) {
      throw new Error('Invalid email or password. Please check your credentials.');
    }
    this.user = found;
    this.save(this.userKey, found);
    this.notify('user_updated', found);

    // Sync login with Firebase Auth
    if (typeof firebaseService !== 'undefined' && firebaseService.isReady) {
      firebaseService.login(email, password).catch(e => {
        console.warn('Firebase login notice:', e.message);
      });
    }

    return found;
  }

  async loginWithGoogle() {
    if (typeof firebaseService === 'undefined' || !firebaseService.isReady) {
      if (typeof firebaseService !== 'undefined') firebaseService.init();
      if (typeof firebaseService === 'undefined' || !firebaseService.isReady) {
        throw new Error('Firebase Service is not available. Check your internet connection.');
      }
    }

    const userData = await firebaseService.signInWithGoogle();
    if (!userData) {
      throw new Error('Google Sign-In failed to return user data.');
    }

    const appUser = {
      id: userData.uid,
      uid: userData.uid,
      name: userData.name || userData.displayName || (userData.email ? userData.email.split('@')[0] : 'User'),
      email: userData.email || '',
      phone: userData.phone || '',
      photoURL: userData.photoURL || '',
      authProvider: 'google',
      lastLogin: new Date().toISOString()
    };

    // Save in registered users list
    const existingIndex = this.users.findIndex(u => u.email && u.email.toLowerCase() === appUser.email.toLowerCase());
    if (existingIndex >= 0) {
      this.users[existingIndex] = { ...this.users[existingIndex], ...appUser };
    } else {
      this.users.push(appUser);
    }
    this.save(this.usersListKey, this.users);

    this.user = appUser;
    this.save(this.userKey, appUser);
    this.notify('user_updated', appUser);

    return appUser;
  }

  logout() {
    this.user = null;
    localStorage.removeItem(this.userKey);
    this.notify('user_updated', null);
    if (typeof firebaseService !== 'undefined' && firebaseService.isReady) {
      firebaseService.logout();
    }
  }

  // --- ORDERS & TRACKING ---
  createOrder(orderData) {
    const orderId = 'BG-' + Math.floor(100000 + Math.random() * 900000);
    const assignedOutlet = this.selectedOutlet || this.canonicalOutlet(this.selectedBranch || this.selectedArea || this.selectedCity);

    const newOrder = {
      id: orderId,
      createdAt: new Date().toISOString(),
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      deliveryAddress: orderData.deliveryAddress,
      city: this.selectedCity,
      area: this.selectedArea,
      branchName: this.selectedBranch || 'Rahwali Cantt',
      outlet: assignedOutlet, // Canonical outlet name matching Admin Portal
      paymentMethod: orderData.paymentMethod,
      items: [...this.cart],
      subtotal: this.subtotal,
      deliveryFee: this.deliveryFee,
      total: this.total,
      status: 'pending', // pending -> preparing -> on_the_way -> delivered
      statusHistory: [
        { status: 'Order Placed', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]
    };

    this.orders.unshift(newOrder);
    this.save(this.ordersKey, this.orders);
    this.clearCart();
    this.playChime();
    this.notify('order_created', newOrder);

    // Sync order to Firebase Cloud Firestore (Live with Mobile App Admin!)
    if (typeof firebaseService !== 'undefined' && firebaseService.isReady) {
      firebaseService.placeOrder(newOrder).then(firestoreId => {
        if (firestoreId) {
          newOrder.firestoreId = firestoreId;
          this.save(this.ordersKey, this.orders);
          this.bindOrderLiveListener(newOrder.id, firestoreId);
        }
      });
    }

    return newOrder;
  }

  // Bind realtime Firestore listener so changes made by Admin in Flutter App or Web immediately update
  bindOrderLiveListener(localOrderId, firestoreId) {
    if (typeof firebaseService === 'undefined' || !firebaseService.isReady || !firestoreId) return;
    if (this.orderListeners && this.orderListeners[localOrderId]) return;

    if (!this.orderListeners) this.orderListeners = {};
    const unsub = firebaseService.listenToSingleOrder(firestoreId, (liveDoc) => {
      if (liveDoc && liveDoc.status) {
        this.syncOrderStatusFromAdmin(localOrderId, liveDoc.status, liveDoc.statusNote);
      }
    });

    if (unsub) {
      this.orderListeners[localOrderId] = unsub;
    }
  }

  // Bind listeners to any ongoing active orders when the app opens
  bindActiveOrdersListeners() {
    this.orders.forEach(order => {
      if (order.firestoreId && order.status !== 'delivered' && order.status !== 'cancelled') {
        this.bindOrderLiveListener(order.id, order.firestoreId);
      }
    });
  }

  // Sync status change initiated by Admin (from Firestore or Web Admin Controls)
  syncOrderStatusFromAdmin(orderId, adminStatus, customNote = '') {
    const order = this.orders.find(o => o.id === orderId || o.firestoreId === orderId);
    if (!order) return;
    if (order.status === adminStatus) return; // already in this status

    order.status = adminStatus;

    const statusNotes = {
      'pending': 'Order Placed & Awaiting Kitchen Approval 📋',
      'preparing': 'Kitchen is preparing your fresh meal 👨‍🍳🔥',
      'ready': 'Order is Packed & Rider is on the way 🛵⚡',
      'on_the_way': 'Rider is on the way to your doorstep 🛵💨',
      'delivered': 'Delivered! Enjoy your meal 🍔🎉',
      'cancelled': 'Order has been cancelled by Admin ❌'
    };

    const note = customNote || statusNotes[adminStatus] || `Status updated by Admin: ${adminStatus}`;
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: note,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    this.save(this.ordersKey, this.orders);
    this.playChime();
    this.notify('order_status_updated', order);
  }

  // Method for Admin to change status directly (updates local store + Cloud Firestore)
  async updateOrderStatusByAdmin(orderId, nextStatus, note = '') {
    const order = this.orders.find(o => o.id === orderId || o.firestoreId === orderId);
    if (!order) return;

    this.syncOrderStatusFromAdmin(order.id, nextStatus, note);

    if (order.firestoreId && typeof firebaseService !== 'undefined' && firebaseService.isReady) {
      await firebaseService.updateOrderStatus(order.firestoreId, nextStatus, note);
    }
  }
}

const store = new AppStore();
