# Shutterstock AI Agent

**Automate your Shutterstock Portfolio metadata with the power of AI.**

This Chrome Extension acts as an intelligent agent to automatically analyze your Shutterstock uploads, generate SEO-optimized titles and keywords, and fill in categories and image types—all in batch mode.

## 🚀 Key Features

*   **🤖 AI-Powered Analysis**: Seamlessly integrates with **Google Gemini** (Recommended) or OpenAI to analyze image content.
*   **🔄 Robust Batch Processing**: One-click automation that iterates through your entire 100+ image backlog.
*   **🛡️ Smart UI Handling**:
    *   **Auto-Sidebar Dismissal**: Automatically detects and closes the "Welcome to Shutterstock" tour popups.
    *   **Accidental Click Prevention**: "Safety Rails" prevent the agent from clicking headers, footers, or user profiles.
    *   **Auto-Recovery**: Detects navigation failures and retries intelligently.
*   **📝 Metadata Automation**:
    *   **Title**: SEO-friendly titles (optimized for Shutterstock's 200-char limit).
    *   **Keywords**: Genreates 30-50 relevant, high-ranking tags.
    *   **Categories**: Intelligent mapping to Shutterstock's specific Category list.
    *   **Image Type**: Auto-detects "Photo" vs "Illustration".
*   **🔒 Privacy Focused**: Your API Key is stored securely in your browser's local storage.

## 🛠️ Installation

1.  **Clone or Download** this repository.
    ```bash
    git clone https://github.com/Toufi-Moki/shutterstock-Ai-Agent.git
    cd shutterstock-Ai-Agent
    ```
2.  **Install Dependencies & Build**:
    ```bash
    npm install
    npm run build
    ```
    *This compiles the React/JS code into the `dist/` folder.*

3.  **Load into Chrome**:
    *   Open `chrome://extensions/`.
    *   Enable **Developer mode** (top right switch).
    *   Click **Load unpacked**.
    *   Select the **project root folder** (the one containing `manifest.json`).

## ⚙️ Usage

1.  **Setup Keys**:
    *   Click the extension icon 🧩 > **Options**.
    *   Select **Gemini** as provider.
    *   Enter your **API Key** (Get one from [Google AI Studio](https://aistudio.google.com/)).
    *   Select Model (Recommended: `gemini-1.5-flash` or `gemini-2.0-flash-exp`).
    *   Click **Save**.

2.  **Start Automating**:
    *   Go to your [Shutterstock Content Editor](https://submit.shutterstock.com/portfolio/not_submitted).
    *   You will see the **Shutterstock AI Agent** overlay in the bottom right.
    *   Click **"Process Batch"**.
    *   Sit back! The agent will process images sequentially. ☕

## 🔧 Troubleshooting

*   **Sidebar appearing?** The agent is designed to auto-close the "Welcome" tour. If it blinks for a second, that is normal behavior.
*   **Process stops?** The agent waits for autosave (1.5s) between images. If it stops completely, check your internet or refresh the page.
*   **"Context Invalidated"?** This happens if you reload the extension while the page is open. Just refresh the web page.

## 📝 License

ISC License.
