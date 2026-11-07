const PROVIDERS = {
    "gemini.google.com": {
        name: "Gemini",
        input: 'div.ql-editor[contenteditable="true"], div[contenteditable="true"][role="textbox"], rich-textarea .input-area, rich-textarea div[contenteditable="true"], div[contenteditable="true"]',
        sendBtn: 'button.send-button, button[aria-label*="Send" i], button[aria-label*="Envoyer" i], .send-button-container button',
        response: 'message-content, .model-response-text, model-response .response-content, .response-container-content',
        stopBtn: 'button[aria-label*="Stop" i], button[aria-label*="Arrêter" i]'
    },
    "aistudio.google.com": {
        name: "Google AI Studio",
        input: 'textarea.textarea, textarea, div[contenteditable="true"]',
        sendBtn: 'button.run-button, button[aria-label*="Run"], button[type="submit"]',
        response: '.chat-turn-content, ms-chat-turn, .model-prompt-container',
        stopBtn: 'button.stop-button, button[aria-label*="Stop"]'
    },
    "claude.ai": {
        name: "Claude",
        input: 'div.ProseMirror[contenteditable="true"], fieldset div[contenteditable="true"]',
        sendBtn: 'button[aria-label*="Send" i], button[aria-label*="Envoyer" i], button[data-testid="send-button"]',
        response: '.font-claude-message, .font-claude-response, [data-testid="chat-message-content"]',
        stopBtn: 'button[aria-label*="Stop" i], [data-is-streaming="true"]'
    },
    "chatgpt.com": {
        name: "ChatGPT",
        input: '#prompt-textarea, div[contenteditable="true"]#prompt-textarea',
        sendBtn: 'button[data-testid="send-button"], button[data-testid="fruitjuice-send-button"], button[aria-label*="Send" i], button[aria-label*="Envoyer" i]',
        response: 'div[data-message-author-role="assistant"]',
        stopBtn: 'button[data-testid="stop-button"], .result-streaming'
    },
    "chat.openai.com": {
        name: "ChatGPT",
        input: '#prompt-textarea, div[contenteditable="true"]#prompt-textarea',
        sendBtn: 'button[data-testid="send-button"], button[data-testid="fruitjuice-send-button"], button[aria-label*="Send"]',
        response: 'div[data-message-author-role="assistant"]',
        stopBtn: 'button[data-testid="stop-button"], .result-streaming'
    },
    "chat.deepseek.com": {
        name: "DeepSeek",
        input: 'textarea#chat-input, textarea',
        sendBtn: 'div[role="button"][aria-disabled="false"], button[type="submit"], button.ds-icon-button',
        response: '.ds-markdown',
        stopBtn: 'button[aria-label*="Stop"], .ds-icon-button[aria-label*="Stop"], div[role="button"][aria-label*="Stop"]'
    }
};

const currentHost = Object.keys(PROVIDERS).find(host => window.location.hostname.includes(host));
const provider = PROVIDERS[currentHost] || {
    name: window.location.hostname,
    input: 'div[contenteditable="true"], textarea',
    sendBtn: 'button[type="submit"], button[aria-label*="Send"]',
    response: '.markdown, message-content',
    stopBtn: null
};

let ws = null;
let isTabDedicated = false;
let retryTimer = null;
let isDragging = false;

const statusBtn = document.createElement('div');
statusBtn.style.cssText = `
  position: fixed;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 999999;
  padding: 7px 18px;
  border-radius: 22px;
  border: 1px solid #444;
  background: #1e1e1e;
  color: #fff;
  font-family: system-ui, -apple-system, sans-serif;
  cursor: grab;
  box-shadow: 0 4px 14px rgba(0,0,0,0.45);
  transition: background 0.2s ease, border-color 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  user-select: none;
`;

// Restore saved pill position if exists
try {
    const savedPos = JSON.parse(localStorage.getItem('antigravity_pill_pos'));
    if (savedPos && savedPos.left && savedPos.top) {
        statusBtn.style.left = savedPos.left;
        statusBtn.style.top = savedPos.top;
        statusBtn.style.transform = 'none';
    }
} catch (e) {}

const statusLabel = document.createElement('div');
statusLabel.style.cssText = `
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.2px;
  pointer-events: none;
`;

const watermarkLabel = document.createElement('div');
watermarkLabel.innerText = 'Powered by Trignod.ai';
watermarkLabel.style.cssText = `
  font-size: 10px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.65);
  letter-spacing: 0.4px;
  pointer-events: none;
`;

