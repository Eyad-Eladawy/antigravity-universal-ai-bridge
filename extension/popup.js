const SUPPORTED_HOSTS = {
  "gemini.google.com": "Google Gemini",
  "aistudio.google.com": "Google AI Studio",
  "claude.ai": "Claude",
  "chatgpt.com": "ChatGPT",
  "chat.openai.com": "ChatGPT",
  "chat.deepseek.com": "DeepSeek"
};

document.addEventListener("DOMContentLoaded", async () => {
  const statusBadge = document.getElementById("tab-status");
  const statusText = document.getElementById("tab-status-text");
  const providerLabel = document.getElementById("tab-provider");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      statusText.innerText = "No tab active";
      providerLabel.innerText = "Open a supported AI tab below.";
      return;
    }

    const url = new URL(tab.url);
    const matchedHost = Object.keys(SUPPORTED_HOSTS).find(host => url.hostname.includes(host));

    if (matchedHost) {
      statusBadge.className = "badge badge-connected";
      statusText.innerText = "Supported Tab";
      providerLabel.innerText = `${SUPPORTED_HOSTS[matchedHost]} tab is active. Click the floating badge on page to dedicate!`;
    } else {
      statusBadge.className = "badge badge-standby";
      statusText.innerText = "Not on AI Tab";
      providerLabel.innerText = "Navigate to a supported AI site below.";
    }
  } catch (e) {
    statusText.innerText = "Ready";
    providerLabel.innerText = "Open a supported AI tab to begin.";
  }
});

