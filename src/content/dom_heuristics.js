// Shutterstock DOM Selectors (Heuristic Fallbacks)
const SELECTORS = {
    // These are "best guess" specific selectors. 
    // If these fail, we use the heuristics functions below.
    EDITOR_IMAGE: 'img[data-test-id="preview-image"]',
    TITLE_INPUT: 'textarea[data-test-id="description-input"]',
    KEYWORDS_INPUT: 'div[data-test-id="keywords-input"] input',
};

/**
 * Heuristic Function to Find the Title Input
 */
function findTitleInput() {
    // 1. Try exact selector
    let el = document.querySelector(SELECTORS.TITLE_INPUT);
    if (el) return el;

    // 2. Try looking for textareas with "description" or "title" in name, id, or placeholder
    const textareas = document.querySelectorAll('textarea, input[type="text"]');
    for (let t of textareas) {
        const attr = (t.name + t.id + t.placeholder + (t.getAttribute('aria-label') || '')).toLowerCase();
        if (attr.includes('description') || attr.includes('title')) {
            // Filter out search bars
            if (!attr.includes('search')) return t;
        }
    }
    return null;
}

/**
 * Heuristic Function to Find the Main Image
 */
function findMainImage(logFunction = console.log) {
    // CRITICAL FIX: In batch mode, use the card thumbnail image
    // The sidebar has NO image element - only form fields!
    if (window._batchCardImage) {
        logFunction(`Using batch card thumbnail image`, 'info');
        return window._batchCardImage;
    }

    // 1. Try exact selector
    let el = document.querySelector(SELECTORS.EDITOR_IMAGE);
    if (el) return el;

    // 2. NEW: Look for image in the right-side editor/detail panel
    // Shutterstock shows the image being edited in a side panel
    const panelSelectors = [
        'img[data-testid="preview-image"]',
        'img[data-testid="detail-image"]',
        'div[role="dialog"] img',
        'aside img',
        '.MuiDrawer-root img',
        '[class*="DetailPanel"] img',
        '[class*="EditorPanel"] img'
    ];

    for (const selector of panelSelectors) {
        const panelImgs = document.querySelectorAll(selector);
        for (const panelImg of panelImgs) {
            if (panelImg.width > 100 && panelImg.height > 100) {
                // Make sure it's not a grid thumbnail
                if (!panelImg.closest('[data-testid="asset-card"]')) {
                    logFunction(`Found image in editor panel (${panelImg.width}x${panelImg.height})`, 'info');
                    return panelImg;
                }
            }
        }
    }

    // DEBUG: Log what we found in panels
    logFunction('[DEBUG] Panel selectors didnt find valid images. Checking fallback...', 'warn');

    // 3. Look for ANY large image (but exclude grid thumbnails)
    const imgs = Array.from(document.querySelectorAll('img'));

    logFunction(`[DEBUG] Total images on page: ${imgs.length}`, 'info');

    // Calculate areas and sort descending
    const candidates = imgs.map(img => {
        const rect = img.getBoundingClientRect();
        return {
            element: img,
            area: rect.width * rect.height,
            width: rect.width,
            height: rect.height,
            visible: rect.width > 0 && rect.height > 0 && rect.top >= 0,
            isInGrid: img.closest('[data-testid="asset-card"]') !== null
        };
    });

    // DEBUG: Show breakdown
    const largeImages = candidates.filter(c => c.width > 100 && c.height > 100);
    const nonGridImages = candidates.filter(c => !c.isInGrid);
    const largeNonGridImages = candidates.filter(c => c.width > 100 && c.height > 100 && !c.isInGrid);

    logFunction(`[DEBUG] Images: ${largeImages.length} large, ${nonGridImages.length} non-grid, ${largeNonGridImages.length} large+non-grid`, 'info');

    //Show first few non-grid images
    if (nonGridImages.length > 0) {
        logFunction(`[DEBUG] Non-grid images found:`, 'info');
        nonGridImages.slice(0, 5).forEach((img, i) => {
            logFunction(`[DEBUG]   ${i + 1}. ${img.width}x${img.height}, visible: ${img.visible}`, 'info');
        });
    }

    const filtered = candidates.filter(item => {
        // Threshold: at least 100x100 to avoid icons
        // CRITICAL: Exclude images inside grid cards (those are thumbnails!)
        return item.visible && item.width > 100 && item.height > 100 && !item.isInGrid;
    });

    // Sort by area (largest first)
    filtered.sort((a, b) => b.area - a.area);

    if (filtered.length > 0) {
        logFunction(`Found ${filtered.length} candidate images.Best: ${filtered[0].width}x${filtered[0].height} `, 'info');
        return filtered[0].element;
    }

    logFunction('[DEBUG] NO VALID IMAGES FOUND AFTER FILTERING!', 'error');
    return null;
}