statusBtn.appendChild(statusLabel);
statusBtn.appendChild(watermarkLabel);
updateUI('standby');
document.body.appendChild(statusBtn);

// Draggable status pill
let startX = 0, startY = 0, origLeft = 0, origTop = 0;
statusBtn.addEventListener('mousedown', (e) => {
    isDragging = false;
    startX = e.clientX;
    startY = e.clientY;
    const rect = statusBtn.getBoundingClientRect();
    origLeft = rect.left;
    origTop = rect.top;
    statusBtn.style.cursor = 'grabbing';

    function onMouseMove(moveEvent) {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
            isDragging = true;
            statusBtn.style.transform = 'none';
            statusBtn.style.left = `${Math.max(10, Math.min(window.innerWidth - rect.width - 10, origLeft + dx))}px`;
            statusBtn.style.top = `${Math.max(10, Math.min(window.innerHeight - rect.height - 10, origTop + dy))}px`;
        }
    }

    function onMouseUp() {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        statusBtn.style.cursor = 'grab';
        if (isDragging) {
            try {
                localStorage.setItem('antigravity_pill_pos', JSON.stringify({
                    left: statusBtn.style.left,
                    top: statusBtn.style.top
                }));
            } catch (e) {}
        }
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
});

function updateUI(state) {
    if (state === 'standby') {
        statusLabel.innerText = `⚪ Click to dedicate (${provider.name}) to Antigravity`;
        statusBtn.style.background = '#242424';
        statusBtn.style.borderColor = '#555';
    } else if (state === 'connecting') {
        statusLabel.innerText = `🟡 Connecting (${provider.name}) to Antigravity MCP...`;
        statusBtn.style.background = '#4d3800';
        statusBtn.style.borderColor = '#f5b000';
    } else if (state === 'connected') {
        statusLabel.innerText = `🟢 (${provider.name}) Connected to Antigravity`;
        statusBtn.style.background = '#0d3b1e';
        statusBtn.style.borderColor = '#2ea043';
    } else if (state === 'working') {
        statusLabel.innerText = `🔵 (${provider.name}) Processing Antigravity Task...`;
        statusBtn.style.background = '#0a2d4d';
        statusBtn.style.borderColor = '#388bfd';
    }
}

statusBtn.addEventListener('click', () => {
    if (isDragging) return;
    isTabDedicated = !isTabDedicated;
    if (isTabDedicated) {
        try { sessionStorage.setItem('antigravity_bridge_dedicated', 'true'); } catch (e) {}
        connectBridge();
    } else {
        try { sessionStorage.removeItem('antigravity_bridge_dedicated'); } catch (e) {}
        clearTimeout(retryTimer);
        if (ws) ws.close();
        ws = null;
        updateUI('standby');
    }
});

// Auto-reconnect if tab was dedicated before refresh / navigation
try {
    if (sessionStorage.getItem('antigravity_bridge_dedicated') === 'true') {
        isTabDedicated = true;
        connectBridge();
    }
} catch (e) {}

function connectBridge() {
    if (!isTabDedicated) return;
    updateUI('connecting');

    const port = 4545;
    ws = new WebSocket(`ws://localhost:${port}`);

    ws.onopen = () => updateUI('connected');

    ws.onmessage = async(event) => {
        let data;
        try {
            data = JSON.parse(event.data);
        } catch (e) {
            return;
        }

        const id = data.id || null;

        if (data.type === 'replaced') {
            isTabDedicated = false;
            try { sessionStorage.removeItem('antigravity_bridge_dedicated'); } catch (e) {}
            clearTimeout(retryTimer);
            updateUI('standby');
            return;
        }

        if (data.type === 'check_session') {
            const existingResponses = document.querySelectorAll(provider.response).length;
            const sessionPayload = {
                provider: provider.name,
                isEmptyChat: existingResponses === 0,
                chatKey: window.location.origin + window.location.pathname
            };
            ws.send(JSON.stringify({
                id,
                type: 'check_session',
                payload: sessionPayload,
                ...sessionPayload
            }));
            return;
        }

        if (data.type === 'prompt') {
            updateUI('working');
            const promptText = (data.payload && data.payload.prompt) ? data.payload.prompt : (data.prompt || "");
            try {
                const reply = await askWebProvider(promptText);
                ws.send(JSON.stringify({
                    id,
                    type: 'prompt',
                    payload: { reply },
                    reply
                }));
            } catch (err) {
                ws.send(JSON.stringify({
                    id,
                    type: 'prompt',
                    error: err.message || "Failed to generate reply"
                }));
            }
            updateUI('connected');
        }
    };

    ws.onclose = () => {
        if (isTabDedicated) {
            updateUI('connecting');
            retryTimer = setTimeout(connectBridge, 3000);
        }
    };

    ws.onerror = () => {
        if (ws) ws.close();
    };
}

