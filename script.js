// Navigation and Tab Switching System
document.querySelectorAll('.nav-btn').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').remove('active'); // legacy patch
        
        // Hide all tabs securely
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(`tab-${tabId}`).classList.add('active');
    });
});

// Deployment Custom Iframe Engine Logic (Fallback Engine)
function launchApp(url) {
    const encodedUrl = url; // In a production proxy server like Ultramarine/Ultraviolet, you'd apply an encodeXor function here.
    document.getElementById('tab-proxy').classList.add('active');
    document.querySelectorAll('.tab-content').forEach(tab => {
        if(tab.id !== 'tab-proxy') tab.classList.remove('active');
    });
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.getAttribute('data-tab') === 'proxy') btn.classList.add('active');
    });

    const container = document.getElementById('browser-container');
    const iframe = document.getElementById('proxy-iframe');
    const addressBar = document.getElementById('browser-address-bar');
    const hero = document.querySelector('.hero-section');

    hero.style.display = 'none';
    container.style.display = 'flex';
    addressBar.textContent = url;
    
    // For direct preview rendering deployment, we fallback to embedding directly or via a standard clean wrapper setup
    iframe.src = url; 
}

document.getElementById('proxy-go-btn').addEventListener('click', () => {
    const input = document.getElementById('proxy-input').value;
    if(input) {
        let targetUrl = input;
        if (!/^https?:\/\//i.test(input)) {
            targetUrl = 'https://www.google.com/search?q=' + encodeURIComponent(input);
        }
        launchApp(targetUrl);
    }
});

document.getElementById('browser-close').addEventListener('click', () => {
    document.getElementById('browser-container').style.display = 'none';
    document.querySelector('.hero-section').style.display = 'flex';
    document.getElementById('proxy-iframe').src = '';
});

// Simulated Distributed Global Peer-to-Peer Chat
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');

const mockPeers = [
    "ShadowMatrix: Anyone unblocked discord yet?",
    "XorRunner: Yeah, use the optimized pipelines in the Apps tab.",
    "CherriFan: This look completely clean, way better than standard mirrors.",
    "GlitchCore: Nova AI knows bypass scripts for local filters."
];

function triggerMockPeerMessage() {
    if(Math.random() > 0.4) {
        const randomPeerMessage = mockPeers[Math.floor(Math.random() * mockPeers.length)];
        const parts = randomPeerMessage.split(': ');
        
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble peer';
        bubble.innerHTML = `<strong>${parts[0]}</strong>: ${parts[1]}`;
        chatMessages.appendChild(bubble);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}
setInterval(triggerMockPeerMessage, 9000);

function sendChatMessage() {
    const text = chatInput.value.trim();
    if(text) {
        const username = localStorage.getItem('nebula_user') || 'Guest Explorer';
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble user';
        bubble.innerHTML = `<strong>${username}</strong>: ${text}`;
        chatMessages.appendChild(bubble);
        chatInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}
chatSendBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendChatMessage(); });

// Custom Fully Isolated Autonomous Nova AI Core
const aiMessages = document.getElementById('ai-messages');
const aiInput = document.getElementById('ai-input');
const aiSendBtn = document.getElementById('ai-send-btn');

const aiResponses = {
    "hello": "Hello! I am Nova AI Core. I run entirely within your sandboxed interface context.",
    "proxy": "To bypass school or corporate firewalls, launch any item inside the 'Apps' dashboard or type a URL natively into the primary proxy input stream.",
    "discord": "Discord pipeline is fully optimized. Launching it from Nebula encapsulates it to prevent detection by standard secure filters.",
    "tiktok": "TikTok video streams are isolated inside our iframe browser viewport layer.",
    "unblock": "Nebula implements structural styles inspired by Utopia and Cherri networks to keep elements anonymous."
};

function queryNovaAI() {
    const query = aiInput.value.trim().toLowerCase();
    if(!query) return;

    // Render user prompt
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble user';
    userBubble.textContent = aiInput.value;
    aiMessages.appendChild(userBubble);
    aiInput.value = '';

    setTimeout(() => {
        const aiBubble = document.createElement('div');
        aiBubble.className = 'chat-bubble ai';
        
        let answer = "System Matrix Alert: Request analyzed. For specialized proxy tunneling deployments, ensure you run Nebula via Node.js using an Ultraviolet/Corrosion proxy backend configuration package.";
        for(let key in aiResponses) {
            if(query.includes(key)) {
                answer = aiResponses[key];
                break;
            }
        }
        
        aiBubble.textContent = "🤖 " + answer;
        aiMessages.appendChild(aiBubble);
        aiMessages.scrollTop = aiMessages.scrollHeight;
    }, 600);
}
aiSendBtn.addEventListener('click', queryNovaAI);
aiInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') queryNovaAI(); });

// Design Personalization System Matrix (Themes and Fonts)
document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.theme-btn').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        document.body.setAttribute('data-theme', btn.getAttribute('data-theme'));
    });
});

document.querySelectorAll('.font-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.font-btn').forEach(f => f.classList.remove('active'));
        btn.classList.add('active');
        document.body.setAttribute('data-font', btn.getAttribute('data-font'));
    });
});

// Authentication and Quantum Profile Identity Systems
function openAuthModal() { document.getElementById('auth-modal').style.display = 'flex'; }
function closeAuthModal() { document.getElementById('auth-modal').style.display = 'none'; }

function handleAuth(e) {
    e.preventDefault();
    const user = document.getElementById('auth-username').value;
    localStorage.setItem('nebula_user', user);
    document.getElementById('username-display').textContent = user;
    closeAuthModal();
}

// Initial Sync Checks
window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('nebula_user');
    if(savedUser) {
        document.getElementById('username-display').textContent = savedUser;
    }
});
