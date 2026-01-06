const { callGemini, callOpenAI } = require('./api_providers');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'generate_metadata') {
        const { imageUrl, apiKey, aiProvider, systemPrompt, geminiModel } = request.data;

        console.log(`[Background] Processing request for provider: ${aiProvider}`);
        console.log(`[Background] Key: ${apiKey ? apiKey.substring(0, 6) + '...' : 'undefined'}, Model: ${geminiModel}`);

        // Helper to convert URL to Base64 (because Gemini needs inline data, and OpenAI is safer with it)
        const fetchImage = async (url) => {
            if (url.startsWith('data:')) return url; // Already base64
            try {
                const res = await fetch(url);
                const blob = await res.blob();
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } catch (err) {
                console.error("Failed to fetch image for base64 conversion:", err);
                throw new Error("Failed to download image from URL: " + err.message);
            }
        };

        fetchImage(imageUrl)
            .then(base64Data => {
                let promise;
                if (aiProvider === 'openai') {
                    promise = callOpenAI(apiKey, base64Data, systemPrompt);
                } else {
                    // Default to Gemini
                    promise = callGemini(apiKey, base64Data, systemPrompt, geminiModel);
                }
                return promise;
            })
            .then(data => {
                console.log("[Background] AI Success:", data);
                sendResponse({ success: true, data: data });
            })
            .catch(error => {
                console.error("[Background] AI Error:", error);
                sendResponse({ success: false, error: error.message });
            });

        return true; // Keep channel open for async response
    }

    if (request.action === 'test_connection') {
        const { apiKey, provider, geminiModel } = request.data;
        console.log(`[Background] Testing connection for ${provider}...`);

        let promise;
        // Use a tiny prompt to test
        const testPrompt = "Reply with 'OK'";
        // Use a 1x1 pixel base64 image shim for testing since our APIs require image structure
        const pixelShim = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

        if (provider === 'openai') {
            promise = callOpenAI(apiKey, pixelShim, testPrompt);
        } else {
            // Default to Gemini (using the user's selected model)
            promise = callGemini(apiKey, pixelShim, testPrompt, geminiModel);
        }

        promise
            .then(data => {
                sendResponse({ success: true, data: data });
            })
            .catch(error => {
                sendResponse({ success: false, error: error.message });
            });

        return true;
    }
});
