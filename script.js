document.addEventListener("DOMContentLoaded", () => {
    
    /* 1. TABS MANAGEMENT ENGINE */
    const tabButtons = document.querySelectorAll(".tab-btn");
    const viewPanels = document.querySelectorAll(".view-panel");

    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            tabButtons.forEach(btn => btn.classList.remove("active"));
            viewPanels.forEach(panel => panel.classList.remove("active"));
            button.classList.add("active");
            const target = document.getElementById(button.getAttribute("data-target"));
            if (target) target.classList.add("active");
        });
    });

    /* 2. PROXY & APP LAUNCH ENGINE */
    const proxyInput = document.getElementById("proxy-input");
    const proxyLaunchBtn = document.getElementById("proxy-launch-btn");
    const appCards = document.querySelectorAll(".app-card");

    function executeLaunch(targetUrl) {
        if (!targetUrl) return;
        alert(`Initializing Isolation Sandbox Framework...\nTunneling securely to:\n${targetUrl}`);
    }
    if(proxyLaunchBtn) proxyLaunchBtn.addEventListener("click", () => executeLaunch(proxyInput.value));
    appCards.forEach(card => card.addEventListener("click", () => executeLaunch(card.getAttribute("data-url"))));

    /* 3. PEER CHAT SIMULATION */
    const chatBox = document.getElementById("chat-box");
    const chatInput = document.getElementById("chat-input");
    const sendChatBtn = document.getElementById("send-chat-btn");

    function appendChat(sender, text, isSystem = false) {
        if (!chatBox) return;
        const msg = document.createElement("div");
        msg.className = `chat-msg ${isSystem ? 'system' : ''}`;
        msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
        chatBox.appendChild(msg);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function dispatchChat() {
        const text = chatInput.value.trim();
        if (!text) return;
        appendChat(document.getElementById("user-display").innerText, text);
        chatInput.value = "";
        setTimeout(() => {
            const bots = ["Astro_Node", "XenonBypass", "Cherri_Fan"];
            const phrases = ["Speed is running smoothly here.", "Bypass completed loading.", "This dark layout looks epic."];
            appendChat(bots[Math.floor(Math.random() * bots.length)], phrases[Math.floor(Math.random() * phrases.length)]);
        }, 1200);
    }
    if(sendChatBtn) {
        sendChatBtn.addEventListener("click", dispatchChat);
        chatInput.addEventListener("keypress", (e) => { if (e.key === "Enter") dispatchChat(); });
    }

    /* 4. NOVA AI CORE TERMINAL */
    const aiLog = document.getElementById("ai-log");
    const aiInput = document.getElementById("ai-input");
    const askAiBtn = document.getElementById("ask-ai-btn");

    function askNova() {
        const query = aiInput.value.trim();
        if (!query || !aiLog) return;
        const uP = document.createElement("p"); uP.className = "ai-text"; uP.innerHTML = `<strong>You:</strong> ${query}`;
        aiLog.appendChild(uP); aiInput.value = "";
        const rP = document.createElement("p"); rP.className = "ai-text"; rP.innerHTML = `<strong>Nova AI:</strong> <em>Processing...</em>`;
        aiLog.appendChild(rP); aiLog.scrollTop = aiLog.scrollHeight;

        setTimeout(() => {
            let reply = "Instruction processed. Access granted to local sandboxed core modules.";
            if (query.toUpperCase().includes("PROXY")) reply = "Nebula maps isolated frames on the client-side layer to maintain stealth filtering protocols.";
            rP.innerHTML = `<strong>Nova AI:</strong> ${reply}`;
            aiLog.scrollTop = aiLog.scrollHeight;
        }, 800);
    }
    if(askAiBtn) {
        askAiBtn.addEventListener("click", askNova);
        aiInput.addEventListener("keypress", (e) => { if (e.key === "Enter") askNova(); });
    }

    /* 5. TAB CLOAKING ENGINE */
    const cloakButtons = document.querySelectorAll(".cloak-picker");
    const resetCloakBtn = document.getElementById("reset-cloak");

    // Hold onto the initial page properties for easy reset
    const originalTitle = document.title;
    const originalFavicon = document.querySelector("link[rel*='icon']") ? document.querySelector("link[rel*='icon']").href : "";

    function applyCloak(title, faviconUrl) {
        document.title = title;
        let link = document.querySelector("link[rel*='icon']") || document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        link.href = faviconUrl;
        document.getElementsByTagName('head')[0].appendChild(link);
        
        localStorage.setItem("nebula-cloak-title", title);
        localStorage.setItem("nebula-cloak-icon", faviconUrl);
    }

    cloakButtons.forEach(btn => {
        if(btn.id !== "reset-cloak") {
            btn.addEventListener("click", () => {
                applyCloak(btn.getAttribute("data-title"), btn.getAttribute("data-url") || btn.getAttribute("data-icon"));
            });
        }
    });

    if(resetCloakBtn) {
        resetCloakBtn.addEventListener("click", () => {
            document.title = originalTitle;
            let link = document.querySelector("link[rel*='icon']");
            if (link) link.href = originalFavicon;
            localStorage.removeItem("nebula-cloak-title");
            localStorage.removeItem("nebula-cloak-icon");
            alert("Tab metadata restored to defaults.");
        });
    }

    /* 6. PANIC BUTTON MODULE */
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            // Instantly clear display space and force redirect to a safe destination
            window.location.href = "https://wikipedia.org";
        }
    });

    /* 7. SAVED DATA PREFERENCES SYNC */
    const themePickers = document.querySelectorAll(".theme-picker");
    const fontPickers = document.querySelectorAll(".font-picker");
    const usernameInput = document.getElementById("username-input");
    const saveUserBtn = document.getElementById("save-user-btn");
    const userDisplay = document.getElementById("user-display");

    const cachedTheme = localStorage.getItem("nebula-theme") || "theme-nebula";
    const cachedFont = localStorage.getItem("nebula-font") || "font-cyber";
    const cachedUser = localStorage.getItem("nebula-username") || "Guest Account";
    const cachedCloakTitle = localStorage.getItem("nebula-cloak-title");
    const cachedCloakIcon = localStorage.getItem("nebula-cloak-icon");

    document.body.className = `${cachedTheme} ${cachedFont}`;
    if(userDisplay) userDisplay.innerText = cachedUser;
    if(cachedCloakTitle && cachedCloakIcon) applyCloak(cachedCloakTitle, cachedCloakIcon);

    themePickers.forEach(picker => {
        picker.addEventListener("click", () => {
            const font = localStorage.getItem("nebula-font") || "font-cyber";
            const theme = picker.getAttribute("data-theme");
            document.body.className = `${theme} ${font}`;
            localStorage.setItem("nebula-theme", theme);
        });
    });

    fontPickers.forEach(picker => {
        picker.addEventListener("click", () => {
            const theme = localStorage.getItem("nebula-theme") || "theme-nebula";
            const font = picker.getAttribute("data-font");
            document.body.className = `${theme} ${font}`;
            localStorage.setItem("nebula-font", font);
        });
    });

    if(saveUserBtn) {
        saveUserBtn.addEventListener("click", () => {
            const newName = usernameInput.value.trim();
            if (newName) {
                userDisplay.innerText = newName;
                localStorage.setItem("nebula-username", newName);
                usernameInput.value = "";
            }
        });
    }
});