/**
 * Heuristic Function to Find Keywords Input
 */
function findKeywordsInput() {
    // 1. Try exact
    let el = document.querySelector(SELECTORS.KEYWORDS_INPUT);
    if (el) return el;

    // 2. Search for inputs related to keywords
    const inputs = document.querySelectorAll('input, textarea');
    for (let i of inputs) {
        const attr = (i.name + i.id + i.placeholder + (i.getAttribute('aria-label') || '')).toLowerCase();
        if (attr.includes('keyword') || attr.includes('tag')) {
            return i;
        }
    }
    return null;
}

/**
 * Heuristic to find dropdown by label text
 */
// Specific Heuristic for Shutterstock's React Material/Custom UI
// Structure often: <div><label>Category 1</label><div>...<input>...<div role="button">Select...</div></div></div>
function findDropdownByLabel(labelText) {
    // 1. Find all text nodes or elements containing the exact label text
    const allElems = Array.from(document.querySelectorAll('div, span, p, label'));
    const candidates = allElems.filter(el =>
        el.innerText && el.innerText.trim().toLowerCase().startsWith(labelText.toLowerCase())
    );

    for (let labelEl of candidates) {
        // Look for a sibling or child that is a dropdown
        // Common pattern: Label is in a wrapper, dropdown is next to it or below it.

        // Walk up to find a container that "looks like" a form field (contains both label and something interactive)
        let container = labelEl.parentElement;
        let attempts = 0;

        while (container && attempts < 5) {
            // Check for specific interactive elements
            // role="button", role="combobox", or regular select/input
            const interactive = container.querySelectorAll('select, input, [role="button"], [role="combobox"], div[class*="select"], div[class*="dropdown"]');

            // Filter out the label itself or non-relevant items
            for (let el of interactive) {
                if (el === labelEl) continue;
                // Don't pick hidden inputs unless we can't find anything else
                if (el.tagName === 'INPUT' && el.type === 'hidden') continue;

                // CRITICAL FIX: Ensure the element comes AFTER the label (or is contained by it)
                // This prevents grabbing "Category 1" dropdown when searching for "Category 2" in a shared parent.
                const pos = labelEl.compareDocumentPosition(el);
                if (pos & Node.DOCUMENT_POSITION_PRECEDING) continue;

                // Found a candidate interactive element in the same group as the label
                return el;
            }

            container = container.parentElement;
            attempts++;
        }
    }

    return null;
}

function findCategory1() {
    return findDropdownByLabel('Category 1');
}

function findCategory2() {
    return findDropdownByLabel('Category 2');
}

function findImageTypeInput() {
    return findDropdownByLabel('Image type');
}

/**
 * Heuristic to find the "Next" button in the editor toolbar
 */
