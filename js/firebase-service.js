// Burger Garage - Firebase Cloud Firestore & Auth Integration
// Connects Web directly to the Flutter Mobile App's backend

const firebaseConfig = {
  apiKey: "AIzaSyB0Ks-CCn1j3lW0qRy_PW4UNMrDwAF45Is",
  authDomain: "grage-cc3b2.firebaseapp.com",
  projectId: "grage-cc3b2",
  storageBucket: "grage-cc3b2.firebasestorage.app",
  messagingSenderId: "631565433585",
  appId: "1:631565433585:web:19971ed3097f5f6a7f4750",
  measurementId: "G-J6T92FB6R5"
};

class FirebaseService {
  constructor() {
    this.app = null;
    this.auth = null;
    this.db = null;
    this.isReady = false;
    this.activeOrdersUnsub = null;

    this.init();
  }

  init() {
    try {
      if (typeof firebase !== 'undefined') {
        // Prevent duplicate initializeApp
        if (!firebase.apps || !firebase.apps.length) {
          this.app = firebase.initializeApp(firebaseConfig);
        } else {
          this.app = firebase.app();
        }
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.isReady = true;
        console.log("🔥 [Firebase] Connected to project: grage-cc3b2 (App & Web Synced)");
      } else {
        console.warn("⚠️ [Firebase] SDK not found yet. Using local fallback.");
      }
    } catch (err) {
      console.warn("⚠️ [Firebase] Setup notice:", err.message);
    }
  }

