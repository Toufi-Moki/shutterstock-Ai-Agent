const { findMainImage, findTitleInput, findKeywordsInput, findCategory1, findCategory2, findImageTypeInput, findNextButton } = require('./dom_heuristics');

// Overlay Management
let overlay = null;
let logContainer = null;

function createOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'shutterstock-ai-overlay';
    overlay.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 350px;
    background: rgba(15, 23, 42, 0.95);
    color: #e2e8f0;
    padding: 16px;
    border-radius: 12px;
    z-index: 2147483647; /* Max z-index */
    font-family: 'Segoe UI', system-ui, sans-serif;
    font-size: 13px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    border: 1px solid rgba(255,255,255,0.1);
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
  `;

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;';
    // Spinner
    const spinner = document.createElement('div');
    spinner.id = 'sa-spinner';
    spinner.style.cssText = 'display: none; width: 20px; height: 20px; border: 2px solid #38bdf8; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 10px;';

    // Add keyframe for spin
    const style = document.createElement('style');
    style.innerHTML = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
    document.head.appendChild(style);

    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.alignItems = 'center';

    const stopBtn = document.createElement('button');
    stopBtn.innerText = 'Stop';
    stopBtn.id = 'sa-stop-btn';
    stopBtn.style.cssText = 'background: #ef4444; border: none; color: white; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer; display: none; margin-right: 10px;';

    const batchBtn = document.createElement('button');
    batchBtn.innerText = 'Process Batch';
    batchBtn.id = 'sa-batch-btn';
    batchBtn.style.cssText = 'background: #8b5cf6; border: none; color: white; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer; margin-right: 10px;';
    batchBtn.onclick = () => startBatchProcessing();

    controls.appendChild(spinner);
    controls.appendChild(stopBtn);
    controls.appendChild(batchBtn);

    const closeBtn = document.createElement('button');
    closeBtn.innerText = '×';
    closeBtn.style.cssText = 'background: none; border: none; color: #94a3b8; font-size: 20px; cursor: pointer; padding: 0 5px;';
    closeBtn.onclick = () => overlay.style.display = 'none';

    controls.appendChild(closeBtn);
    header.appendChild(controls);

    logContainer = document.createElement('div');
    logContainer.style.cssText = 'max-height: 200px; overflow-y: auto; font-family: monospace; line-height: 1.4;';
    logContainer.id = 'sa-logs';
    logContainer.innerText = 'Waiting for command...';

    overlay.appendChild(header);
    overlay.appendChild(logContainer);
    document.body.appendChild(overlay);
}

function log(msg, type = 'info') {
    if (!overlay) createOverlay();
    if (overlay.style.display === 'none') overlay.style.display = 'block';

    const msgEl = document.createElement('div');
    msgEl.style.marginBottom = '4px';

    if (type === 'error') msgEl.style.color = '#ef4444';
    else if (type === 'success') msgEl.style.color = '#22c55e';
    else msgEl.style.color = '#cbd5e1';

    msgEl.innerText = `> ${msg} `;
    logContainer.appendChild(msgEl);
    logContainer.scrollTop = logContainer.scrollHeight;
    console.log(`[Shutterstock AI] ${msg} `);
}

// Messaging
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'process_image') {
        processCurrentImage();
    } else if (request.action === 'process_batch') {
        log("Batch processing not yet fully implemented.", 'error');
    } else if (request.action === 'ping') {
        console.log("Content script pinged");
        sendResponse({ status: "alive" });
    }
});

let isProcessing = false;

async function processCurrentImage(fromBatch = false) {
    if (!checkExtensionContext()) return;
    createOverlay();

    if (isProcessing && !fromBatch) {
        log("Already processing...", 'error');
        return;
    }

    if (!fromBatch) isProcessing = true;
    const stopBtn = document.getElementById('sa-stop-btn');
    const batchBtn = document.getElementById('sa-batch-btn');
    const spinner = document.getElementById('sa-spinner');

    if (stopBtn) {
        stopBtn.style.display = 'block';
        stopBtn.onclick = () => {
            log("Stopped by user.", 'error');
            isProcessing = false;
            stopBtn.style.display = 'none';
            if (batchBtn) batchBtn.style.display = 'block';
            spinner.style.display = 'none';
        };
    }
    if (spinner) spinner.style.display = 'block';
    if (batchBtn) batchBtn.style.display = 'none'; // Hide batch button while processing

    log("Starting analysis...", 'info');

    // 1. Find Image
    const imgElement = findMainImage(log);
    if (!imgElement) {
        log("Error: Could not find ANY large image (>100px) on page.", 'error');
        // Debug: log all images count
        log(`DEBUG: Total images on page: ${document.querySelectorAll('img').length} `);
        resetState();
        return;
    }
    // Improved Regex: Match first 7+ digit number (Shutterstock ID)
    const imageIdMatch = imgElement.src.match(/(\d{7,})/) || imgElement.src.match(/(\d+)\./);
    const imageId = imageIdMatch ? imageIdMatch[1] : "unknown";
    log(`Found image: ${imgElement.src.substring(0, 30)}... (ID: ${imageId})`, 'success');

    // 1.1 DUPLICATE PROTECTION (Batch Mode)
    // If we are seeing the exact same image ID as the last one we processed, it means navigation FAILED.
    // We must manually FORCE the URL to the target ID we found earlier.
    // 1.1 DUPLICATE PROTECTION (Batch Mode)
    // If we are seeing the exact same image ID as the last one we processed, it means navigation FAILED.
    if (fromBatch && window._lastProcessedId && imageId === window._lastProcessedId) {
        const attempts = window._dupAttempts || 0;

        // If we don't have a known target, try to find it NOW
        if (!window._targetNextId) {
            const mainImg = findMainImage(() => { });
            // Quick re-scan for next thumb
            if (mainImg) {
                const allImgs = Array.from(document.querySelectorAll('img'));
                const myIdx = allImgs.findIndex(i => i.src.includes(imageId));
                if (myIdx !== -1 && myIdx < allImgs.length - 1) {
                    const next = allImgs[myIdx + 1];
                    // Only trust it if it's large enough/visible
                    if (next.width > 40) window._targetNextId = next.src.match(/(\d+)\./) ? next.src.match(/(\d+)\./)[1] : null;
                }
            }
        }

        if (attempts < 2) {
            log(`Navigation failed! Stuck on image ${imageId}. Retrying hard click (Attempt ${attempts + 1})...`, 'warn');
            window._dupAttempts = attempts + 1;

            // Strategy: Find ANY other thumbnail that isn't me
            let targetSelector = window._targetNextId ? `img[src*="${window._targetNextId}"]` : null;
            let thumb = targetSelector ? document.querySelector(targetSelector) : null;

            if (!thumb && !window._targetNextId) {
                // Hail Mary: Just find the image element in the DOM that matches current ID and click the NEXT image in DOM order
                const allImgs = Array.from(document.querySelectorAll('img'));
                const myRef = allImgs.find(i => i.src.includes(imageId));
                if (myRef) {
                    const myIdx = allImgs.indexOf(myRef);
                    if (myIdx < allImgs.length - 1) thumb = allImgs[myIdx + 1];
                }
            }

            if (!thumb) {
                // SUPER HAIL MARY: Dispatch "Arrow Right" keyboard event to the body
                // This mimics the user pressing the Right Arrow key, which almost always navigates in Shutterstock Editor
                log("Fallback: Dispatching 'ArrowRight' keyboard event...", 'warn');
                const keyEvent = new KeyboardEvent('keydown', {
                    key: 'ArrowRight', code: 'ArrowRight', keyCode: 39,
                    which: 39, bubbles: true, cancelable: true, view: window
                });
                document.body.dispatchEvent(keyEvent);
                document.documentElement.dispatchEvent(keyEvent);

                await new Promise(r => setTimeout(r, 2000));
                return;
            }

            if (thumb) {
                log("Found fallback thumbnail to click...", 'info');
                thumb.closest('a, div, button') ? thumb.closest('a, div, button').click() : thumb.click();
            }

            // ALWAYS Dispatch "Arrow Right" keyboard event as backup during duplicate protection
            // This is safer than relying solely on clicks which have been failing
            log("Backup: Dispatching 'ArrowRight' keyboard event...", 'wrapper');
            const keyEvent = new KeyboardEvent('keydown', {
                key: 'ArrowRight', code: 'ArrowRight', keyCode: 39,
                which: 39, bubbles: true, cancelable: true, view: window
            });
            document.body.dispatchEvent(keyEvent);
            document.documentElement.dispatchEvent(keyEvent);

            await new Promise(r => setTimeout(r, 2000));
            return; // Retry loop
        } else {
            log(`Still stuck on ${imageId} after retries. Trying ROBUST CLICK simulation on Asset Card...`, 'warn');

            // 1. Re-acquire the target element
            let targetCard = null;
            if (window._targetNextId) {
                // Strategy 0: Asset Cards
                const cards = Array.from(document.querySelectorAll('div[data-testid="asset-card"]'));
                targetCard = cards.find(c => c.querySelector('img') && c.querySelector('img').src.includes(window._targetNextId));

                // Strategy 1: Thumbnails
                if (!targetCard) {
                    targetCard = document.querySelector(`img[src*="${window._targetNextId}"]`);
                    if (targetCard) targetCard = targetCard.closest('a, div, button') || targetCard;
                }
            }

            if (targetCard) {
                log(`Found Target Asset Card for ID ${window._targetNextId}. Simulating full pointer sequence...`, 'info');
                // Use the robust event sequence (Pointer Events)
                const clickEvents = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
                clickEvents.forEach(evtType => {
                    const mouseEvent = new MouseEvent(evtType, {
                        view: window,
                        bubbles: true,
                        cancelable: true,
                        buttons: 1
                    });
                    targetCard.dispatchEvent(mouseEvent);
                    // Also dispatch to the image inside, just in case
                    const img = targetCard.querySelector('img');
                    if (img) img.dispatchEvent(mouseEvent);
                });
            } else {
                log("Could not find Target Asset Card to click.", 'error');
            }

            // 2. Dispatch ArrowRight again, just in case
            const keyEvent = new KeyboardEvent('keydown', {
                key: 'ArrowRight', code: 'ArrowRight', keyCode: 39,
                which: 39, bubbles: true, cancelable: true, view: window
            });
            document.body.dispatchEvent(keyEvent);
            document.documentElement.dispatchEvent(keyEvent);

            window._dupAttempts = window._dupAttempts + 1; // Keep incrementing
            await new Promise(r => setTimeout(r, 3000));
            return;
        }
    }

    if (fromBatch) {
        window._lastProcessedId = imageId;
        window._dupAttempts = 0;
    }

    // 2. Find Inputs
    const titleInput = findTitleInput();
    if (!titleInput) log("Warning: Title input not found yet.", 'error');

    // 3. Extract Image Data
    try {
        const imageUrl = imgElement.src;
        log("Image URL found. Requesting background processing...");

        // 4. Get Settings
        if (!isProcessing) return; // Check stop
        log("Reading settings...");
        const settings = await chrome.storage.local.get(['apiKey', 'aiProvider', 'systemPrompt', 'autoAiCheck', 'autoNoPeople', 'geminiModel']);

        if (!settings.apiKey) {
            log("Error: API Key is missing. Check extension settings.", 'error');
            resetState();
            return;
        }

        if (!isProcessing) return; // Check stop

        // DEBUG: Inspect Settings
        log(`DEBUG: API Key present: ${!!settings.apiKey} (Start: ${settings.apiKey ? settings.apiKey.substring(0, 8) : 'None'})`, 'info');
        log(`DEBUG: AI Provider: ${settings.aiProvider || 'openai'}`, 'info');
        log(`DEBUG: Gemini Model Setting: ${settings.geminiModel || 'Default (gemini-1.5-flash)'}`, 'info');

        log(`Sending to ${settings.aiProvider || 'openai'}...`);

        // Append category instructions if not present
        let promptToUse = settings.systemPrompt;
        // Valid Shutterstock Categories
        // Valid Shutterstock Categories
        const validCategories = [
            "Abstract", "Animals/Wildlife", "Arts", "Backgrounds/Textures", "Beauty/Fashion",
            "Buildings/Landmarks", "Business/Finance", "Celebrities", "Editorial", "Education",
            "Food and drink", "Healthcare/Medical", "Holidays", "Industrial", "Interiors",
            "Miscellaneous", "Nature", "Objects", "Parks/Outdoor", "People", "Religion",
            "Science", "Signs/Symbols", "Sports/Recreation", "Technology", "Transportation", "Vintage"
        ];

        if (promptToUse && !promptToUse.includes('category1')) {
            promptToUse += `\nAlso provide "category1", "category2" (optional) from this list: ${JSON.stringify(validCategories)}. \nProvide "imageType" as either "Photo" or "Illustration". return JSON.`;
        }

        // 5. Send to Background (Pass URL, let background fetch it to avoid CORS)
        const response = await chrome.runtime.sendMessage({
            action: 'generate_metadata',
            data: {
                provider: settings.aiProvider || 'openai',
                apiKey: settings.apiKey,
                systemPrompt: promptToUse,
                imageUrl: imageUrl, // Changed from imageBase64
                geminiModel: settings.geminiModel || 'gemini-2.5-flash'
            }
        });

        if (!isProcessing) return; // Check stop

        if (response.error) {
            log(`AI Error: ${response.error} `, 'error');
            resetState();
            return;
        }

        if (response.success) {
            log("AI Response received!", 'success');

            // WRAPPER: Enforce 15-second timeout for metadata application
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout: Metadata application took too long")), 15000)
            );

            try {
                await Promise.race([
                    applyMetadata(response.data, settings),
                    timeoutPromise
                ]);
            } catch (err) {
                log(`Processing Warning: ${err.message}. Skipping to next step.`, 'warn');
            }

            // Check headers for usage limits (optional/simple)
            // ...

            log("Analysis complete!", 'success');
        } else {
            resetState();
        }

    } catch (e) {
        log(`Script Error: ${e.message} `, 'error');
        console.error(e);
    } finally {
        resetState();
    }
}

// Flag for batch mode
let isBatchMode = false;

function resetState() {
    // Only reset if NOT in batch mode, or if forcefully stopped
    if (!isBatchMode) {
        isProcessing = false;
        const stopBtn = document.getElementById('sa-stop-btn');
        const spinner = document.getElementById('sa-spinner');
        if (stopBtn) stopBtn.style.display = 'none';
        if (spinner) spinner.style.display = 'none';
    } else {
        // In batch mode, we just hide the spinner but keep isProcessing=true handled by the loop
        const spinner = document.getElementById('sa-spinner');
        if (spinner) spinner.style.display = 'none';
    }
}

async function applyMetadata(data, settings) {
    // Title
    const titleInput = findTitleInput();
    if (titleInput && data.title) {
        log(`Setting title: "${data.title.substring(0, 20)}..."`);
        simulateInput(titleInput, data.title);
    } else {
        log("Skipping title (input not found)", 'error');
    }

    // Categories
    if (data.category1) {
        const cat1 = findCategory1();
        if (cat1) {
            log(`Setting Category 1: ${data.category1}`);
            await simulateSelect(cat1, data.category1);
            await new Promise(r => setTimeout(r, 500));
            await closeActiveMenus();
        } else {
            log("Category 1 input not found", 'info');
        }
    }

    if (data.category2) {
        const cat2 = findCategory2();
        if (cat2) {
            log(`Setting Category 2: ${data.category2}`);
            await simulateSelect(cat2, data.category2);
            await new Promise(r => setTimeout(r, 500));
            await closeActiveMenus();
        }
    }

    // Image Type
    // Image Type
    if (data.imageType) {
        log("DEBUG: Processing Image Type...", 'info');
        try {
            const typeInput = findImageTypeInput();
            if (typeInput) {
                log(`Setting Image Type: ${data.imageType}`);
                await simulateSelect(typeInput, data.imageType);
                log("DEBUG: Image Type selected. Closing menus...", 'info');
                await new Promise(r => setTimeout(r, 500));
                await closeActiveMenus();
                log("DEBUG: Menus closed after Image Type.", 'info');
            } else {
                log("DEBUG: Image Type input NOT found.", 'warn');
            }
        } catch (err) {
            log(`DEBUG: Error in Image Type: ${err.message}`, 'error');
        }
    }


    // Keywords
    const tagString = Array.isArray(data.keywords) ? data.keywords.join(', ') : data.keywords;
    if (tagString) {
        // Try clipboard backup, but don't error loudly if it fails (common in background tabs)
        navigator.clipboard.writeText(tagString).then(() => {
            log("Keywords copied to clipboard", 'success');
        }).catch(() => log("Clipboard access skipped (not focused)", 'info'));

        const keywordInput = findKeywordsInput();
        if (keywordInput) {
            log(`Found keywords input. Filling...`, 'info');
            simulateInput(keywordInput, tagString);
            // Dispatch Enter to tokenize tags (common in UI frameworks)
            setTimeout(() => {
                simulateEnter(keywordInput);
            }, 100);
        } else {
            log("Keywords input auto-detect failed. Please paste manually.", 'info');
        }
    }
}

function simulateEnter(element) {
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13 }));
    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13 }));
}

function simulateInput(element, value) {
    element.focus();

    // Essential for React/Angular contenteditable fields or controlled inputs
    let proto;
    if (element instanceof HTMLTextAreaElement) {
        proto = window.HTMLTextAreaElement.prototype;
    } else if (element instanceof HTMLInputElement) {
        proto = window.HTMLInputElement.prototype;
    }

    const nativeInputValueSetter = proto ? Object.getOwnPropertyDescriptor(proto, "value")?.set : null;

    if (nativeInputValueSetter) {
        nativeInputValueSetter.call(element, value);
    } else {
        element.value = value;
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
}

async function simulateSelect(element, text) {
    if (!element) return;

    // 1. Standard Select
    if (element.tagName === 'SELECT') {
        const options = Array.from(element.options);
        const bestMatch = options.find(o => o.text.toLowerCase().includes(text.toLowerCase()) || o.value.toLowerCase().includes(text.toLowerCase()));
        if (bestMatch) {
            element.value = bestMatch.value;
            element.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }
    }

    // 2. Input/Combobox (Searchable Dropdown)
    if (element.tagName === 'INPUT' || element.getAttribute('role') === 'combobox') {
        log(`Typing "${text}" into dropdown...`);
        element.focus();
        element.value = text;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));

        // Setup Enter key press
        const enterEvent = new KeyboardEvent('keydown', {
            bubbles: true, cancelable: true, keyCode: 13, key: 'Enter'
        });
        element.dispatchEvent(enterEvent);
        return;
    }

    // 3. Custom Div/Button Dropdown (Click to open)
    log(`Clicking dropdown for "${text}"...`);

    // React sometimes needs specific event sequences.
    // React sometimes needs specific event sequences.
    const clickEvents = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
    clickEvents.forEach(evtType => {
        const mouseEvent = new MouseEvent(evtType, {
            view: window,
            bubbles: true,
            cancelable: true,
            buttons: 1
        });
        element.dispatchEvent(mouseEvent);
    });

    // Poll for the options to appear (max 2 seconds)
    for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 200));

        // Use XPath to find valid text nodes containing the category
        // We look for elements that *contain* the text, but exclude the overlay
        const xpath = `//*[text()[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${text.toLowerCase()}')]]`;
        const result = document.evaluate(xpath, document.body, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

        let foundElement = null;

        for (let j = 0; j < result.snapshotLength; j++) {
            const el = result.snapshotItem(j);

            // Filter: Visible, not in overlay, not script/style
            if (el.offsetParent === null) continue;
            if (el.closest('#shutterstock-ai-overlay')) continue;
            if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;

            // If it's a generic container, try to find a more specific child or stick with it
            // We generally want the element that directly contains the text
            foundElement = el;
            break; // Found a valid candidate
        }

        if (foundElement) {
            log(`Found option "${text}". Clicking...`);

            // Optimization: click the specific role="option" container if available
            const optionContainer = foundElement.closest('[role="option"]') || foundElement.closest('li') || foundElement;

            // Ensure visible
            optionContainer.scrollIntoView({ block: 'center', inline: 'nearest' });
            await new Promise(r => setTimeout(r, 150)); // Wait for scroll

            // Click sequence on container
            clickEvents.forEach(evtType => {
                const mouseEvent = new MouseEvent(evtType, {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    buttons: 1
                });
                optionContainer.dispatchEvent(mouseEvent);
            });

            // Dispatch Enter as fallback
            const enterEvt = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13 });
            optionContainer.dispatchEvent(enterEvt);

            return;
        }
    }

    // Debug info for user
    log(`Could not find option "${text}" in the list. Please select manually.`, 'warn');
}

