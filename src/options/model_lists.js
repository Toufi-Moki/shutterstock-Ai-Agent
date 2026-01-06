const MODEL_LISTS = {
    openai: [
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'gpt-4-vision-preview', label: 'GPT-4 Vision' }
    ],
    anthropic: [
        { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
        { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
        { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' }
    ],
    gemini: [
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
        { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash Exp' },
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
        { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash-8b' }
    ],
    deepseek: [
        { value: 'deepseek-chat', label: 'DeepSeek Chat' }
    ]
};

module.exports = { MODEL_LISTS };