  // --- 1. USER AUTHENTICATION & REGISTRATION ---
  async signup(name, email, phone, password) {
    if (!this.isReady) {
      console.log("Saving user to local storage (Firebase offline)");
      return null;
    }

    try {
      // Create user in Firebase Authentication
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Update display name
      await user.updateProfile({ displayName: name });

      // Save user profile in Firestore 'users' collection (matches Flutter app)
      const userDoc = {
        uid: user.uid,
        name: name,
        email: email,
        phone: phone,
        role: 'customer',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await this.db.collection('users').doc(user.uid).set(userDoc);
      return userDoc;
    } catch (err) {
      console.warn("Firebase signup notice:", err.message);
      throw err;
    }
  }

  async login(email, password) {
    if (!this.isReady) return null;

    try {
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Fetch user profile from Firestore 'users' collection
      const doc = await this.db.collection('users').doc(user.uid).get();
      if (doc.exists) {
        return doc.data();
      }

      return {
        uid: user.uid,
        name: user.displayName || email.split('@')[0],
        email: user.email,
        phone: ''
      };
    } catch (err) {
      console.warn("Firebase login notice:", err.message);
      throw err;
    }
  }

  async signInWithGoogle() {
    if (!this.isReady) {
      this.init();
      if (!this.isReady) {
        throw new Error("Firebase is not connected. Please check your internet connection.");
      }
    }

    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await this.auth.signInWithPopup(provider);
      const user = result.user;

      if (!user) {
        throw new Error("Could not retrieve Google account details.");
      }

      // Check if user profile already exists in Firestore 'users'
      const userDocRef = this.db.collection('users').doc(user.uid);
      const doc = await userDocRef.get();

      let userData;
      if (doc.exists) {
        userData = doc.data();
        // Update photoURL if changed or missing
        if (user.photoURL && userData.photoURL !== user.photoURL) {
          userData.photoURL = user.photoURL;
          userDocRef.update({ photoURL: user.photoURL }).catch(() => {});
        }
      } else {
        // First time Google Sign Up
        userData = {
          uid: user.uid,
          name: user.displayName || user.email.split('@')[0],
          email: user.email,
          phone: user.phoneNumber || '',
          photoURL: user.photoURL || '',
          role: 'customer',
          authProvider: 'google',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await userDocRef.set(userData);
      }

      return userData;
    } catch (err) {
      console.error("Firebase Google Auth Error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        throw new Error("Google Sign-In cancelled (window was closed).");
      } else if (err.code === 'auth/popup-blocked') {
        throw new Error("Popup was blocked by your browser. Please allow popups for this site.");
      } else if (err.code === 'auth/cancelled-popup-request') {
        throw new Error("Only one popup request is allowed at a time.");
      } else if (err.code === 'auth/network-request-failed') {
        throw new Error("Network error. Please check your connection.");
      } else if (err.code === 'auth/unauthorized-domain') {
        throw new Error("Domain not authorized in Firebase Console. Please add this domain to Firebase Auth > Settings > Authorized Domains.");
      }
      throw new Error(err.message || "Failed to sign in with Google.");
    }
  }

  listenToAuthState(callback) {
    if (this.isReady && this.auth) {
      return this.auth.onAuthStateChanged(callback);
    }
    return () => {};
  }

  async logout() {
    if (this.isReady && this.auth.currentUser) {
      await this.auth.signOut();
    }
  }

  // --- 2. ORDER PLACEMENT (SYNCED TO MOBILE APP ADMIN) ---
  async placeOrder(orderData) {
    if (!this.isReady) {
      console.log("Saved order locally (Firebase offline)");
      return null;
    }

    try {
      // Matches the exact schema of Flutter app's payment_screen.dart
      const firestoreOrder = {
        // Customer info
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        customerId: this.auth.currentUser ? this.auth.currentUser.uid : '',

        // Delivery details
        deliveryAddress: orderData.deliveryAddress,
        outlet: orderData.outlet || orderData.branchName || orderData.area || orderData.city || 'Rahwali',
        branchName: orderData.branchName || orderData.outlet || 'Rahwali Cantt',
        city: orderData.city || 'Gujranwala',
        area: orderData.area || 'Rahwali',

        // Items array (matches Mobile App's Admin Dashboard _OrderTile)
        items: orderData.items.map(item => ({
          name: item.name + (item.size ? ` (${item.size})` : ''),
          price: item.price,
          quantity: item.quantity
        })),

        // Pricing
        subtotal: orderData.subtotal,
        deliveryFee: orderData.deliveryFee,
        tax: 0,
        totalAmount: orderData.total,

        // Status & Metadata
        paymentMethod: orderData.paymentMethod || 'cod',
        status: 'pending', // pending | preparing | ready | on_the_way | delivered | cancelled
        source: 'website',
        orderNumber: orderData.id,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await this.db.collection('orders').add(firestoreOrder);
      console.log("🔥 [Firestore] Order synced to Mobile App! Order Doc ID:", docRef.id);
      return docRef.id;
    } catch (err) {
      console.warn("Firestore placeOrder notice:", err.message);
      return null;
    }
  }

  // --- 3. REALTIME ORDER TRACKING FROM MOBILE APP / FIRESTORE ---
  listenToLiveOrders(customerPhone, callback) {
    if (!this.isReady || !customerPhone) return null;

    if (this.activeOrdersUnsub) {
      this.activeOrdersUnsub();
    }

    try {
      this.activeOrdersUnsub = this.db.collection('orders')
        .where('customerPhone', '==', customerPhone)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .onSnapshot((snapshot) => {
          const orders = [];
          snapshot.forEach(doc => {
            orders.push({ firestoreId: doc.id, ...doc.data() });
          });
          callback(orders);
        }, (err) => {
          console.warn("Firestore realtime orders notice:", err.message);
        });

      return this.activeOrdersUnsub;
    } catch (e) {
      return null;
    }
  }

  // Realtime snapshot listener for a specific order document
  listenToSingleOrder(firestoreDocId, callback) {
    if (!this.isReady || !firestoreDocId) return null;
    try {
      return this.db.collection('orders').doc(firestoreDocId).onSnapshot((doc) => {
        if (doc.exists) {
          const data = doc.data();
          callback({ firestoreId: doc.id, ...data });
        }
      }, (err) => {
        console.warn("Firestore listenToSingleOrder error:", err.message);
      });
    } catch (e) {
      console.warn("Firestore listenToSingleOrder exception:", e.message);
      return null;
    }
  }

  // --- 4. ADMIN ORDER STATUS UPDATE (SYNCED WITH FLUTTER APP) ---
  async updateOrderStatus(firestoreDocId, newStatus, note = '') {
    if (!this.isReady || !firestoreDocId) {
      console.warn("Firebase not ready to update order status");
      return false;
    }

    try {
      await this.db.collection('orders').doc(firestoreDocId).update({
        status: newStatus,
        statusNote: note,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log(`🔥 [Firestore] Admin updated order #${firestoreDocId.substring(0,6)} status -> ${newStatus}`);
      return true;
    } catch (err) {
      console.warn("Firestore updateOrderStatus failed:", err.message);
      return false;
    }
  }

  // --- 5. REALTIME LIVE PRODUCTS STREAM (ADDED BY ADMIN) ---
  listenToLiveProducts(callback) {
    if (!this.isReady || !this.db) {
      console.warn("Firestore not ready for live products");
      return null;
    }

    try {
      return this.db.collection('products')
        .onSnapshot((snapshot) => {
          const products = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            products.push({
              id: doc.id,
              name: data.name || 'Untitled Item',
              category: data.category || 'Others',
              description: data.description || '',
              price: Number(data.price || 0),
              image: data.imageUrl || 'assets/logoo.jpg',
              rating: Number(data.rating || 4.8),
              sizes: data.sizes && Object.keys(data.sizes).length > 0 ? data.sizes : { 'Standard': Number(data.price || 0) },
              createdAt: data.createdAt
            });
          });

          // Sort by creation time — oldest first (first added = shows first)
          products.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (new Date(a.createdAt || 0)).getTime();
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (new Date(b.createdAt || 0)).getTime();
            return timeA - timeB; // ascending: pehle add = pehle show
          });

          console.log(`🔥 [Firestore] Received ${products.length} live products from admin backend`);
          try {
            localStorage.setItem('bg_cached_live_products', JSON.stringify(products));
          } catch (e) {}
          callback(products);
        }, async (err) => {
          console.warn("Firestore live products notice:", err.message);

          // If permission denied and not logged in, try anonymous auth to satisfy request.auth != null rule
          if ((err.code === 'permission-denied' || (err.message && err.message.toLowerCase().includes('permission'))) && !this._triedAnonAuth) {
            this._triedAnonAuth = true;
            try {
              if (this.auth && !this.auth.currentUser) {
                console.log("🔑 [Firebase] Attempting anonymous sign-in to access products...");
                await this.auth.signInAnonymously();
                return this.listenToLiveProducts(callback);
              }
            } catch (anonErr) {
              console.warn("Anonymous auth notice:", anonErr.message);
            }
          }

          // Fallback: Read from local cache if available so UI doesn't remain stuck
          try {
            const cached = localStorage.getItem('bg_cached_live_products');
            if (cached) {
              const cachedProducts = JSON.parse(cached);
              if (Array.isArray(cachedProducts) && cachedProducts.length > 0) {
                console.log(`📦 Loaded ${cachedProducts.length} products from local cache.`);
                callback(cachedProducts);
              }
            }
          } catch (cacheErr) {}
        });
    } catch (e) {
      console.warn("Error listening to live products:", e);
      return null;
    }
  }
}

const firebaseService = new FirebaseService();
