const { MODEL_LISTS } = require('./model_lists');

document.addEventListener('DOMContentLoaded', () => {
    restoreOptions();
    document.getElementById('ai-provider').addEventListener('change', updateModelDropdown);
});
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('test-connection').addEventListener('click', testConnection);

function updateModelDropdown() {
    const provider = document.getElementById('ai-provider').value;
    const modelSelect = document.getElementById('gemini-model');
    const currentVal = modelSelect.value;

    // Clear
    modelSelect.innerHTML = '';

    const models = MODEL_LISTS[provider] || [];
    models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.value;
        opt.textContent = m.label;
        modelSelect.appendChild(opt);
    });

    // Try to restore value if applicable
    if (models.some(m => m.value === currentVal)) {
        modelSelect.value = currentVal;
    }
}

function saveOptions() {
    const provider = document.getElementById('ai-provider').value;
    const key = document.getElementById('api-key').value;
    const geminiModel = document.getElementById('gemini-model').value;

    chrome.storage.local.set({
        aiProvider: provider,
        apiKey: key,
        geminiModel: geminiModel
    }, () => {
        const status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(() => {
            status.textContent = '';
        }, 1500);
    });
}

function restoreOptions() {
    chrome.storage.local.get({
        aiProvider: 'openai',
        apiKey: '',
        geminiModel: 'gpt-4-turbo'
    }, (items) => {
        document.getElementById('ai-provider').value = items.aiProvider;
        document.getElementById('api-key').value = items.apiKey;

        // Populate models first based on restored provider
        updateModelDropdown();

        // Then set value
        const modelSelect = document.getElementById('gemini-model');
        // If the saved model exists in the list, select it. 
        // Otherwise, it defaults to the first one (which is fine).
        // Since we just repopulated, we can try setting it.
        // We need a slight delay or just check if it's in the list logic above.
        // Actually updateModelDropdown handles list generation. We just set value.
        // But we need to make sure the list contains it.
        if (MODEL_LISTS[items.aiProvider]?.some(m => m.value === items.geminiModel)) {
            document.getElementById('gemini-model').value = items.geminiModel;
        }
    });
}
document.getElementById('test-connection').addEventListener('click', testConnection);

async function testConnection() {
    const provider = document.getElementById('ai-provider').value;
    const key = document.getElementById('api-key').value;
    const geminiModel = document.getElementById('gemini-model').value;
    const resultEl = document.getElementById('test-result');

    resultEl.style.display = 'block';
    resultEl.style.background = '#2c2e33';
    resultEl.textContent = 'Testing connection...';

    if (!key) {
        resultEl.style.background = '#e74c3c';
        resultEl.textContent = 'Error: Please enter an API Key first.';
        return;
    }

    try {
        const response = await chrome.runtime.sendMessage({
            action: 'test_connection',
            data: {
                provider: provider,
                apiKey: key,
                geminiModel: geminiModel
            }
        });

        if (response.success) {
            resultEl.style.background = '#2ecc71';
            resultEl.style.color = '#fff';
            resultEl.textContent = 'Success! Connection verified.';
        } else {
            resultEl.style.background = '#e74c3c';
            resultEl.textContent = 'Connection Failed: ' + (response.error || 'Unknown error');
        }
    } catch (e) {
        resultEl.style.background = '#e74c3c';
        resultEl.textContent = 'Error: ' + e.message;
    }
}
