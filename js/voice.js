// Burger Garage - Voice Recognition Engine
// Powered by Web Speech Recognition API with English & Urdu/Roman Urdu NLP matching

class VoiceAssistant {
  constructor(onResultCallback, onStateChangeCallback) {
    this.recognition = null;
    this.isListening = false;
    this.onResult = onResultCallback;
    this.onStateChange = onStateChangeCallback;
    this.supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

    if (this.supported) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US'; // Also handles roman urdu words accurately

      this.recognition.onstart = () => {
        this.isListening = true;
        if (this.onStateChange) this.onStateChange(true);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.onStateChange) this.onStateChange(false);
      };

      this.recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        this.isListening = false;
        if (this.onStateChange) this.onStateChange(false, event.error);
      };

      this.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        
        const isFinal = event.results[event.results.length - 1].isFinal;
        if (this.onResult) {
          this.onResult(transcript, isFinal);
        }

        if (isFinal) {
          this.processCommand(transcript);
        }
      };
    }
  }

  toggle() {
    if (!this.supported) {
      alert('Voice ordering is not supported in this browser. Please try Google Chrome or Edge.');
      return;
    }

    if (this.isListening) {
      this.recognition.stop();
    } else {
      try {
        this.recognition.start();
      } catch (e) {
        console.error('Recognition start error:', e);
      }
    }
  }

  processCommand(rawText) {
    const text = rawText.toLowerCase().trim();
    console.log('Processing voice command:', text);

    // Quantity extraction (default 1)
    let quantity = 1;
    if (text.includes('two') || text.includes('2') || text.includes('do') || text.includes('dou')) quantity = 2;
    if (text.includes('three') || text.includes('3') || text.includes('teen')) quantity = 3;
    if (text.includes('four') || text.includes('4') || text.includes('chaar')) quantity = 4;

    // Size extraction (default M for burger/fries, S for pizza)
    let size = 'M';
    if (text.includes('large') || text.includes('bada') || text.includes('barha')) size = 'L';
    if (text.includes('small') || text.includes('chota')) size = 'S';

    // Clear cart command
    if (text.includes('clear cart') || text.includes('empty cart') || text.includes('cart khali')) {
      store.clearCart();
      this.showFeedbackNotification('Cart cleared!');
      return;
    }

    // Match products against MENU_DATA
    let matchedProduct = null;

    for (const p of MENU_DATA.products) {
      const pName = p.name.toLowerCase();
      // Match by full name or keywords
      const keywords = pName.split(' ');
      const matchesName = text.includes(pName);
      const matchesKeywords = keywords.length > 1 && keywords.every(k => text.includes(k.toLowerCase()));

      if (matchesName || matchesKeywords) {
        matchedProduct = p;
        break;
      }
    }

    // Fallback fuzzy checks for common customer expressions
    if (!matchedProduct) {
      if (text.includes('hilux') || text.includes('fillet')) {
        matchedProduct = MENU_DATA.products.find(p => p.id === 1);
      } else if (text.includes('corolla') || text.includes('zinger')) {
        matchedProduct = MENU_DATA.products.find(p => p.id === 2);
      } else if (text.includes('civic') || text.includes('grilled')) {
        matchedProduct = MENU_DATA.products.find(p => p.id === 3);
      } else if (text.includes('picanto') || text.includes('chapli')) {
        matchedProduct = MENU_DATA.products.find(p => p.id === 4);
      } else if (text.includes('28 wheeler') || text.includes('wheeler wrap')) {
        matchedProduct = MENU_DATA.products.find(p => p.id === 5);
      } else if (text.includes('tikka pizza') || text.includes('tikka')) {
        matchedProduct = MENU_DATA.products.find(p => p.id === 8);
      } else if (text.includes('fajita pizza') || text.includes('fajita')) {
        matchedProduct = MENU_DATA.products.find(p => p.id === 9);
      } else if (text.includes('pepperoni')) {
        matchedProduct = MENU_DATA.products.find(p => p.id === 10);
      } else if (text.includes('loaded fries')) {
        matchedProduct = MENU_DATA.products.find(p => p.id === 19);
      } else if (text.includes('fries') || text.includes('chips')) {
        matchedProduct = MENU_DATA.products.find(p => p.id === 18);
      } else if (text.includes('sprite')) {
        matchedProduct = MENU_DATA.products.find(p => p.id === 14);
      } else if (text.includes('pepsi') || text.includes('coke') || text.includes('cola')) {
        matchedProduct = MENU_DATA.products.find(p => p.id === 15);
      } else if (text.includes('calzone')) {
        matchedProduct = MENU_DATA.products.find(p => p.id === 24);
      } else if (text.includes('wings')) {
        matchedProduct = MENU_DATA.products.find(p => p.id === 27);
      }
    }

    if (matchedProduct) {
      // Validate available sizes
      if (matchedProduct.category === 'Pizza' && !['S', 'M', 'L'].includes(size)) size = 'M';
      if (matchedProduct.category === 'Burger' && !['M', 'L'].includes(size)) size = 'M';
      if (matchedProduct.category === 'Drinks') size = 'Std';
      if (matchedProduct.category === 'Others') size = Object.keys(matchedProduct.sizes)[0] || 'Std';

      store.addToCart(matchedProduct, quantity, size);
      this.showFeedbackNotification(`Added ${quantity}x ${matchedProduct.name} (${size}) to Cart! 🍔🎉`);
    } else {
      this.showFeedbackNotification(`Could not identify "${rawText}". Try saying "Add 1 Corolla Zinger" or "One Tikka Pizza".`, true);
    }
  }

  showFeedbackNotification(message, isError = false) {
    let toast = document.getElementById('bg-voice-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'bg-voice-toast';
      toast.className = 'voice-toast';
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <div class="toast-content ${isError ? 'toast-error' : 'toast-success'}">
        <span class="toast-icon">${isError ? '⚠️' : '🎙️'}</span>
        <span class="toast-text">${message}</span>
      </div>
    `;

    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4500);
  }
}
