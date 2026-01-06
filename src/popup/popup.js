require('./popup.css');

// ExtensionPay Boilerplate (Simulated)
// import ExtPay from 'extensionpay'; // Un-comment when installed
// const extpay = ExtPay('shutterstock-ai-agent'); // Replace with your extension ID

const { MODEL_LISTS } = require('../options/model_lists');
// Since model_lists is in ../options, let's verify path.
// Actually, let's just inline or specific import logic. 
// Given folder structure: src/popup/popup.js and src/options/model_lists.js
// Path should be '../options/model_lists'.

document.addEventListener('DOMContentLoaded', () => {
    // Tab Switching
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    // Load Settings
    loadSettings();

    // Event Listeners
    document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
    document.getElementById('save-keys-btn').addEventListener('click', saveKeys);
    document.getElementById('process-current-btn').addEventListener('click', processCurrent);
    document.getElementById('batch-process-btn').addEventListener('click', processBatch);

    // Dynamic Dropdown
    document.getElementById('ai-provider').addEventListener('change', updateModelDropdown);
});

function updateModelDropdown() {
    const provider = document.getElementById('ai-provider').value;
    const modelSelect = document.getElementById('gemini-model'); // Reused ID for simplicity
    const currentVal = modelSelect.value;

    modelSelect.innerHTML = '';

    const models = MODEL_LISTS[provider] || [];
    models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.value;
        opt.textContent = m.label;
        modelSelect.appendChild(opt);
    });

    if (models.some(m => m.value === currentVal)) {
        modelSelect.value = currentVal;
    }
}

function loadSettings() {
    chrome.storage.local.get([
        'systemPrompt', 'autoAiCheck', 'autoNoPeople', 'aiProvider', 'apiKey', 'geminiModel', 'trialCount'
    ], (items) => {
        if (items.systemPrompt) document.getElementById('system-prompt').value = items.systemPrompt;
        if (items.aiProvider) document.getElementById('ai-provider').value = items.aiProvider;
        if (items.apiKey) document.getElementById('api-key').value = items.apiKey;

        updateModelDropdown();

        if (items.geminiModel && MODEL_LISTS[items.aiProvider]?.some(m => m.value === items.geminiModel)) {
            document.getElementById('gemini-model').value = items.geminiModel;
        }

        // Default trial count
        const count = items.trialCount !== undefined ? items.trialCount : 100;
        updateTrialData(count);
    });
}

function saveSettings() {
    const settings = {
        systemPrompt: document.getElementById('system-prompt').value
    };
    chrome.storage.local.set(settings, () => {
        showStatus('Settings Saved!');
    });
}

function saveKeys() {
    const keys = {
        aiProvider: document.getElementById('ai-provider').value,
        apiKey: document.getElementById('api-key').value,
        geminiModel: document.getElementById('gemini-model').value
    };
    chrome.storage.local.set(keys, () => {
        showStatus('Keys Saved!');
    });
}

function updateTrialData(count) {
    const counterEl = document.getElementById('trial-counter');
    counterEl.textContent = `Free Uses: ${count}/100`;

    if (count <= 0) {
        document.getElementById('batch-process-btn').disabled = true;
        document.getElementById('batch-process-btn').textContent = "Upgrade to Batch Process";
        // Check payment status here if using ExtensionPay
    }
}

function processCurrent() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'process_image' });
            showStatus('Processing started...');
            decrementTrial();
        }
    });
}

function processBatch() {
    chrome.storage.local.get(['trialCount'], (items) => {
        const count = items.trialCount !== undefined ? items.trialCount : 100;
        if (count <= 0) {
            // extpay.openPaymentPage(); 
            alert("Trial expired. Please upgrade.");
            return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'process_batch' });
                showStatus('Batch Processing started...');
                decrementTrial();
            }
        });
    });
}

function decrementTrial() {
    chrome.storage.local.get(['trialCount'], (items) => {
        let count = items.trialCount !== undefined ? items.trialCount : 100;
        if (count > 0) {
            count--;
            chrome.storage.local.set({ trialCount: count });
            updateTrialData(count);
        }
    });
}

function showStatus(msg) {
    const el = document.getElementById('status-display');
    el.textContent = msg;
    setTimeout(() => {
        el.textContent = 'Ready';
    }, 3000);
}