function findNextButton() {
    const mainImg = findMainImage(() => { });

    // STRATEGY 1: Visual 'Selected' Card Navigation (PRIMARY - Most Reliable)
    // Find the card that looks selected (blue border/checkmark) and click the next one.

    const cardContainers = Array.from(document.querySelectorAll('div[data-testid="asset-card"]'));

    if (cardContainers.length > 0) {
        let activeIndex = -1;

        // Sub-strategy 1a: Look for visual "Selected" indicators
        activeIndex = cardContainers.findIndex(card => {
            const html = card.outerHTML;
            // Check for MUI selected class or aria-selected
            if (html.includes('Mui-selected') || html.includes('aria-selected="true"')) return true;
            // Check for checked checkbox inside the card
            const checkbox = card.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.checked) return true;
            return false;
        });

        // Sub-strategy 1b: If no visual selection, match by image ID
        if (activeIndex === -1 && mainImg && mainImg.src) {
            const mainIdMatch = mainImg.src.match(/(\d{7,})/);
            const mainId = mainIdMatch ? mainIdMatch[1] : null;

            if (mainId) {
                activeIndex = cardContainers.findIndex(card => {
                    const cardImg = card.querySelector('img');
                    return cardImg && cardImg.src.includes(mainId);
                });
            }
        }

        // If we found the active card, return the next one
        if (activeIndex !== -1 && activeIndex < cardContainers.length - 1) {
            console.log(`[Heuristics] Strategy 1(Visual): Found Active Card at index ${activeIndex}. Targeting ${activeIndex + 1}.`);
            const nextCard = cardContainers[activeIndex + 1];
            const clickable = nextCard.querySelector('img, a') || nextCard;
            return clickable;
        }
    }

    // STRATEGY 2: ID-Based Card Navigation (Fallback)
    if (mainImg && mainImg.src) {
        const mainSrc = mainImg.src;
        const idRegex = /(\d{7,})/;
        const mainIdMatch = mainSrc.match(idRegex);
        const mainId = mainIdMatch ? mainIdMatch[1] : null;

        if (mainId && cardContainers.length > 0) {
            console.log(`[Heuristics] Strategy 2: Main ID ${mainId} `);

            // Find the card containing the current ID
            const currentIndex = cardContainers.findIndex(card => {
                const img = card.querySelector('img');
                return img && img.src.includes(mainId);
            });

            if (currentIndex !== -1 && currentIndex < cardContainers.length - 1) {
                const nextCard = cardContainers[currentIndex + 1];
                const nextImg = nextCard.querySelector('img');

                if (nextImg && nextImg.src) {
                    const nextIdMatch = nextImg.src.match(idRegex);
                    if (nextIdMatch) window._targetNextId = nextIdMatch[1];
                    console.log(`[Heuristics] Strategy 2 Success: Next ID ${window._targetNextId} `);
                }

                return nextImg || nextCard;
            }
        }
    }

    // STRATEGY 3: Active Class Heuristic (Legacy Fallback)
    const activeCandidates = Array.from(document.querySelectorAll(
        '[aria-selected="true"], [class*="selected"], [class*="active"], [style*="border"]'
    ));

    // STRATEGY 3: Common Editor Toolbar Arrows (FALLBACK)
    // Only use if Strategy 1 and 2 fail
    const ariaCandidates = [
        'next item', 'next image', 'next', 'navigate next', 'forward', 'chevron right'
    ];

    // Select all buttons and links
    const candidates = Array.from(document.querySelectorAll('button, a, div[role="button"]'));

    for (let el of candidates) {
        // Safe access to attributes
        const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
        const text = (el.innerText || '').toLowerCase();
        const testId = (el.getAttribute('data-test-id') || '').toLowerCase();

        // Strict check: Avoid "Next Page" pagination if possible, prefer "Next Image"
        if (ariaLabel.includes('page') || text.includes('page')) continue;

        if (ariaCandidates.some(t => ariaLabel.includes(t) || text.includes(t))) {
            if (el.offsetParent !== null) return el;
        }

        if (testId.includes('next')) return el;

        // Iconic search: Look for SVG arrows if no label
        const svg = el.querySelector('svg');
        if (svg) {
            const svgTitle = svg.querySelector('title');
            if (svgTitle && ariaCandidates.some(t => svgTitle.textContent.toLowerCase().includes(t))) {
                return el;
            }
        }
    }

    // Fallback: Look for the specific "chevron-right" icon class often used
    const icon = document.querySelector('i.fa-chevron-right, i.icon-next, svg[data-icon="chevron-right"]');
    if (icon) {
        // Try to find a button parent, but if not found, return the ICON itself 
        return icon.closest('button, a, div[role="button"]') || icon;
    }

    return null;
}

module.exports = {
    SELECTORS,
    findTitleInput,
    findMainImage,
    findKeywordsInput,
    findCategory1,
    findCategory2,
    findImageTypeInput,
    findNextButton
};
