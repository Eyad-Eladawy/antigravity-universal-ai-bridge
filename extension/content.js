const PROVIDERS = {
    "gemini.google.com": {
        name: "Gemini",
        input: 'div.ql-editor[contenteditable="true"], div[contenteditable="true"][role="textbox"]',
        sendBtn: 'button.send-button, button[aria-label*="Send"]',
        response: 'message-content, .model-response-text',
        stopBtn: 'button[aria-label*="Stop"]'
    },
    "claude.ai": {
        name: "Claude",
        input: 'div.ProseMirror[contenteditable="true"], fieldset div[contenteditable="true"]',
        sendBtn: 'button[aria-label*="Send"]',
        response: '.font-claude-message, .font-claude-response, [data-testid="chat-message-content"]',
        stopBtn: 'button[aria-label*="Stop"]'
    },
    "chatgpt.com": {
        name: "ChatGPT",
        input: '#prompt-textarea, div[contenteditable="true"]#prompt-textarea',
        sendBtn: 'button[data-testid="send-button"], button[aria-label*="Send"]',
        response: 'div[data-message-author-role="assistant"]',
        stopBtn: 'button[data-testid="stop-button"]'
    },
    "chat.deepseek.com": {
        name: "DeepSeek",
        input: 'textarea#chat-input, textarea',
        sendBtn: 'div[role="button"][aria-disabled="false"], button[type="submit"]',
        response: '.ds-markdown',
        stopBtn: null
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
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0,0,0,0.45);
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  user-select: none;
`;

const statusLabel = document.createElement('div');
statusLabel.style.cssText = `
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.2px;
`;

const watermarkLabel = document.createElement('div');
watermarkLabel.innerText = 'Powered by Trignod.ai';
watermarkLabel.style.cssText = `
  font-size: 10px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.65);
  letter-spacing: 0.4px;
`;

statusBtn.appendChild(statusLabel);
statusBtn.appendChild(watermarkLabel);
updateUI('standby');
document.body.appendChild(statusBtn);

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
    isTabDedicated = !isTabDedicated;
    if (isTabDedicated) {
        connectBridge();
    } else {
        clearTimeout(retryTimer);
        if (ws) ws.close();
        ws = null;
        updateUI('standby');
    }
});

function connectBridge() {
    if (!isTabDedicated) return;
    updateUI('connecting');

    ws = new WebSocket('ws://localhost:4545');

    ws.onopen = () => updateUI('connected');

    ws.onmessage = async(event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'replaced') {
            isTabDedicated = false;
            clearTimeout(retryTimer);
            updateUI('standby');
            return;
        }

        if (data.type === 'check_session') {
            const existingResponses = document.querySelectorAll(provider.response).length;
            ws.send(JSON.stringify({
                isEmptyChat: existingResponses === 0,
                chatKey: window.location.origin + window.location.pathname
            }));
            return;
        }

        updateUI('working');
        const reply = await askWebProvider(data.prompt);
        ws.send(JSON.stringify({ reply }));
        updateUI('connected');
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
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setter.call(editor, text);
        editor.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
        document.execCommand('selectAll', false, null);
        const inserted = document.execCommand('insertText', false, text);
        if (!inserted) {
            editor.innerText = text;
            editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
        }
    }
}

async function askWebProvider(text) {
    const editor = document.querySelector(provider.input);
    if (!editor) return `Error: Input box not found on ${provider.name}. Please open a fresh chat session.`;

    const initialCount = document.querySelectorAll(provider.response).length;

    fillInputBox(editor, text);
    await new Promise(r => setTimeout(r, 700));

    const sendBtn = document.querySelector(provider.sendBtn);
    if (sendBtn && !sendBtn.disabled) {
        sendBtn.click();
    } else {
        editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    }

    return new Promise((resolve) => {
        let lastText = "";
        let stableCount = 0;

        const checkInterval = setInterval(() => {
            const responses = document.querySelectorAll(provider.response);
            if (responses.length <= initialCount) return;

            const isStillStreaming = provider.stopBtn ? document.querySelector(provider.stopBtn) !== null : false;
            const latestResponse = responses[responses.length - 1].innerText.trim();

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
        }, 1000);
    });
}