function fillInputBox(editor, text) {
    editor.focus();

    if (editor.tagName === 'TEXTAREA' || editor.tagName === 'INPUT') {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set ||
                       Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (setter) {
            setter.call(editor, text);
        } else {
            editor.value = text;
        }
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
        return;
    }

    // Modern rich-text editors (Gemini, Claude, ChatGPT)
    document.execCommand('selectAll', false, null);
    const inserted = document.execCommand('insertText', false, text);
    if (!inserted || editor.innerText.trim() === '') {
        editor.innerText = text;
        editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    }
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));

    // Fallback if editor still empty (framework virtualization)
    if (!editor.innerText || editor.innerText.trim() === '') {
        editor.textContent = text;
        editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    }
}

function extractCleanResponse(element) {
    if (!element) return "";
    const clone = element.cloneNode(true);

    // Remove thinking / reasoning accordions from Gemini, Claude, DeepSeek
    const thoughtSelectors = [
        '.thinking-process',
        '.ds-markdown--thought',
        'details',
        '[data-testid="thought-content"]',
        '.thought-container',
        '.model-thought',
        'collapsible-panel'
    ];
    for (const sel of thoughtSelectors) {
        clone.querySelectorAll(sel).forEach(el => el.remove());
    }

    // Remove UI decorators (copy buttons, code headers)
    const uiDecorators = [
        'button',
        '.code-header',
        '[data-testid="copy-code-button"]',
        '[aria-label*="Copy"]',
        '.copy-button'
    ];
    for (const sel of uiDecorators) {
        clone.querySelectorAll(sel).forEach(el => el.remove());
    }

    return clone.innerText.trim();
}

async function askWebProvider(text) {
    const editor = document.querySelector(provider.input);
    if (!editor) return `Error: Input box not found on ${provider.name}. Please open a fresh chat session.`;

    const initialCount = document.querySelectorAll(provider.response).length;

    fillInputBox(editor, text);

    // Wait up to 1.5s for modern frameworks (Angular/React) to update button ready state
    let sendBtn = null;
    for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 250));
        sendBtn = document.querySelector(provider.sendBtn) ||
                  document.querySelector('button[aria-label*="Send" i]') ||
                  document.querySelector('button[aria-label*="Envoyer" i]') ||
                  document.querySelector('button.send-button') ||
                  document.querySelector('.send-button-container button');

        if (sendBtn && !sendBtn.disabled && sendBtn.getAttribute('aria-disabled') !== 'true') {
            break;
        }
    }

    if (sendBtn && !sendBtn.disabled && sendBtn.getAttribute('aria-disabled') !== 'true') {
        sendBtn.click();
    } else {
        editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    }

    return new Promise((resolve) => {
        let lastText = "";
        let stableCount = 0;
        let totalSeconds = 0;
        const MAX_WAIT_SECONDS = 600; // 10 minutes max for heavy reasoning models

        const checkInterval = setInterval(() => {
            totalSeconds++;
            const responses = document.querySelectorAll(provider.response);
            if (responses.length <= initialCount) {
                if (totalSeconds > 35) {
                    clearInterval(checkInterval);
                    resolve(`Error: Generation did not start on ${provider.name} after 35 seconds. Check if there is a rate limit or captcha.`);
                }
                return;
            }

            const targetElement = responses[responses.length - 1];
            const isStillStreaming = provider.stopBtn ? document.querySelector(provider.stopBtn) !== null : false;
            const latestResponse = extractCleanResponse(targetElement);

            if (!isStillStreaming && latestResponse.length > 0 && latestResponse === lastText) {
                stableCount++;
                if (stableCount >= 4) {
                    clearInterval(checkInterval);
                    resolve(latestResponse);
                }
            } else {
                lastText = latestResponse;
                stableCount = 0;
            }

            if (totalSeconds >= MAX_WAIT_SECONDS) {
                clearInterval(checkInterval);
                resolve(latestResponse.length > 0 ? latestResponse : `Error: Generation timed out after ${MAX_WAIT_SECONDS} seconds.`);
            }
        }, 1000);
    });
}