function toggleCheckboxByLabel(labelText, shouldCheck) {
    // Find label
    const label = labels.find(l => l.innerText.toLowerCase().includes(labelText.toLowerCase()));

    if (label) {
        const input = document.getElementById(label.getAttribute('for')) || label.querySelector('input');
        if (input && input.type === 'checkbox') {
            if (input.checked !== shouldCheck) {
                input.click(); // Click is safer than .checked=true for React
                log(`Toggled "${labelText}"`, 'info');
            }
        }
    }
}

function checkExtensionContext() {
    try {
        if (!chrome.runtime || !chrome.runtime.id || !chrome.storage) {
            throw new Error("Extension Context Invalidated");
        }
        return true;
    } catch (e) {
        alert("Shutterstock AI Agent: Extension updated.\n\nPlease Refresh the Page to continue.");
        log("Extension context invalidated. Please refresh the page.", 'error');
        return false;
    }
}

async function closeActiveMenus() {
    log("Closing active menus and clearing focus...", 'info');

    // 1. Dispatch Escape on document (Multiple times)
    for (let i = 0; i < 3; i++) {
        document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape', code: 'Escape', keyCode: 27 }));
        document.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: 'Escape', code: 'Escape', keyCode: 27 }));
        await new Promise(r => setTimeout(r, 50));
    }

    // 2. Remove focus explicitly
    if (document.activeElement) {
        log(`Blurring active element: ${document.activeElement.tagName}`, 'info');
        document.activeElement.blur();
    }

    // 3. Click known "Safe Zones" to dismiss popovers
    // A. The Backdrop (MuiBackdrop)
    const backdrops = document.querySelectorAll('.MuiBackdrop-root, .MuiModal-backdrop');
    backdrops.forEach(b => b.click());

    // B. The Main Image Container (usually safe)
    const mainImg = findMainImage(() => { });
    if (mainImg) mainImg.click();

    // C. The Body (Fallback)
    document.body.click();

    await new Promise(r => setTimeout(r, 200));
}

