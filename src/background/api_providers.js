
async function retryWithBackoff(fn, retries = 3, delay = 1000) {
    try {
        return await fn();
    } catch (err) {
        if (retries === 0) throw err;
        console.warn(`Retrying... attempts left: ${retries}. Error: ${err.message}`);
        await new Promise(r => setTimeout(r, delay));
        return retryWithBackoff(fn, retries - 1, delay * 2);
    }
}

async function callOpenAI(apiKey, imageBase64, prompt) {
    return retryWithBackoff(() => callOpenAICompatible(apiKey, imageBase64, prompt, 'https://api.openai.com/v1/chat/completions', "gpt-4-turbo"));
}

async function callOpenAICompatible(apiKey, imageBase64, prompt, startUrl, model) {
    const response = await fetch(startUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                {
                    role: "system",
                    content: prompt
                },
                {
                    role: "user",
                    content: [
                        { type: "image_url", image_url: { url: imageBase64 } }
                    ]
                }
            ],
            max_tokens: 500
        })
    });

    const json = await response.json();
    if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));

    // Parse JSON from content
    const content = json.choices[0].message.content;
    return parseAIResponse(content);
}

async function callGemini(apiKey, imageBase64, prompt, model) {
    // Model fallback
    const modelName = model || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    // Detect Mime Type
    const match = imageBase64.match(/^data:(image\/\w+);base64,/);
    const mimeType = match ? match[1] : "image/jpeg";

    // Clean base64 header
    const base64Clean = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    console.log(`[Gemini] Sending image. Mime: ${mimeType}, Size: ${base64Clean.length}`);

    const response = await retryWithBackoff(() => fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: base64Clean
                        }
                    }
                ]
            }],
            generationConfig: {
                response_mime_type: "application/json"
            }
        })
    }));

    const json = await response.json();
    if (json.error) throw new Error(json.error.message);

    const text = json.candidates[0].content.parts[0].text;
    return parseAIResponse(text);
}

async function callAnthropic(apiKey, imageBase64, prompt) {
    // Remove data:image/jpeg;base64, prefix for Anthropic
    const base64Clean = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const response = await retryWithBackoff(() => fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            model: "claude-3-haiku-20240307", // Faster/Cheaper
            max_tokens: 1024,
            system: prompt,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: "image/jpeg",
                                data: base64Clean
                            }
                        },
                        {
                            type: "text",
                            text: "Analyze this image."
                        }
                    ]
                }
            ]
        })
    }));

    const json = await response.json();
    if (json.error) throw new Error(json.error.message);

    return parseAIResponse(json.content[0].text);
}

function parseAIResponse(text) {
    // Attempt to find JSON format
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);

            // Sanitize Keywords if present
            if (data.keywords && Array.isArray(data.keywords)) {
                data.keywords = [...new Set(data.keywords
                    .map(k => k.toLowerCase().replace(/[^\w\s-]/g, '').trim()) // Remove unwanted chars (keep word chars, spaces, hyphens)
                    .filter(k => k.length > 2 && k.length < 50) // Length limits
                )];
            }
            return data;
        }
    } catch (e) {
        console.warn("Could not parse JSON", e);
    }
    return { raw: text };
}

module.exports = {
    callOpenAI,
    callOpenAICompatible,
    callGemini,
    callAnthropic
};
