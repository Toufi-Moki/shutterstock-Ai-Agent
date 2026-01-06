# Shutterstock AI Agent

**Automate your Shutterstock Portfolio metadata with the power of AI.**

This Chrome Extension acts as an intelligent agent to automatically analyze your Shutterstock uploads, generate SEO-optimized titles and keywords, and fill in categories and image types—all in batch mode.

## 🚀 Features

*   **AI-Powered Analysis**: Uses **Google Gemini** (or OpenAI) to analyze images.
*   **Batch Processing**: Automatically navigates through your "Pending" queue, processing images one by one.
*   **Smart Navigation**: Robustly handles Shutterstock's UI, including "Next" button detection, infinite scrolling, and race condition prevention.
*   **Duplicate Protection**: Detects if navigation fails and retries intelligently using "Double Tap" and keyboard fallbacks.
*   **Metadata Automation**:
    *   **Title**: Generates descriptive, SEO-friendly titles (200 chars max).
    *   **Keywords**: Generates 30-50 relevant tags.
    *   **Categories**: Automatically selects the best matching Categories (1 & 2).
    *   **Image Type**: Auto-detects "Photo" vs "Illustration".
*   **Privacy Focused**: Your API Key is stored locally in your browser (`chrome.storage.local`).

## 🛠️ Installation

1.  **Clone or Download** this repository.
    ```bash
    git clone https://github.com/Toufi-Moki/shutterstock-Ai-Agent.git
    cd shutterstock-Ai-Agent
    ```
2.  **Install Dependencies** (if building from source):
    ```bash
    npm install
    npm run build
    ```
    *Note: The `dist` folder is pre-built if you just want to use it.*

3.  **Load into Chrome**:
    *   Open `chrome://extensions/`.
    *   Enable **Developer mode** (top right).
    *   Click **Load unpacked**.
    *   Select the folder containing `manifest.json`.

## ⚙️ Usage

1.  **Configuration**:
    *   Click the extension icon in your toolbar.
    *   Open **Options/Settings**.
    *   Enter your **Gemini API Key** (or OpenAI Key).
    *   Select your Model (e.g., `gemini-1.5-flash`).
    *   Click Save.

2.  **Run Batch**:
    *   Go to your [Shutterstock Content Editor](https://submit.shutterstock.com/portfolio/not_submitted).
    *   Click the **"Process Batch"** button that appears on the overlay (bottom right).
    *   Sit back and watch the agent work! ☕

## 🔧 Troubleshooting

*   **"Stuck" on an image?**: The agent uses smart heuristics to retry. If it persists, checking your internet connection usually helps.
*   **"Context Invalidated"**: If you update the extension, refresh the Shutterstock page.

## 📝 License

ISC License.
