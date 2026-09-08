// Burger Garage - BurgGraj AI Assistant
// Powered by Google Gemini 2.5 Flash + Live Firestore Menu Synchronization

class AiAssistant {
  constructor(chatContainerId) {
    this.container = document.getElementById(chatContainerId);
    this.apiKey = 'AIzaSyBNtwbxZ_2kL52iKlG5QKY9kdUXLkG6Pbs';
    this.model = 'gemini-2.5-flash';
    this.products = [];
    this.chatHistory = []; // Multi-turn conversational memory for Gemini
    
    this.messages = [
      {
        sender: 'ai',
        text: 'Assalam o Alaikum! 🍔 I am **BurgGraj AI**, your smart food guide powered by Google Gemini! Looking for recommendations, combo deals, or pizza sizes today?',
        time: this.currentTime()
      }
    ];
    this.isOpen = false;
  }

  currentTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Update live menu products from Firestore
  updateProducts(productsList) {
    if (Array.isArray(productsList)) {
      this.products = productsList;
      console.log(`🤖 [BurgGraj AI] Knowledge base updated with ${this.products.length} live products.`);
    }
  }

  toggle() {
    this.isOpen = !this.isOpen;
    const widget = document.getElementById('ai-chat-widget');
    if (widget) {
      if (this.isOpen) {
        widget.classList.add('active');
        this.render();
      } else {
        widget.classList.remove('active');
      }
    }
  }

