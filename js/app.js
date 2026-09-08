// Burger Garage - Core Application Controller

document.addEventListener('DOMContentLoaded', () => {
  // App State
  let activeCategory = 'Burger';
  let activeSearchQuery = '';
  let selectedProduct = null;
  let selectedSize = 'M';
  let selectedQuantity = 1;
  let currentDealIndex = 0;
  let dealInterval = null;

  // Live products from Firebase (populated by admin)
  let liveProducts = [];
  let liveCategories = [];

  // Initialize Modules
  const aiBot = new AiAssistant('ai-chat-messages');

  // --- 0. LIVE PRODUCTS FROM FIREBASE ---
  function initLiveProducts() {
    // Show loading state in products grid
    const gridEl = document.getElementById('product-grid');
    if (gridEl) {
      gridEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
          <div style="font-size: 48px; margin-bottom: 14px; animation: spin 1.2s linear infinite; display:inline-block;">⚙️</div>
          <h3 style="font-family: var(--font-heading); font-size: 18px; color: var(--gray-body);">Loading menu...</h3>
          <p style="color: var(--gray-body); margin-top:6px; font-size:14px;">Fetching fresh items from kitchen 🍔</p>
        </div>
      `;
    }

    if (typeof firebaseService !== 'undefined' && firebaseService.isReady) {
      firebaseService.listenToLiveProducts((products) => {
        liveProducts = products;
        if (typeof aiBot !== 'undefined' && aiBot.updateProducts) {
          aiBot.updateProducts(products);
        }
        // Extract unique categories from live products
        const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
        liveCategories = cats.length > 0 ? cats : ['Burger', 'Pizza', 'Drinks', 'Fries', 'Others'];

        // Switch to first available category if current is not in list
        if (!liveCategories.includes(activeCategory)) {
          activeCategory = liveCategories[0] || 'Burger';
        }

        renderCategories();
        renderProducts();
      });
    } else {
      // Firebase not ready: retry once after short delay
      setTimeout(() => {
        if (typeof firebaseService !== 'undefined' && firebaseService.isReady) {
          initLiveProducts();
        } else {
          // Show empty state
          liveProducts = [];
          liveCategories = ['Burger', 'Pizza', 'Drinks', 'Fries', 'Others'];
          renderCategories();
          renderProducts();
        }
      }, 2000);
    }
  }

  // --- 1. RENDER HERO DEALS SLIDER ---
  function renderDeals() {
    const sliderEl = document.getElementById('deals-slider');
    const dotsEl = document.getElementById('slider-dots');
    if (!sliderEl) return;

    sliderEl.innerHTML = MENU_DATA.deals.map((deal, idx) => `
      <div class="deal-slide" data-index="${idx}">
        <div class="deal-info">
          <span class="deal-badge">${deal.tag}</span>
          <h2 class="deal-title">${deal.title}</h2>
          <p class="deal-desc">${deal.description}</p>
          <div class="deal-pricing">
            <span class="deal-price">Rs ${deal.price}</span>
            <span class="deal-original-price">Rs ${deal.originalPrice}</span>
          </div>
          <div class="deal-actions">
            <button class="btn-hero" onclick="orderDeal('${deal.id}')">Order Deal Now 🔥</button>
          </div>
        </div>
        <div class="deal-visual">
          <img src="${deal.image}" alt="${deal.title}" onerror="this.src='assets/2.png'">
        </div>
      </div>
    `).join('');

    dotsEl.innerHTML = MENU_DATA.deals.map((_, idx) => `
      <span class="dot ${idx === 0 ? 'active' : ''}" onclick="goToDeal(${idx})"></span>
    `).join('');

    startDealsAutoPlay();
  }

  function startDealsAutoPlay() {
    if (dealInterval) clearInterval(dealInterval);
    dealInterval = setInterval(() => {
      currentDealIndex = (currentDealIndex + 1) % MENU_DATA.deals.length;
      updateDealsSlider();
    }, 5000);
  }

  window.goToDeal = function (index) {
    currentDealIndex = index;
    updateDealsSlider();
    startDealsAutoPlay();
  };

  function updateDealsSlider() {
    const sliderEl = document.getElementById('deals-slider');
    if (sliderEl) {
      sliderEl.style.transform = `translateX(-${currentDealIndex * 100}%)`;
    }
    document.querySelectorAll('.slider-dots .dot').forEach((d, idx) => {
      d.classList.toggle('active', idx === currentDealIndex);
    });
  }

  window.orderDeal = function (dealId) {
    const deal = MENU_DATA.deals.find(d => d.id === dealId);
    if (!deal) return;

    // Add deal as custom cart item
    store.addToCart({
      id: 9990 + Math.floor(Math.random() * 9),
      name: deal.title,
      category: 'Deals',
      price: deal.price,
      image: deal.image
    }, 1, 'Combo', deal.price);

    openCart();
  };

  // --- 2. CATEGORY SWITCHER ---
  function renderCategories() {
    const tabsEl = document.getElementById('category-tabs');
    if (!tabsEl) return;

    const icons = {
      'Burger': '🍔',
      'Pizza': '🍕',
      'Drinks': '🥤',
      'Fries': '🍟',
      'Others': '🍗'
    };

    // Use live categories from Firebase products
    const cats = liveCategories.length > 0 ? liveCategories : (MENU_DATA.categories || ['Burger', 'Pizza', 'Drinks', 'Fries', 'Others']);

    tabsEl.innerHTML = cats.map(cat => `
      <button class="category-tab ${cat === activeCategory ? 'active' : ''}" onclick="selectCategory('${cat}')">
        <span class="tab-icon">${icons[cat] || '🍽️'}</span>
        <span>${cat}</span>
      </button>
    `).join('');
  }

  window.selectCategory = function (cat) {
    activeCategory = cat;
    renderCategories();
    renderProducts();
  };

  // --- 3. RENDER PRODUCTS GRID ---
  function renderProducts() {
    const gridEl = document.getElementById('product-grid');
    const statsEl = document.getElementById('catalog-stats');
    if (!gridEl) return;

    // Use live Firebase products
    let items = liveProducts;

    if (liveProducts.length === 0 && activeSearchQuery.trim() === '') {
      gridEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
          <div style="font-size: 50px; margin-bottom: 12px;">🍽️</div>
          <h3 style="font-family: var(--font-heading); font-size: 20px;">Menu Coming Soon!</h3>
          <p style="color: var(--gray-body); margin-top: 6px;">Our chef is preparing the menu. Check back soon!</p>
        </div>
      `;
      if (statsEl) statsEl.innerHTML = '';
      return;
    }

    if (activeSearchQuery.trim()) {
      const q = activeSearchQuery.toLowerCase().trim();
      items = items.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
      if (statsEl) {
        statsEl.innerHTML = `<span class="catalog-stats-pill">🔍 Found <strong>${items.length}</strong> items for "${activeSearchQuery}"</span>`;
      }
    } else {
      items = items.filter(p => p.category === activeCategory);
      if (statsEl) {
        statsEl.innerHTML = `<span class="catalog-stats-pill">⚡ <strong>${items.length}</strong> ${activeCategory} items available</span>`;
      }
    }

    if (items.length === 0) {
      gridEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
          <div style="font-size: 50px; margin-bottom: 12px;">🔍</div>
          <h3 style="font-family: var(--font-heading); font-size: 20px;">No delicious items found!</h3>
          <p style="color: var(--gray-body); margin-top: 6px;">Try searching for "Zinger", "Pizza", or "Fries".</p>
        </div>
      `;
      return;
    }

    gridEl.innerHTML = items.map(product => {
      const isFav = store.isFavorite(product.id);
      const displayPrice = product.price || (product.sizes ? Object.values(product.sizes)[0] : 0);
      const rating = product.rating ? product.rating.toFixed(1) : '4.8';
      return `
        <div class="food-card" onclick="openProductDetail('${product.id}')">
          <div class="card-top">
            <span class="rating-badge">⭐ ${rating}</span>
            <button class="fav-btn ${isFav ? 'is-fav' : ''}" onclick="event.stopPropagation(); toggleWishlist('${product.id}', this)">
              ${isFav ? '❤️' : '🤍'}
            </button>
          </div>
          <div class="card-image-wrap">
            <img class="card-image" src="${product.image || 'assets/logoo.jpg'}" alt="${product.name}" onerror="this.src='assets/logoo.jpg'">
          </div>
          <div class="card-body">
            <div class="card-category">${product.category}</div>
            <h3 class="card-title">${product.name}</h3>
            <p class="card-desc">${product.description || ''}</p>
          </div>
          <div class="card-footer">
            <div class="card-price-wrap">
              <span class="price-label">Starting at</span>
              <span class="card-price">Rs ${displayPrice}</span>
            </div>
            <button class="add-cart-btn" onclick="event.stopPropagation(); quickAddToCart('${product.id}')">
              +
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach 3D interactive tilt on cards
    attachCard3DTilt();
  }

  // 3D Tilt Hover on Cards
  function attachCard3DTilt() {
    const cards = document.querySelectorAll('.food-card');
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const rotateX = -(y / (rect.height / 2)) * 8;
        const rotateY = (x / (rect.width / 2)) * 8;
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)`;
      });
    });
  }

  window.toggleWishlist = function (productId, btn) {
    store.toggleFavorite(productId);
    const isFav = store.isFavorite(productId);
    btn.classList.toggle('is-fav', isFav);
    btn.textContent = isFav ? '❤️' : '🤍';
    updateHeaderWishlistBadge();
  };

  window.quickAddToCart = function (productId) {
    // productId is now a Firestore string ID
    const product = liveProducts.find(p => p.id === productId || p.id === String(productId));
    if (!product) return;

    // Default to first available size
    const sizeKeys = product.sizes ? Object.keys(product.sizes) : [];
    let defaultSize = sizeKeys.includes('M') ? 'M' : (sizeKeys[0] || 'Standard');
    const sizePrice = product.sizes ? (product.sizes[defaultSize] || product.price) : product.price;

    store.addToCart(product, 1, defaultSize, sizePrice);
    openCart();
  };

  // --- 4. PRODUCT DETAIL MODAL & 3D TILT ---
  window.openProductDetail = function (productId) {
    // productId is now a Firestore string ID
    selectedProduct = liveProducts.find(p => p.id === productId || p.id === String(productId));
    if (!selectedProduct) return;

    selectedQuantity = 1;
    const availableSizes = Object.keys(selectedProduct.sizes || {});
    selectedSize = availableSizes.includes('M') ? 'M' : (availableSizes[0] || 'Standard');

    updateDetailModalContent();
    document.getElementById('detail-modal-overlay').classList.add('active');
  };

  function updateDetailModalContent() {
    if (!selectedProduct) return;

    document.getElementById('modal-prod-img').src = selectedProduct.image;
    document.getElementById('modal-prod-img').onerror = () => {
      document.getElementById('modal-prod-img').src = 'assets/logoo.jpg';
    };
    document.getElementById('modal-prod-category').textContent = selectedProduct.category;
    document.getElementById('modal-prod-title').textContent = selectedProduct.name;
    document.getElementById('modal-prod-desc').textContent = selectedProduct.description;

    // Render Size Chips
    const sizesWrap = document.getElementById('modal-size-chips');
    const sizeKeys = Object.keys(selectedProduct.sizes || {});

    if (sizeKeys.length > 0) {
      document.getElementById('modal-size-section').style.display = 'block';
      sizesWrap.innerHTML = sizeKeys.map(sizeKey => {
        const price = selectedProduct.sizes[sizeKey];
        const isSelected = sizeKey === selectedSize;
        let label = sizeKey;
        if (sizeKey === 'S') label = 'Small';
        if (sizeKey === 'M') label = 'Medium';
        if (sizeKey === 'L') label = 'Large';
        return `
          <div class="size-chip ${isSelected ? 'selected' : ''}" onclick="selectDetailSize('${sizeKey}')">
            <span class="chip-name">${label}</span>
            <span class="chip-price">Rs ${price}</span>
          </div>
        `;
      }).join('');
    } else {
      document.getElementById('modal-size-section').style.display = 'none';
    }

    // Update Quantity & Price
    document.getElementById('modal-qty-val').textContent = selectedQuantity;
    const currentUnitPrice = (selectedProduct.sizes && selectedProduct.sizes[selectedSize]) ? selectedProduct.sizes[selectedSize] : selectedProduct.price;
    document.getElementById('modal-total-price').textContent = `Rs ${(currentUnitPrice * selectedQuantity).toFixed(0)}`;
  }

  window.selectDetailSize = function (size) {
    selectedSize = size;
    updateDetailModalContent();
  };

  window.adjustDetailQty = function (delta) {
    selectedQuantity = Math.max(1, selectedQuantity + delta);
    updateDetailModalContent();
  };

  window.addDetailToCart = function () {
    if (!selectedProduct) return;
    store.addToCart(selectedProduct, selectedQuantity, selectedSize);
    closeDetailModal();
    openCart();
  };

  window.buyDetailNow = function () {
    if (!selectedProduct) return;
    store.addToCart(selectedProduct, selectedQuantity, selectedSize);
    closeDetailModal();
    openCheckout();
  };

  window.closeDetailModal = function () {
    document.getElementById('detail-modal-overlay').classList.remove('active');
  };

  // 3D Tilt in Modal Visual Canvas
  const modalCanvas = document.getElementById('modal-3d-canvas');
  if (modalCanvas) {
    modalCanvas.addEventListener('mousemove', (e) => {
      const rect = modalCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const card = modalCanvas.querySelector('.detail-3d-card');
      if (card) {
        card.style.transform = `rotateY(${(x / (rect.width / 2)) * 25}deg) rotateX(${-(y / (rect.height / 2)) * 25}deg)`;
      }
    });

    modalCanvas.addEventListener('mouseleave', () => {
      const card = modalCanvas.querySelector('.detail-3d-card');
      if (card) card.style.transform = `rotateY(0deg) rotateX(0deg)`;
    });
  }

  // --- 5. CART DRAWER & CHECKOUT ---
  window.openCart = function () {
    renderCartDrawer();
    document.getElementById('cart-drawer-overlay').classList.add('active');
    document.getElementById('cart-drawer').classList.add('active');
  };

  window.closeCart = function () {
    document.getElementById('cart-drawer-overlay').classList.remove('active');
    document.getElementById('cart-drawer').classList.remove('active');
  };

  function renderCartDrawer() {
    const bodyEl = document.getElementById('cart-drawer-body');
    const badgeEl = document.getElementById('nav-cart-badge');
    if (badgeEl) badgeEl.textContent = store.cartCount;

    if (!bodyEl) return;

    if (store.cart.length === 0) {
      bodyEl.innerHTML = `
        <div class="cart-empty-view">
          <div class="empty-icon">🛒</div>
          <h4 style="font-family: var(--font-heading); font-size: 18px;">Your cart is hungry!</h4>
          <p style="color: var(--gray-muted); font-size: 13.5px; margin: 8px 0 20px;">Explore our menu and add your favorite burgers and pizzas.</p>
          <button class="btn-hero" onclick="closeCart()" style="background: var(--primary); color: white; padding: 10px 24px;">Browse Menu</button>
        </div>
      `;
      document.getElementById('cart-drawer-footer').style.display = 'none';
      return;
    }

    document.getElementById('cart-drawer-footer').style.display = 'block';

    bodyEl.innerHTML = store.cart.map(item => `
      <div class="cart-item-row">
        <img class="cart-item-img" src="${item.image}" alt="${item.name}" onerror="this.src='assets/logoo.jpg'">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-meta">
            <span class="size-badge">${item.size}</span>
            <span>Rs ${item.price} each</span>
          </div>
          <div class="cart-item-price">Rs ${(item.price * item.quantity).toFixed(0)}</div>
        </div>
        <div class="cart-item-controls">
          <button class="btn-ctrl" onclick="store.updateQuantity('${item.key}', -1)" title="Decrease">-</button>
          <span style="font-size: 14px; font-weight: 700; min-width: 20px; text-align: center;">${item.quantity}</span>
          <button class="btn-ctrl" onclick="store.updateQuantity('${item.key}', 1)" title="Increase">+</button>
          <button class="cart-item-del-btn" title="Remove from cart" onclick="store.removeFromCart('${item.key}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </div>
    `).join('');

    // Bill summary
    document.getElementById('cart-subtotal').textContent = `Rs ${store.subtotal.toFixed(0)}`;
    document.getElementById('cart-delivery-fee').textContent = `Rs ${store.deliveryFee.toFixed(0)}`;
    document.getElementById('cart-total').textContent = `Rs ${store.total.toFixed(0)}`;
  }

  // --- 6. CHECKOUT MODAL ---
  let selectedPaymentMethod = 'cod';

  window.openCheckout = function () {
    if (store.cart.length === 0) {
      alert('Your cart is empty! Please add items to order.');
      return;
    }
    closeCart();

    document.getElementById('chk-city').value = store.selectedCity;
    document.getElementById('chk-area').value = store.selectedArea;
    const branchEl = document.getElementById('chk-branch-display');
    if (branchEl) {
      branchEl.textContent = store.selectedBranch || `${store.selectedCity} (${store.selectedArea})`;
    }
    document.getElementById('chk-grand-total').textContent = `Rs ${store.total.toFixed(0)}`;

    if (store.user) {
      const nameInput = document.getElementById('chk-name');
      const phoneInput = document.getElementById('chk-phone');
      if (nameInput && !nameInput.value) nameInput.value = store.user.name;
      if (phoneInput && !phoneInput.value) phoneInput.value = store.user.phone || '';
    }

    document.getElementById('checkout-modal-overlay').classList.add('active');
  };

  window.closeCheckout = function () {
    document.getElementById('checkout-modal-overlay').classList.remove('active');
  };

  // --- GPS CURRENT LOCATION → ADDRESS AUTOFILL ---
  window.useMyLocation = function () {
    const btn = document.getElementById('btn-use-location');
    const statusEl = document.getElementById('location-status');
    const addressField = document.getElementById('chk-address');

    if (!navigator.geolocation) {
      statusEl.textContent = '❌ Location not supported in this browser.';
      statusEl.style.display = 'block';
      return;
    }

    // Loading state
    btn.disabled = true;
    btn.innerHTML = '⏳ Locating...';
    statusEl.textContent = '📡 Getting your GPS location...';
    statusEl.style.display = 'block';
    statusEl.style.color = '#FF5E3A';

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        statusEl.textContent = `📡 Got location (±${Math.round(accuracy)}m), fetching address...`;

        try {
          // OpenStreetMap Nominatim reverse geocoding (free, no API key needed)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'en', 'User-Agent': 'BurgerGarageApp/1.0' } }
          );
          const data = await response.json();

          if (data && data.address) {
            const a = data.address;
            // Build a clean readable address
            const parts = [
              a.house_number,
              a.road || a.pedestrian || a.footway,
              a.neighbourhood || a.suburb || a.quarter,
              a.village || a.town || a.city_district
            ].filter(Boolean);

            const fullAddress = parts.length > 0
              ? parts.join(', ')
              : (data.display_name ? data.display_name.split(',').slice(0, 3).join(',') : '');

            if (fullAddress && addressField) {
              addressField.value = fullAddress;
              statusEl.textContent = '✅ Location filled! Please verify and add more details if needed.';
              statusEl.style.color = '#22c55e';
            } else {
              // Fallback: use coordinates
              addressField.value = `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`;
              statusEl.textContent = '✅ Coordinates saved. Please add street details.';
              statusEl.style.color = '#22c55e';
            }
          } else {
            addressField.value = `Near ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            statusEl.textContent = '⚠️ Could not resolve address. Coordinates saved.';
            statusEl.style.color = '#f59e0b';
          }
        } catch (err) {
          // Network error: save coordinates as fallback
          if (addressField) {
            addressField.value = `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          }
          statusEl.textContent = '⚠️ Address lookup failed. GPS coordinates saved.';
          statusEl.style.color = '#f59e0b';
        }

        // Reset button
        btn.disabled = false;
        btn.innerHTML = '📍 Use My Location';

        // Auto-hide status after 4 seconds
        setTimeout(() => { if (statusEl) statusEl.style.display = 'none'; }, 4000);
      },
      (err) => {
        btn.disabled = false;
        btn.innerHTML = '📍 Use My Location';

        let msg = '';
        if (err.code === 1) msg = '❌ Location permission denied. Please allow in browser settings.';
        else if (err.code === 2) msg = '❌ Location unavailable. Check GPS/network.';
        else if (err.code === 3) msg = '❌ Location timed out. Please try again.';
        else msg = '❌ Could not get location.';

        statusEl.textContent = msg;
        statusEl.style.color = '#e53e3e';
        statusEl.style.display = 'block';
        setTimeout(() => { if (statusEl) statusEl.style.display = 'none'; }, 5000);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  window.selectPayment = function (method) {
    selectedPaymentMethod = method;
    document.querySelectorAll('.payment-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.method === method);
    });

    const onlineInfo = document.getElementById('online-payment-details');
    if (onlineInfo) {
      onlineInfo.style.display = method === 'online' ? 'block' : 'none';
    }
  };

  window.submitOrder = function (e) {
    if (e) e.preventDefault();

    const name = document.getElementById('chk-name').value.trim();
    const phone = document.getElementById('chk-phone').value.trim();
    const address = document.getElementById('chk-address').value.trim();

    if (!name || !phone || !address) {
      alert('Please fill out your Name, Phone number, and Delivery Address.');
      return;
    }

    const order = store.createOrder({
      customerName: name,
      customerPhone: phone,
      deliveryAddress: address,
      paymentMethod: selectedPaymentMethod === 'cod' ? 'Cash on Delivery' : 'JazzCash / EasyPaisa'
    });

    closeCheckout();
    showOrderConfirmation(order);
  };

  let currentConfirmedOrder = null;

  function formatPakistaniWhatsAppPhone(phone) {
    if (!phone) return '';
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('92')) return clean;
    if (clean.startsWith('03')) return '92' + clean.substring(1);
    if (clean.startsWith('3') && clean.length === 10) return '92' + clean;
    return clean;
  }

  function showOrderConfirmation(order) {
    currentConfirmedOrder = order;
    document.getElementById('conf-order-id').textContent = order.id;
    document.getElementById('conf-total').textContent = `Rs ${order.total}`;
    document.getElementById('conf-address').textContent = `${order.deliveryAddress} (${order.area || ''}, ${order.city || ''})`;
    document.getElementById('confirmation-modal-overlay').classList.add('active');

    // Auto-prompt WhatsApp notification after a moment
    setTimeout(() => {
      const waBtn = document.querySelector('#confirmation-modal-overlay button[onclick*="sendOrderConfirmationWhatsApp"]');
      if (waBtn) {
        waBtn.style.transform = 'scale(1.03)';
        setTimeout(() => { waBtn.style.transform = ''; }, 300);
      }
    }, 600);
  }

  window.sendOrderConfirmationWhatsApp = function (orderId) {
    const order = orderId ? store.orders.find(o => o.id === orderId) : (currentConfirmedOrder || store.orders[0]);
    if (!order) return;

    const itemsSummary = (order.items || []).map(i => `• ${i.quantity || 1}x ${i.name || 'Item'}${i.size ? ` (${i.size})` : ''} - Rs ${(i.price || 0) * (i.quantity || 1)}`).join('\n');
    const branch = order.outlet || order.city || 'Rahwali Main Branch';
    const cleanPhone = formatPakistaniWhatsAppPhone(order.customerPhone);

    const message = 
`🍔 *BURGER GARAGE - ORDER CONFIRMATION* ⚡
Assalam-o-Alaikum *${order.customerName || 'Valued Customer'}*!
Thank you for ordering with Burger Garage. Your food is confirmed and being freshly prepared in our kitchen! 👨‍🍳🔥

📋 *Order Details:*
• *Order #:* #${order.id}
• *Branch:* ${branch}
• *Payment Mode:* ${order.paymentMethod || 'Cash on Delivery'}
• *Delivery Address:* ${order.deliveryAddress}

🍔 *Ordered Items:*
${itemsSummary}

💰 *Subtotal:* Rs ${order.subtotal || order.total}
🛵 *Express Delivery:* FREE
💵 *GRAND TOTAL TO PAY:* *Rs ${order.total}*
⏰ *Estimated Arrival:* 35 - 45 Minutes

_We will notify you as soon as our rider dispatches your meal! Hotline: 0300-BURGER (287437)_`;

    const encoded = encodeURIComponent(message);
    if (cleanPhone && cleanPhone.length >= 11) {
      window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`, '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    }
  };

  window.closeConfirmation = function () {
    document.getElementById('confirmation-modal-overlay').classList.remove('active');
  };

  // --- 7. MY ORDERS & REAL-TIME CUSTOMER RECEIPT INVOICE ---
  window.printCustomerReceipt = function (orderId) {
    const order = store.orders.find(o => o.id === orderId);
    if (!order) return;

    const itemsHtml = order.items.map((i, idx) => `
      <tr>
        <td style="padding: 6px 0; border-bottom: 1px dashed #ddd;">
          <strong>${i.name}</strong> ${i.size ? `(${i.size})` : ''}
        </td>
        <td style="padding: 6px 0; text-align: center; border-bottom: 1px dashed #ddd;">${i.quantity}x</td>
        <td style="padding: 6px 0; text-align: right; border-bottom: 1px dashed #ddd;">Rs ${i.price}</td>
        <td style="padding: 6px 0; text-align: right; border-bottom: 1px dashed #ddd; font-weight: bold;">Rs ${i.price * i.quantity}</td>
      </tr>
    `).join('');

    const printWin = window.open('', '_blank', 'width=450,height=650');
    if (!printWin) {
      window.print();
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Burger Garage Receipt - ${order.id}</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; padding: 20px; color: #111; max-width: 380px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 12px; margin-bottom: 14px; }
          .logo-title { font-size: 20px; font-weight: 900; letter-spacing: 1px; color: #ED1C24; }
          .sub { font-size: 11px; margin-top: 4px; color: #555; }
          .meta { font-size: 11.5px; line-height: 1.6; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { text-align: left; border-bottom: 1px solid #333; padding-bottom: 5px; font-size: 11px; }
          .totals { margin-top: 14px; border-top: 1px dashed #333; padding-top: 8px; font-size: 12.5px; }
          .totals-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .grand { font-size: 15px; font-weight: bold; border-top: 2px solid #333; padding-top: 6px; margin-top: 6px; }
          .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #666; border-top: 1px dashed #ddd; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-title">BURGER GARAGE</div>
          <div class="sub">TASTE THE FUEL 🍔⚡</div>
          <div class="sub">Official Customer Order Slip</div>
        </div>
        <div class="meta">
          <div><strong>Order ID:</strong> #${order.id}</div>
          <div><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</div>
          <div><strong>Branch:</strong> ${order.outlet || order.city || 'Rahwali Main Branch'}</div>
          <div><strong>Customer:</strong> ${order.customerName || 'Customer'}</div>
          <div><strong>Phone:</strong> ${order.customerPhone || 'N/A'}</div>
          <div><strong>Address:</strong> ${order.deliveryAddress || 'Pick-up'}</div>
          <div><strong>Status:</strong> ${(order.status || 'Delivered').toUpperCase()}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="totals">
          <div class="totals-row">
            <span>Items Subtotal:</span>
            <span>Rs ${order.items.reduce((s, i) => s + (i.price * i.quantity), 0)}</span>
          </div>
          <div class="totals-row">
            <span>Express Delivery:</span>
            <span>Rs 0 (Free)</span>
          </div>
          <div class="totals-row grand">
            <span>TOTAL (${order.paymentMethod || 'COD'}):</span>
            <span>Rs ${order.total}</span>
          </div>
        </div>
        <div class="footer">
          <div>Thank you for choosing Burger Garage! 🍔</div>
          <div>Gujranwala • Rahwali • Daska • Wazirabad</div>
          <div style="margin-top: 6px;">Hotline: 0300-BURGER</div>
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 400);
  };

  window.downloadCustomerReceipt = function (orderId) {
    const order = store.orders.find(o => o.id === orderId);
    if (!order) return;

    if (window.jspdf && window.jspdf.jsPDF) {
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });

        // Header Bar
        doc.setFillColor(237, 28, 36);
        doc.rect(0, 0, 148, 18, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text("BURGER GARAGE", 10, 12);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text("CUSTOMER INVOICE / RECEIPT", 138, 12, { align: 'right' });

        // Order Information
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Order #${order.id}`, 10, 26);

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`, 10, 31);
        doc.text(`Outlet: ${order.outlet || order.city || 'Rahwali Main'}`, 10, 36);

        // Status Badge
        const status = (order.status || 'delivered').toUpperCase();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        if (status === 'CANCELLED') {
          doc.setTextColor(185, 28, 28);
        } else {
          doc.setTextColor(22, 101, 52);
        }
        doc.text(`STATUS: ${status}`, 138, 26, { align: 'right' });

        // Customer Info Card
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(10, 41, 128, 24, 2, 2, 'FD');

        doc.setTextColor(71, 85, 105);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text("DELIVERED TO:", 14, 47);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(order.customerName || 'Customer', 14, 53);
        doc.text(`Phone: ${order.customerPhone || 'N/A'}`, 14, 58);
        doc.text(`Address: ${order.deliveryAddress || 'Dine-In / Pickup'}`, 14, 63);

        // Item Rows
        const itemRows = order.items.map((it, idx) => [
          idx + 1,
          `${it.name}${it.size ? ` (${it.size})` : ''}`,
          `${it.quantity}x`,
          `Rs ${it.price}`,
          `Rs ${it.price * it.quantity}`
        ]);

        doc.autoTable({
          startY: 70,
          head: [['#', 'Item Description', 'Qty', 'Unit Price', 'Total']],
          body: itemRows,
          theme: 'striped',
          headStyles: {
            fillColor: [26, 26, 26],
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: 'bold'
          },
          bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
          columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 14, halign: 'center' },
            3: { cellWidth: 24, halign: 'right' },
            4: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
          },
          margin: { left: 10, right: 10 }
        });

        const finalY = doc.lastAutoTable.finalY + 8;

        // Grand Total Box
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(78, finalY, 60, 20, 2, 2, 'FD');

        doc.setTextColor(71, 85, 105);
        doc.setFontSize(8.5);
        doc.text("Grand Total:", 82, finalY + 7);

        doc.setTextColor(237, 28, 36);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(`Rs ${order.total}`, 134, finalY + 14, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("Thank you for ordering at Burger Garage! 🍔⚡", 74, 200, { align: 'center' });

        doc.save(`BurgerGarage_Receipt_${order.id}.pdf`);
        return;
      } catch (err) {
        console.warn("jsPDF error, falling back to print slip:", err);
      }
    }
    window.printCustomerReceipt(orderId);
  };

  window.openOrderWhatsAppSupport = function (orderId, total) {
    const msg = encodeURIComponent(`Hi Burger Garage Team! I need support regarding my Order #${orderId} (Rs ${total}).`);
    window.open(`https://wa.me/923000000000?text=${msg}`, '_blank');
  };

  window.openMyOrders = function () {
    const listEl = document.getElementById('my-orders-list');
    if (!listEl) return;

    // Bind active Firestore listeners for realtime live updates from Flutter app / admin backend
    if (store.bindActiveOrdersListeners) {
      store.bindActiveOrdersListeners();
    }

    if (store.orders.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 50px;">📦</div>
          <h4 style="font-family: var(--font-heading); margin-top: 10px; font-size: 20px;">No orders yet</h4>
          <p style="color: var(--gray-muted); font-size: 13.5px; max-width: 320px; margin: 6px auto 16px;">Your recent delicious orders and receipts will appear here with live tracking.</p>
          <button class="btn-checkout" style="max-width: 240px; margin: 0 auto; display: inline-block; padding: 10px 20px; font-size: 14px;" onclick="closeMyOrders(); location.href='#menu';">Browse Menu & Order 🍔</button>
        </div>
      `;
    } else {
      listEl.innerHTML = store.orders.map(order => {
        const rawStatus = (order.status || 'pending').toLowerCase();
        const isCancelled = rawStatus === 'cancelled';
        const isDelivered = rawStatus === 'delivered';
        const isDelivery = rawStatus === 'on_the_way' || rawStatus === 'ready' || rawStatus === 'onway';
        const isPrep = rawStatus === 'preparing' || rawStatus === 'kitchen';
        const isPending = rawStatus === 'pending' || (!isPrep && !isDelivery && !isDelivered && !isCancelled);

        // Status Badge Styling & Labels
        let badgeBg = '#FEF3C7';
        let badgeColor = '#92400E';
        let statusDisplay = 'Placed (Awaiting Kitchen)';
        if (isPrep) {
          badgeBg = '#E0F2FE';
          badgeColor = '#0369A1';
          statusDisplay = 'In Kitchen 👨‍🍳🔥';
        } else if (isDelivery) {
          badgeBg = '#FEF9C3';
          badgeColor = '#A16207';
          statusDisplay = 'On Way 🛵💨';
        } else if (isDelivered) {
          badgeBg = '#DCFCE7';
          badgeColor = '#15803D';
          statusDisplay = 'Delivered 🎉';
        } else if (isCancelled) {
          badgeBg = '#FEE2E2';
          badgeColor = '#B91C1C';
          statusDisplay = 'Cancelled ❌';
        }

        // Stepper Classes & Indicators (Never auto-advances, strictly controlled by Admin)
        const step1Class = isCancelled ? '' : 'completed';
        const step1Circle = isCancelled ? '1' : '✓';

        const step2Class = isCancelled ? '' : (isDelivered || isDelivery ? 'completed' : (isPrep ? 'active' : ''));
        const step2Circle = isCancelled ? '2' : (isDelivered || isDelivery ? '✓' : (isPrep ? '👨‍🍳' : '2'));

        const step3Class = isCancelled ? '' : (isDelivered ? 'completed' : (isDelivery ? 'active' : ''));
        const step3Circle = isCancelled ? '3' : (isDelivered ? '✓' : (isDelivery ? '🛵' : '3'));

        const step4Class = isCancelled ? '' : (isDelivered ? 'completed' : '');
        const step4Circle = isCancelled ? '4' : (isDelivered ? '✓' : '4');

        const subtotal = order.items.reduce((s, i) => s + ((i.price || 0) * (i.quantity || 1)), 0);

        return `
          <div class="order-card" style="background: var(--gray-bg); border-radius: var(--radius-md); padding: 18px; margin-bottom: 18px; border: 1px solid var(--gray-border); box-shadow: 0 2px 10px rgba(0,0,0,0.03);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
              <div>
                <span style="font-family: var(--font-heading); font-weight: 800; color: var(--dark); font-size: 16px;">#${order.id}</span>
                <span style="font-size: 12px; color: var(--gray-muted); margin-left: 8px;">${new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                ${order.firestoreId ? `<span style="font-size: 10px; background: rgba(39, 174, 96, 0.12); color: #27AE60; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">Live Firebase</span>` : ''}
              </div>
              <span class="status-badge" style="background: ${badgeBg}; color: ${badgeColor}; font-weight: 800; font-size: 11.5px; padding: 5px 12px; border-radius: var(--radius-full); letter-spacing: 0.3px;">
                ${statusDisplay}
              </span>
            </div>

            ${isCancelled ? `
              <div style="background: #FEE2E2; color: #991B1B; padding: 10px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 600; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">❌</span> This order was marked as Cancelled by the restaurant.
              </div>
            ` : ''}

            <!-- Stepper (Live Order Progression) -->
            <div class="tracking-stepper">
              <div class="step-node ${step1Class}">
                <div class="step-circle">${step1Circle}</div>
                <span class="step-label">Placed</span>
              </div>
              <div class="step-node ${step2Class}">
                <div class="step-circle">${step2Circle}</div>
                <span class="step-label">Kitchen</span>
              </div>
              <div class="step-node ${step3Class}">
                <div class="step-circle">${step3Circle}</div>
                <span class="step-label">On Way 🛵</span>
              </div>
              <div class="step-node ${step4Class}">
                <div class="step-circle">${step4Circle}</div>
                <span class="step-label">Delivered</span>
              </div>
            </div>

            <!-- Customer Order Receipt & Invoice Summary -->
            <div class="customer-receipt-card">
              <div class="receipt-header-row">
                <div class="receipt-brand-badge">
                  <span>🍔 OFFICIAL ORDER INVOICE</span>
                </div>
                <span class="receipt-time-stamp">${new Date(order.createdAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })} • ${new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <div class="receipt-outlet-info">
                <span>🏪 <strong>Branch:</strong> ${order.outlet || order.city || 'Rahwali Main Branch'}</span>
                ${order.deliveryAddress ? `<span>📍 <strong>Address:</strong> ${order.deliveryAddress}</span>` : ''}
              </div>

              <!-- Itemized Table -->
              <div class="receipt-items-wrap">
                <table class="receipt-items-table">
                  <thead>
                    <tr>
                      <th>Item Description</th>
                      <th style="text-align: center;">Qty</th>
                      <th style="text-align: right;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${order.items.map(item => `
                      <tr>
                        <td>
                          <div class="receipt-item-title">${item.name}</div>
                          ${item.size ? `<span class="receipt-item-size">Size: ${item.size}</span>` : ''}
                        </td>
                        <td style="text-align: center; font-weight: 700;">${item.quantity}×</td>
                        <td style="text-align: right; font-weight: 800; color: var(--dark);">Rs ${(item.price || 0) * (item.quantity || 1)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>

              <!-- Price Breakdown Ledger -->
              <div class="receipt-totals-ledger">
                <div class="receipt-total-row">
                  <span>Items Subtotal:</span>
                  <span>Rs ${subtotal}</span>
                </div>
                <div class="receipt-total-row">
                  <span>Express Delivery Fee:</span>
                  <span style="color: #16A34A; font-weight: 700;">FREE</span>
                </div>
                <div class="receipt-total-row grand-total">
                  <span>Total Amount (${order.paymentMethod || 'Cash on Delivery'}):</span>
                  <span class="receipt-grand-amount">Rs ${order.total}</span>
                </div>
              </div>

              <!-- Action Buttons: Print Slip, Download PDF Receipt, WhatsApp Help -->
              <div class="receipt-actions-row">
                <button type="button" class="btn-receipt-action print" onclick="printCustomerReceipt('${order.id}')">
                  <span>🖨️</span> Print Slip
                </button>
                <button type="button" class="btn-receipt-action download" onclick="downloadCustomerReceipt('${order.id}')">
                  <span>📄</span> Download PDF
                </button>
                <button type="button" class="btn-receipt-action whatsapp" onclick="openOrderWhatsAppSupport('${order.id}', '${order.total}')">
                  <span>💬</span> Need Help?
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    document.getElementById('orders-modal-overlay').classList.add('active');
  };

  window.closeMyOrders = function () {
    document.getElementById('orders-modal-overlay').classList.remove('active');
  };

  // --- 8. OUTLETS SECTION ---
  function renderOutlets() {
    const outletsEl = document.getElementById('outlets-grid');
    if (!outletsEl) return;

    outletsEl.innerHTML = MENU_DATA.outlets.map(outlet => `
      <div class="outlet-card">
        <div>
          <div class="outlet-header">
            <h3 class="outlet-name">${outlet.name}</h3>
            <span class="outlet-city-badge">${outlet.city}</span>
          </div>
          <div class="outlet-meta-row">
            <span>📍</span>
            <span>${outlet.address}</span>
          </div>
          <div class="outlet-meta-row">
            <span>⏰</span>
            <span>${outlet.timing}</span>
          </div>
          <div class="outlet-meta-row">
            <span>📞</span>
            <span>${outlet.phone}</span>
          </div>
        </div>
        <div class="outlet-actions">
          <a href="tel:${outlet.phone}" class="btn-outlet-call">Call Branch</a>
          <a href="https://maps.google.com/?q=${outlet.lat},${outlet.lng}" target="_blank" class="btn-outlet-map">Directions 🗺️</a>
        </div>
      </div>
    `).join('');
  }

  // --- 9. CITY / BRANCH PICKER WITH LIVE GPS AUTO-DETECTION ---
  const OUTLET_LOCATIONS = [
    { id: 'outlet-rahwali', city: 'Gujranwala', area: 'Rahwali', name: 'Rahwali Cantt', address: 'Near Cantt Gate & Main GT Road', lat: 32.2411, lng: 74.1654 },
    { id: 'outlet-model-town', city: 'Gujranwala', area: 'Model Town', name: 'Model Town Food Street', address: 'Food Street, Kings Mall area', lat: 32.1494, lng: 74.1916 },
    { id: 'outlet-sialkot-rd', city: 'Gujranwala', area: 'Sialkot Road', name: 'Sialkot Road Branch', address: 'Near GIFT University bypass', lat: 32.1866, lng: 74.2076 },
    { id: 'outlet-daska', city: 'Daska', area: 'College Road', name: 'Daska City Branch', address: 'College Road, Opp. Civil Hospital', lat: 32.3423, lng: 74.3545 },
    { id: 'outlet-wazirabad', city: 'Wazirabad', area: 'Cantt', name: 'Wazirabad City Branch', address: 'Katchery Road, Railway Station area', lat: 32.4432, lng: 74.1249 }
  ];

  function getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function renderOutletPickerList(userCoordinates = null) {
    const container = document.getElementById('outlet-picker-list');
    if (!container) return;

    let outletsWithDistance = OUTLET_LOCATIONS.map(outlet => {
      let dist = null;
      if (userCoordinates) {
        dist = getDistanceKm(userCoordinates.latitude, userCoordinates.longitude, outlet.lat, outlet.lng);
      }
      return { ...outlet, distance: dist };
    });

    let nearestOutletId = null;
    if (userCoordinates) {
      outletsWithDistance.sort((a, b) => a.distance - b.distance);
      nearestOutletId = outletsWithDistance[0].id;
    }

    container.innerHTML = outletsWithDistance.map(outlet => {
      const isCurrent = store.selectedCity === outlet.city && store.selectedArea === outlet.area;
      const isNearest = nearestOutletId === outlet.id;

      return `
        <div class="outlet-pick-card ${isCurrent ? 'active' : ''}" onclick="selectOutlet('${outlet.city}', '${outlet.area}', '${outlet.name}')">
          <div class="outlet-pick-info">
            <h4>
              <span>📍 ${outlet.city} - ${outlet.name}</span>
              ${isNearest ? '<span class="loc-header-badge" style="margin:0; background:#D1FAE5; color:#065F46;">NEAREST ⚡</span>' : ''}
            </h4>
            <p>${outlet.address}</p>
          </div>
          <div>
            ${outlet.distance !== null
          ? `<span class="outlet-dist-pill ${isNearest ? 'nearest' : ''}">${outlet.distance < 1 ? (outlet.distance * 1000).toFixed(0) + ' m' : outlet.distance.toFixed(1) + ' km'}</span>`
          : `<span class="outlet-dist-pill">${isCurrent ? 'Selected ✓' : 'Select'}</span>`
        }
          </div>
        </div>
      `;
    }).join('');
  }

  window.selectOutlet = function (city, area, branchName) {
    store.setCityArea(city, area, branchName);
    document.getElementById('nav-city-text').textContent = `${city} (${area})`;
    const branchDisplay = document.getElementById('chk-branch-display');
    if (branchDisplay) {
      branchDisplay.textContent = branchName || `${city} (${area})`;
    }
    closeCityModal();
    renderCartDrawer();
  };

  window.openCityModal = function () {
    renderOutletPickerList();
    document.getElementById('city-modal-overlay').classList.add('active');
  };

  window.closeCityModal = function () {
    document.getElementById('city-modal-overlay').classList.remove('active');
  };

  window.detectUserLocation = function () {
    const feedback = document.getElementById('gps-feedback-msg');
    const btn = document.getElementById('btn-gps-detect');
    const btnText = document.getElementById('gps-btn-text');

    if (!navigator.geolocation) {
      if (feedback) {
        feedback.className = 'gps-feedback error';
        feedback.textContent = 'Geolocation is not supported by your browser. Please select an outlet below.';
      }
      return;
    }

    if (btnText) btnText.textContent = 'Acquiring GPS Location...';
    if (feedback) {
      feedback.className = 'gps-feedback';
      feedback.textContent = 'Fetching your coordinates from device sensor...';
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = position.coords;
        let closest = null;
        let minDistance = Infinity;

        OUTLET_LOCATIONS.forEach(outlet => {
          const dist = getDistanceKm(coords.latitude, coords.longitude, outlet.lat, outlet.lng);
          if (dist < minDistance) {
            minDistance = dist;
            closest = { ...outlet, distance: dist };
          }
        });

        if (closest) {
          store.setCityArea(closest.city, closest.area, closest.name);
          document.getElementById('nav-city-text').textContent = `${closest.city} (${closest.area})`;

          if (feedback) {
            feedback.className = 'gps-feedback success';
            feedback.textContent = `🎯 Auto-Detected! Nearest outlet is ${closest.name} (${minDistance.toFixed(1)} km away). Selected for your delivery!`;
          }
          if (btnText) btnText.textContent = `✓ Nearest: ${closest.name} (${minDistance.toFixed(1)} km)`;

          renderOutletPickerList(coords);

          // Auto-close after brief delight preview
          setTimeout(() => {
            closeCityModal();
          }, 1400);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        if (btnText) btnText.textContent = 'Detect My Location (GPS)';
        if (feedback) {
          feedback.className = 'gps-feedback error';
          feedback.textContent = 'Location permission was denied or unavailable. Please pick your outlet from the list below:';
        }
        renderOutletPickerList();
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // First open prompt logic
  window.triggerInitialLocationModal = function () {
    if (!store.isLocationConfirmed) {
      setTimeout(() => {
        window.openCityModal();
      }, 200);
    }
  };

  // --- 10. AUTHENTICATION & USER PROFILE ---
  function updateAuthUI() {
    const authBtn = document.getElementById('nav-auth-btn');
    const authIcon = document.getElementById('nav-auth-icon');
    const authLabel = document.getElementById('nav-auth-label');
    const authChevron = document.getElementById('nav-auth-chevron');

    if (!authBtn) return;

    if (store.user) {
      authBtn.classList.add('is-logged-in');
      const fullName = (store.user.name || 'User').trim();
      const firstName = fullName.split(' ')[0];
      const initial = firstName.charAt(0).toUpperCase();

      if (authIcon) {
        if (store.user.photoURL) {
          authIcon.className = 'user-avatar-badge';
          authIcon.innerHTML = `<img src="${store.user.photoURL}" alt="${firstName}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover; display: block;">`;
        } else {
          authIcon.className = 'user-initial-badge';
          authIcon.textContent = initial;
        }
      }
      if (authLabel) {
        authLabel.textContent = firstName;
      }
      if (authChevron) {
        authChevron.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
      }
    } else {
      authBtn.classList.remove('is-logged-in');
      if (authIcon) {
        authIcon.className = 'auth-icon-svg';
        authIcon.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
      }
      if (authLabel) {
        authLabel.textContent = 'Sign In';
      }
      if (authChevron) {
        authChevron.innerHTML = '';
      }
    }
  }

  window.handleAuthNavClick = function () {
    if (store.user) {
      openProfileModal();
    } else {
      openAuthModal();
    }
  };

  window.openAuthModal = function (tab = 'login') {
    switchAuthTab(tab);
    const alertEl = document.getElementById('auth-alert');
    if (alertEl) alertEl.style.display = 'none';
    document.getElementById('auth-modal-overlay').classList.add('active');
  };

  window.closeAuthModal = function () {
    document.getElementById('auth-modal-overlay').classList.remove('active');
  };

  window.switchAuthTab = function (tab) {
    const loginForm = document.getElementById('form-login');
    const signupForm = document.getElementById('form-signup');
    const tabLogin = document.getElementById('tab-login-btn');
    const tabSignup = document.getElementById('tab-signup-btn');
    const alertEl = document.getElementById('auth-alert');
    if (alertEl) alertEl.style.display = 'none';

    if (tab === 'login') {
      loginForm.style.display = 'block';
      signupForm.style.display = 'none';
      tabLogin.classList.add('active');
      tabSignup.classList.remove('active');
    } else {
      loginForm.style.display = 'none';
      signupForm.style.display = 'block';
      tabLogin.classList.remove('active');
      tabSignup.classList.add('active');
    }
  };

  window.handleLoginSubmit = function (e) {
    if (e) e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    const alertEl = document.getElementById('auth-alert');

    try {
      store.login(email, pass);
      alertEl.className = 'auth-alert success';
      alertEl.textContent = `Welcome back, ${store.user.name}! 🎉`;
      alertEl.style.display = 'block';

      setTimeout(() => {
        closeAuthModal();
        updateAuthUI();
      }, 700);
    } catch (err) {
      alertEl.className = 'auth-alert error';
      alertEl.textContent = err.message;
      alertEl.style.display = 'block';
    }
  };

  window.handleSignupSubmit = function (e) {
    if (e) e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const phone = document.getElementById('signup-phone').value;
    const pass = document.getElementById('signup-password').value;
    const alertEl = document.getElementById('auth-alert');

    try {
      store.signup(name, email, phone, pass);
      alertEl.className = 'auth-alert success';
      alertEl.textContent = `Account created successfully! Welcome to BurgGraj 🎉`;
      alertEl.style.display = 'block';

      setTimeout(() => {
        closeAuthModal();
        updateAuthUI();
      }, 700);
    } catch (err) {
      alertEl.className = 'auth-alert error';
      alertEl.textContent = err.message;
      alertEl.style.display = 'block';
    }
  };

  // --- GOOGLE SIGN IN & SIGN UP HANDLER ---
  window.handleGoogleAuth = async function () {
    const alertEl = document.getElementById('auth-alert');
    const googleBtns = document.querySelectorAll('.btn-google-auth');

    try {
      googleBtns.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.75';
        btn.innerHTML = `<span class="auth-spinner"></span> Connecting to Google...`;
      });

      if (alertEl) {
        alertEl.className = 'auth-alert';
        alertEl.style.background = '#EFF6FF';
        alertEl.style.color = '#1D4ED8';
        alertEl.style.border = '1px solid #93C5FD';
        alertEl.textContent = '⏳ Opening Google sign-in window...';
        alertEl.style.display = 'block';
      }

      const user = await store.loginWithGoogle();

      if (alertEl) {
        alertEl.className = 'auth-alert success';
        alertEl.textContent = `Welcome, ${user.name}! Successfully signed in with Google 🎉`;
        alertEl.style.display = 'block';
      }

      setTimeout(() => {
        closeAuthModal();
        updateAuthUI();
      }, 800);
    } catch (err) {
      console.error("Google Auth error:", err);
      if (alertEl) {
        alertEl.className = 'auth-alert error';
        alertEl.style.background = '#FEE2E2';
        alertEl.style.color = '#991B1B';
        alertEl.style.border = '1px solid #F87171';
        alertEl.textContent = err.message || 'Failed to sign in with Google.';
        alertEl.style.display = 'block';
      }
    } finally {
      googleBtns.forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Continue with Google</span>
        `;
      });
    }
  };

  window.fillDemoLogin = function () {
    document.getElementById('login-email').value = 'user@burgergarage.com';
    document.getElementById('login-password').value = 'password123';
    handleLoginSubmit();
  };

  window.openProfileModal = function () {
    if (!store.user) return;
    document.getElementById('profile-user-name').textContent = store.user.name;
    document.getElementById('profile-user-email').textContent = store.user.email;
    document.getElementById('profile-user-phone').textContent = store.user.phone || 'Not provided';
    document.getElementById('profile-user-outlet').textContent = `${store.selectedCity} (${store.selectedArea})`;
    document.getElementById('profile-user-orders-count').textContent = store.orders.length;

    const avatarCircle = document.getElementById('profile-avatar-circle');
    if (avatarCircle) {
      if (store.user.photoURL) {
        avatarCircle.innerHTML = `<img src="${store.user.photoURL}" alt="${store.user.name}" style="width: 58px; height: 58px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary);">`;
      } else {
        avatarCircle.textContent = '👤';
      }
    }

    document.getElementById('profile-modal-overlay').classList.add('active');
  };

  window.closeProfileModal = function () {
    document.getElementById('profile-modal-overlay').classList.remove('active');
  };

  window.handleLogout = function () {
    store.logout();
    closeProfileModal();
    updateAuthUI();
  };

  // --- 11. FAVORITES MODAL ---
  window.openFavoritesModal = function () {
    const listContainer = document.getElementById('favorites-list-container');
    if (!listContainer) return;

    if (store.favorites.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--gray-muted);">
          <div style="font-size: 40px; margin-bottom: 10px;">🤍</div>
          <h4 style="color: var(--dark); margin-bottom: 6px;">No Favorites Yet</h4>
          <p style="font-size: 13px;">Tap the heart icon on any burger, pizza or drink card to add it here!</p>
        </div>
      `;
    } else {
      const favProducts = MENU_DATA.products.filter(p => store.favorites.includes(p.id));
      listContainer.innerHTML = favProducts.map(p => `
        <div class="fav-item-row">
          <img src="${p.image}" alt="${p.name}" class="fav-item-img" onerror="this.src='assets/logoo.jpg'">
          <div class="fav-item-info">
            <div class="fav-item-name">${p.name}</div>
            <div class="fav-item-price">Rs ${p.price}</div>
          </div>
          <button class="btn-checkout" style="margin: 0; padding: 7px 14px; font-size: 13px;" onclick="closeFavoritesModal(); openDetailModal('${p.id}')">
            Add to Cart +
          </button>
        </div>
      `).join('');
    }

    document.getElementById('favorites-modal-overlay').classList.add('active');
  };

  window.closeFavoritesModal = function () {
    document.getElementById('favorites-modal-overlay').classList.remove('active');
  };

  // --- 12. AI ASSISTANT TRIGGERS ---
  window.toggleAiChat = function () {
    aiBot.toggle();
  };

  window.sendAiMessage = function (e) {
    if (e) e.preventDefault();
    const input = document.getElementById('ai-chat-input');
    if (input && input.value) {
      aiBot.send(input.value);
      input.value = '';
    }
  };

  // Search input listener
  const searchInput = document.getElementById('nav-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      activeSearchQuery = e.target.value;
      renderProducts();
    });
  }

  function updateHeaderWishlistBadge() {
    const favCountEl = document.getElementById('nav-fav-badge');
    if (favCountEl) favCountEl.textContent = store.favorites.length;
  }

  // Store Subscriptions
  store.subscribe((event) => {
    if (event === 'cart_updated') {
      renderCartDrawer();
    }
    if (event === 'favorites_updated') {
      updateHeaderWishlistBadge();
    }
    if (event === 'user_updated') {
      updateAuthUI();
    }
    if (event === 'order_status_updated') {
      if (document.getElementById('orders-modal-overlay').classList.contains('active')) {
        openMyOrders();
      }
    }
  });

  // Initial Boot
  renderDeals();
  renderCategories();       // Initial render with default categories
  initLiveProducts();       // Load products live from Firebase (overwrites on data load)
  renderOutlets();
  renderCartDrawer();
  updateHeaderWishlistBadge();
  updateAuthUI();
  if (store.bindActiveOrdersListeners) {
    store.bindActiveOrdersListeners();
  }

  // Auto-sync Firebase Auth session if user is logged in
  if (typeof firebaseService !== 'undefined' && firebaseService.listenToAuthState) {
    firebaseService.listenToAuthState((fbUser) => {
      if (fbUser) {
        const updated = {
          id: fbUser.uid,
          uid: fbUser.uid,
          name: fbUser.displayName || (store.user && store.user.name) || (fbUser.email ? fbUser.email.split('@')[0] : 'User'),
          email: fbUser.email || (store.user && store.user.email) || '',
          phone: fbUser.phoneNumber || (store.user && store.user.phone) || '',
          photoURL: fbUser.photoURL || (store.user && store.user.photoURL) || '',
          authProvider: (fbUser.providerData && fbUser.providerData[0] && fbUser.providerData[0].providerId) || 'firebase'
        };
        store.user = updated;
        store.save(store.userKey, updated);
        updateAuthUI();
      }
    });
  }

  document.getElementById('nav-city-text').textContent = `${store.selectedCity} (${store.selectedArea})`;

  // --- 13. MOBILE APP BANNER CONTROLLER ---
  window.dismissAppBanner = function () {
    const banner = document.getElementById('mobile-app-banner');
    if (banner) {
      banner.style.transition = 'all 0.3s ease';
      banner.style.opacity = '0';
      banner.style.maxHeight = '0';
      banner.style.padding = '0';
      banner.style.overflow = 'hidden';
      setTimeout(() => {
        banner.style.display = 'none';
      }, 300);
      sessionStorage.setItem('bg_app_banner_dismissed', 'true');
    }
  };

  window.notifyApkDownload = function () {
    const title = document.querySelector('.app-banner-title');
    const sub = document.querySelector('.app-banner-sub');
    if (title) {
      const orig = title.textContent;
      title.textContent = "Downloading APK... ⏳";
      if (sub) sub.textContent = "Tap downloaded file to install";
      setTimeout(() => {
        title.textContent = orig;
        if (sub) sub.textContent = "Faster orders & live rider tracking";
      }, 4500);
    }
  };

  if (sessionStorage.getItem('bg_app_banner_dismissed') === 'true') {
    const banner = document.getElementById('mobile-app-banner');
    if (banner) banner.style.display = 'none';
  }

  // If page loaded and loader is not present, trigger initial location prompt
  if (!document.getElementById('site-loader') || document.getElementById('site-loader').classList.contains('loader-hidden')) {
    window.triggerInitialLocationModal();
  }
});