// Make startBatchProcessing accessible globally for the button
window.startBatchProcessing = startBatchProcessing;

// Ensure overlay is created when content script loads
createOverlay();

async function startBatchProcessing() {
    if (isProcessing) return; // Prevent double start

    isProcessing = true;
    isBatchMode = true; // Set batch flag
    const stopBtn = document.getElementById('sa-stop-btn');
    const batchBtn = document.getElementById('sa-batch-btn');

    if (stopBtn) {
        stopBtn.style.display = 'block';
        // Override stop button for batch
        stopBtn.onclick = () => {
            log("Stopping Batch...", 'warn');
            isProcessing = false;
            isBatchMode = false;
            stopBtn.style.display = 'none';
            if (batchBtn) batchBtn.style.display = 'block';
        };
    }
    if (batchBtn) batchBtn.style.display = 'none';

    log("Starting Batch Processing...", 'info');

    // Loop until stopped
    while (isProcessing) {
        try {
            await processCurrentImage(true); // Call with fromBatch=true
        } catch (err) {
            log(`Error processing image: ${err.message}`, 'error');
        }

        // Double check stop flag immediately after processing
        if (!isProcessing) {
            log("Batch Stopped by user.", 'warn');
            break;
        }

        // Wait a bit
        await new Promise(r => setTimeout(r, 1000));

        // Find next button
        let nextBtn = findNextButton();
        if (nextBtn) {
            // Visual Debug (keep it for confirmation)
            nextBtn.style.border = "4px solid red";

            // Retry Loop for Navigation
            let navigationSuccess = false;
            const oldUrl = window.location.href;

            for (let attempt = 1; attempt <= 3; attempt++) {
                log(`Navigating to next image (Attempt ${attempt}/3)...`, 'info');

                // 1. Ensure everything is closed first
                await closeActiveMenus();

                // Explicit focus reset
                if (document.activeElement) document.activeElement.blur();
                document.body.focus();
                document.body.click();

                await new Promise(r => setTimeout(r, 500));

                // 2. Try Deep Click Sequence (React/SPA Friendly)
                // Some frameworks ignore simple .click() or missing pointer events
                const events = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];

                // Method A: Dispatch sequence on the element found
                events.forEach(evtType => {
                    const evt = new MouseEvent(evtType, {
                        view: window, bubbles: true, cancelable: true, buttons: 1
                    });
                    nextBtn.dispatchEvent(evt);
                });

                // Method B: Dispatch on the child image (if it's a wrapper) or parent (if it's an image)
                // This covers clickable areas that might be slightly offset
                const targetChild = nextBtn.querySelector('img, div') || nextBtn;
                targetChild.click();

                // Wait for click/keyboard to propagate
                await new Promise(r => setTimeout(r, 800));

                // 3. Arrow Key Backup
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, bubbles: true }));
                document.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, bubbles: true }));

                // OPTIMISTIC NAVIGATION STRATEGY:
                // In batch upload view, URL/Image verification is unreliable.
                // Trust the click happened and let the next cycle detect duplicates.
                log("Navigation action completed. Moving to next image...", 'success');
                navigationSuccess = true;
                break; // Exit retry loop - assume success
            }

            if (!navigationSuccess) {
                log("Could not find Next button after retries. Batch complete.", 'warn');
                isProcessing = false;
                break;
            }

            // Wait for new image content to settle (Robust Polling)
            let settled = false;
            const maxWaitAttempts = 20; // 10 seconds total
            log(`Waiting for image ID to change from ${window._lastProcessedId}...`, 'info');

            for (let w = 0; w < maxWaitAttempts; w++) {
                await new Promise(r => setTimeout(r, 500));

                const checkImg = findMainImage(() => { });
                if (checkImg) {
                    // Use robust regex here too
                    const checkMatch = checkImg.src.match(/(\d{7,})/) || checkImg.src.match(/(\d+)\./);
                    const checkId = checkMatch ? checkMatch[1] : "unknown";

                    if (checkId !== window._lastProcessedId) {
                        log(`New Image detected: ${checkId}`, 'success');
                        settled = true;
                        break;
                    }
                }
            }

            if (!settled) {
                log("Warning: Image ID did not change after navigation. Duplicate protection might trigger.", 'warn');
            }

            // Force continue
            isProcessing = true;

        } else {
            log("No 'Next' button found. Attempting to scroll to load more images...", 'warn');
            window.scrollTo(0, document.body.scrollHeight);
            await new Promise(r => setTimeout(r, 2000));

            // Retry finding button once after scroll
            nextBtn = findNextButton();
            if (nextBtn) {
                log("Found next button after scroll!", 'success');
                // Continue loop (go back to top) -> but we are inside the 'else', need to jump back?
                // Cleanest way: let the loop continue? No, loop breaks if nextBtn is null.
                // We need to RESTART the navigation logic on this found button.
                // Refactor: The easiest way strictly within this structure is to dispatch the click HERE.

                // Simulating click on the newly found button
                log("Clicking new button...", 'info');
                nextBtn.click();
                await new Promise(r => setTimeout(r, 1000));

                isProcessing = true; // Continue batch
            } else {
                log("Still no 'Next' button found. End of queue. Batch complete!", 'success');
                isProcessing = false;
                break;
            }
        }
    }

    // Cleanup UI
    isProcessing = false;
    if (stopBtn) stopBtn.style.display = 'none';
    if (batchBtn) batchBtn.style.display = 'block';
}