  render() {
    const messagesEl = document.getElementById('ai-chat-messages');
    if (!messagesEl) return;

    messagesEl.innerHTML = this.messages.map(m => `
      <div class="chat-msg ${m.sender === 'user' ? 'msg-user' : 'msg-ai'}">
        <div class="msg-bubble">
          <div class="msg-text">${this.formatMarkdown(m.text)}</div>
          <div class="msg-time">${m.time}</div>
        </div>
      </div>
    `).join('');

    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  formatMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^\s*-\s+(.*)$/gm, '• $1<br>')
      .replace(/\n/g, '<br>');
  }

  async send(userText) {
    const text = userText.trim();
    if (!text) return;

    // Display user message
    this.messages.push({
      sender: 'user',
      text: text,
      time: this.currentTime()
    });
    this.render();

    // Show AI typing indicator
    this.showTypingIndicator();

    try {
      // 1. Try Google Gemini AI first
      const aiReply = await this.askGemini(text);
      this.hideTypingIndicator();

      this.messages.push({
        sender: 'ai',
        text: aiReply,
        time: this.currentTime()
      });
      this.render();

      if (typeof store !== 'undefined' && store.playChime) {
        store.playChime();
      }
    } catch (err) {
      console.warn("Gemini API fallback to local rules:", err.message);
      this.hideTypingIndicator();

      // 2. Graceful Fallback to smart local food matcher
      const fallbackReply = this.generateLocalFallback(text);
      this.messages.push({
        sender: 'ai',
        text: fallbackReply,
        time: this.currentTime()
      });
      this.render();
    }
  }

  // --- GEMINI 2.5 FLASH REST API CALL ---
  async askGemini(userPrompt) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    
    // Build live shop context
    const systemPrompt = this.buildSystemPrompt();

    // Build chat contents array with history
    const contents = [
      {
        role: "user",
        parts: [{ text: `System Context & Instructions:\n${systemPrompt}` }]
      },
      {
        role: "model",
        parts: [{ text: "Understood! I am BurgGraj AI, enthusiastic, friendly, and knowledgeable food assistant for Burger Garage. I'll assist customers with tasty recommendations and prices in English or Roman Urdu." }]
      }
    ];

    // Append conversation history (last 8 messages for context)
    const recentHistory = this.chatHistory.slice(-8);
    for (const h of recentHistory) {
      contents.push(h);
    }

    // Append current prompt
    contents.push({
      role: "user",
      parts: [{ text: userPrompt }]
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 350
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    const candidate = data.candidates && data.candidates[0];
    if (candidate && candidate.content && candidate.content.parts && candidate.content.parts[0]) {
      const replyText = candidate.content.parts[0].text;

      // Save to conversation history
      this.chatHistory.push({ role: "user", parts: [{ text: userPrompt }] });
      this.chatHistory.push({ role: "model", parts: [{ text: replyText }] });

      return replyText;
    }

    throw new Error("Empty candidate received from Gemini");
  }

  buildSystemPrompt() {
    // Collect active products
    let menuDetails = "";
    if (this.products && this.products.length > 0) {
      menuDetails = this.products.map(p => {
        let sizeInfo = "";
        if (p.sizes && typeof p.sizes === 'object') {
          sizeInfo = " (Sizes: " + Object.entries(p.sizes).map(([sz, pr]) => `${sz}: Rs ${pr}`).join(', ') + ")";
        }
        return `• ${p.name} [Category: ${p.category}]: Rs ${p.price}${sizeInfo} - ${p.description || ''}`;
      }).join("\n");
    } else {
      menuDetails = `
• Corolla Zinger: Rs 430 (Signature ultra-crispy spicy burger)
• Hilux Fillet: Rs 430 (Jumbo chicken fillet burger)
• 28 Wheeler Wrap: Rs 500 (Giant crispy chicken roll)
• BBQ Tikka Pizza: Small Rs 580, Medium Rs 1000, Large Rs 1600
• Fajita Sicilian Pizza: Small Rs 580, Medium Rs 1000, Large Rs 1600
• Loaded Cheddar Fries: Small Rs 670, Medium Rs 1050, Large Rs 1450
• Summer Solo Deal: Rs 748 (1 Small Pizza + 1 Drink + 2 Pcs Wings)
• Mega Garage Combo: Rs 2499 (1 Large Pizza + 1 Zinger + 1 Wrap + 8 Wings)`;
    }

    return `
You are "BurgGraj AI", the official AI virtual assistant for the famous restaurant "Burger Garage" (Pakistan).
Store slogan: "Taste the Fuel 🍔⚡ - Drive Your Burger Safely!".

Branches & Delivery:
- Outlets in: Gujranwala (Rahwali Cantt, Model Town City, Sialkot Road), Daska, and Wazirabad.
- Timings: 11:00 AM to 1:00 AM daily.
- Delivery: Express door delivery in 30-40 minutes. Free delivery over Rs 1500.

Current Live Menu:
${menuDetails}

Standard Sizes & Rules:
- Pizzas: Small (4 slices, 1 person), Medium (6 slices, 2-3 persons), Large (8 slices, 4-5 persons).
- Regular Fries: Small Rs 320, Medium Rs 420, Large Rs 520.
- Loaded Fries: Small Rs 670, Medium Rs 1050, Large Rs 1450.
- Burgers: Medium (Standard price) or Large (add patty/cheese).

Tone & Persona:
1. Always be polite, warm, energetic, and food-loving!
2. Match the language of the user: If they speak Roman Urdu, reply in natural, fluent Roman Urdu. If English, reply in English.
3. Keep answers concise (2 to 4 short bullet points or sentences).
4. If asked for a budget recommendation (e.g. "budget is 2000 for 3 people"), calculate and suggest the best combination from the menu.
5. Use burger, pizza, and fire emojis appropriately! 🍔🍕🔥`;
  }

  showTypingIndicator() {
    const messagesEl = document.getElementById('ai-chat-messages');
    if (!messagesEl) return;

    const typingEl = document.createElement('div');
    typingEl.id = 'ai-typing-indicator';
    typingEl.className = 'chat-msg msg-ai';
    typingEl.innerHTML = `
      <div class="msg-bubble typing-bubble">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    `;
    messagesEl.appendChild(typingEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  hideTypingIndicator() {
    const typingEl = document.getElementById('ai-typing-indicator');
    if (typingEl) typingEl.remove();
  }

  // --- LOCAL FALLBACK ENGINE (IF OFFLINE) ---
  generateLocalFallback(query) {
    const q = query.toLowerCase();

    if (q.includes('hello') || q.includes('hi') || q.includes('salam') || q.includes('hey')) {
      return "Walaikum Assalam! 🍔 Welcome to Burger Garage! Aaj kya khane ka mood hai — spicy burger, cheesy pizza, ya koi special deal?";
    }

    if (q.includes('burger')) {
      return "Burger Garage ke super hits:\n• **Corolla Zinger (Rs 430)**: Ultra crispy spicy fillet.\n• **Hilux Fillet (Rs 430)**: Jumbo chicken patty with signature sauce.\n• **28 Wheeler Wrap (Rs 500)**: Heavy crispy wrap! 🔥";
    }

    if (q.includes('pizza')) {
      return "🍕 **Pizza Sizes & Slices:**\n• **Small (Rs 580)**: 4 slices (1 person)\n• **Medium (Rs 1,000)**: 6 slices (2-3 persons)\n• **Large (Rs 1,600)**: 8 slices (4-5 persons)\n\nTry Tikka, Fajita ya Garage Special with stuffed crust!";
    }

    if (q.includes('deal') || q.includes('offer')) {
      return "🔥 **Hot Deals Right Now:**\n• **Summer Solo (Rs 748)**: 1 Small Pizza + 1 Drink + 2 Wings\n• **Mega Garage Combo (Rs 2,499)**: 1 Large Pizza + 1 Zinger + 1 Wrap + 8 Wings!\n\nHero section se direct Add to Cart kar sakte hain!";
    }

    if (q.includes('timing') || q.includes('branch') || q.includes('outlet') || q.includes('location')) {
      return "📍 Branches: **Rahwali Cantt**, **Gujranwala City**, **Sialkot Road**, **Daska**, and **Wazirabad**.\n🕒 Daily 11:00 AM se 1:00 AM tak open hain. Delivery time 30-40 mins!";
    }

    return "Aap BurgGraj ke menu ke baray mein pooch sakte hain:\n• *'Best burger kaun sa hai?'*\n• *'Pizza sizes and rates'* \n• *'2000 ke budget mein deal suggest karo'*";
  }
}

// Global instance
const aiBot = new AiAssistant('ai-chat-messages');

// Quick prompt trigger
window.askAiPrompt = function(promptText) {
  const input = document.getElementById('ai-chat-input');
  if (input) {
    input.value = promptText;
  }
  aiBot.send(promptText);
};
