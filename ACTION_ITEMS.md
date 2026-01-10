# Action Items - Shutterstock AI Agent

## 🔴 Critical (Required for Chrome Web Store)
- [ ] **Create Privacy Policy** - Required for store submission
  - Explain API key storage (chrome.storage.local)
  - Describe data sent to AI providers (images + prompt)
  - Clarify no data collection/tracking
  - Template: https://www.freeprivacypolicy.com/

- [ ] **Prepare Store Listing Assets**
  - [ ] Icon (128x128, 48x48, 16x16)
  - [ ] Screenshots (1280x800 or 640x400)
  - [ ] Promotional tile (440x280)
  - [ ] Store description (detailed)

## 🟡 High Priority (v1.1)
- [ ] **Extract timing constants** to configuration object
  ```javascript
  const TIMING = {
    SIDEBAR_UPDATE_WAIT: 2500,
    AUTOSAVE_WAIT: 1500,
    DROPDOWN_CLOSE_DELAY: 500
  };
  ```

- [ ] **Add JSDoc comments** to public functions
  - `processCurrentImage()`
  - `startBatchProcessing()`
  - `applyMetadata()`
  - All dom_heuristics.js functions

- [ ] **Reduce host_permissions scope** in manifest.json
  ```json
  "host_permissions": [
    "https://submit.shutterstock.com/*",
    "https://generativelanguage.googleapis.com/*",
    "https://api.openai.com/*",
    "https://api.anthropic.com/*"
  ]
  ```

- [ ] **Add speed mode setting** (Fast/Safe/Custom)
  - Let users configure wait times
  - Default to "Safe" (current timings)

## 🟢 Medium Priority (v1.2)
- [ ] **Split content.js** into modules
  - `batch-processor.js`
  - `metadata-applier.js`
  - `ui-overlay.js`
  - `sentinel.js` (sidebar watcher)

- [ ] **Add processing statistics**
  - Total images processed
  - Success rate
  - Average processing time
  - Failed images list

- [ ] **Batch resume functionality**
  - Save progress to storage
  - Resume after page refresh
  - Skip already-processed images

- [ ] **Dynamic category list**
  - Fetch from Shutterstock if possible
  - Or make configurable in settings
  - Auto-update check

## 🔵 Low Priority (Future)
- [ ] **Add automated tests**
  - Jest for unit tests
  - Puppeteer for integration tests
  - Test AI response parsing
  - Test DOM element detection

- [ ] **Create architecture diagram**
  - Message flow (popup → content → background)
  - AI provider selection logic
  - Batch processing sequence

- [ ] **Template system**
  - Save metadata templates
  - Load templates per category/type
  - Share templates (export/import JSON)

- [ ] **AI model comparison**
  - Track which model works best
  - Show accuracy stats per provider
  - Recommend optimal model

- [ ] **Firefox support**
  - Port to WebExtensions
  - Test on Firefox Developer Edition
  - Submit to Firefox Add-ons

## ⚡ Quick Fixes (Can do now)
- [ ] **Add version number to overlay UI**
  ```javascript
  header.innerHTML = `<span>Shutterstock AI Agent v1.0.0</span>`;
  ```

- [ ] **Add keyboard shortcut** for starting batch
  ```json
  "commands": {
    "start-batch": {
      "suggested_key": { "default": "Ctrl+Shift+B" },
      "description": "Start batch processing"
    }
  }
  ```

- [ ] **Add progress indicator** to overlay
  ```javascript
  log(`Processing ${current}/${total} images...`);
  ```

- [ ] **Add sound notification** on completion (optional)
  ```javascript
  new Audio('data:audio/wav;base64,...').play();
  ```

## 📝 Documentation Tasks
- [ ] Add API response schema examples to README
- [ ] Create CONTRIBUTING.md
- [ ] Add LICENSE file (currently ISC mentioned but no file)
- [ ] Create troubleshooting guide
- [ ] Add video demo/tutorial
- [ ] Create developer setup guide

---

## Priority Order for Next Release (v1.1)

1. ✅ Privacy Policy (BLOCKER)
2. ✅ Store Assets (BLOCKER)
3. Extract timing constants
4. Add JSDoc comments
5. Reduce host permissions
6. Add speed mode setting
7. Add progress indicator
8. Add version to UI

**Estimated Time:** 4-6 hours for v1.1
**Target:** Chrome Web Store submission
