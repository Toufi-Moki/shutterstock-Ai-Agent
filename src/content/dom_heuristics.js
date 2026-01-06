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
    // 1. Try exact selector
    let el = document.querySelector(SELECTORS.EDITOR_IMAGE);
    if (el) return el;

    // 2. Look for ANY large image
    const imgs = Array.from(document.querySelectorAll('img'));

    // Calculate areas and sort descending
    const candidates = imgs.map(img => {
        const rect = img.getBoundingClientRect();
        return {
            element: img,
            area: rect.width * rect.height,
            width: rect.width,
            height: rect.height,
            visible: rect.width > 0 && rect.height > 0 && rect.top >= 0
        };
    }).filter(item => {
        // Threshold: at least 100x100 to avoid icons
        return item.visible && item.width > 100 && item.height > 100;
    });

    // Sort by area (largest first)
    candidates.sort((a, b) => b.area - a.area);

    if (candidates.length > 0) {
        logFunction(`Found ${candidates.length} candidate images. Best: ${candidates[0].width}x${candidates[0].height}`, 'info');
        return candidates[0].element;
    }

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
    // STRATEGY 0: Asset Card Navigation (User Provided Structure)
    // Precise targeting for Shutterstock 'Asset Cards'
    const mainImg = findMainImage(() => { });

    if (mainImg && mainImg.src) {
        const mainSrc = mainImg.src;
        // Improved Regex: Handle ".../pending_photos/12345/..." AND ".../photo-12345.jpg"
        // Match the first sequence of 8+ digits, or fall back to standard ID patterns
        const idRegex = /(\d{7,})/;
        const mainIdMatch = mainSrc.match(idRegex);
        const mainId = mainIdMatch ? mainIdMatch[1] : null;

        if (mainId) {
            console.log(`[Heuristics] Strategy 0: Main ID ${mainId}`);

            // Find all Asset Cards
            const cards = Array.from(document.querySelectorAll('div[data-testid="asset-card"]'));

            if (cards.length > 0) {
                console.log(`[Heuristics] Found ${cards.length} Asset Cards`);

                // Find the card containing the current ID
                const currentIndex = cards.findIndex(card => {
                    // Check any image source inside the card
                    const img = card.querySelector('img');
                    return img && img.src.includes(mainId);
                });

                if (currentIndex !== -1 && currentIndex < cards.length - 1) {
                    const nextCard = cards[currentIndex + 1];
                    const nextImg = nextCard.querySelector('img');

                    // Save Target ID
                    if (nextImg && nextImg.src) {
                        const nextIdMatch = nextImg.src.match(idRegex);
                        if (nextIdMatch) window._targetNextId = nextIdMatch[1];
                        console.log(`[Heuristics] Strategy 0 Success: Next ID ${window._targetNextId}`);
                    }

                    // Return the clickable wrapper (usually the card itself or the media container)
                    // The user HTML shows the checkbox is clickable, but the image is likely the trigger for "Preview".
                    // Let's click the image itself to avoid checking the checkbox.
                    return nextImg || nextCard;
                }
            }
        }
    }

    // STRATEGY 1: Content-Based Navigation (Legacy/Robust Fallback)
    if (mainImg && mainImg.src) {
        // Extract a unique identifier from the main image (e.g. filename or ID)
        // Shutterstock URLs usually have IDs: .../image-photo/cat-dog-123456.jpg
        const mainSrc = mainImg.src;
        // UPDATE: Use the improved regex as well
        const mainIdMatch = mainSrc.match(/(\d{7,})/) || mainSrc.match(/(\d+)\./);
        const mainId = mainIdMatch ? mainIdMatch[1] : null;

        if (mainId) {
            console.log(`[Heuristics] Strategy 1: Main ID ${mainId}`); // DEBUG
            const allImages = Array.from(document.querySelectorAll('img'));
            const candidates = allImages.filter(img => {
                if (img === mainImg) return false;
                if (img.width < 30 || img.height < 30) return false;
                return true;
            });

            const currentIndex = candidates.findIndex(img => img.src.includes(mainId));

            if (currentIndex !== -1 && currentIndex < candidates.length - 1) {
                const nextThumb = candidates[currentIndex + 1];
                if (nextThumb && nextThumb.src) {
                    const nextId = nextThumb.src.match(/(\d+)\./) ? nextThumb.src.match(/(\d+)\./)[1] : null;
                    if (nextId) window._targetNextId = nextId;
                    console.log(`[Heuristics] Strategy 1 Success: Next ID ${nextId}`); // DEBUG
                }
                return nextThumb.closest('a, button, div[role="button"]') || nextThumb;
            } else {
                console.log(`[Heuristics] Strategy 1 Failed: ID not found in ${candidates.length} candidates`);
            }
        }
    }

    // STRATEGY 2: Filmstrip/Grid Navigation (FALLBACK)
    // Only use if Strategy 1 fails
    const activeCandidates = Array.from(document.querySelectorAll(
        '[aria-selected="true"], [class*="selected"], [class*="active"], [style*="border"]'
    ));

    for (let active of activeCandidates) {
        if (!active.closest('div[class*="grid"], div[class*="list"], ul, section')) continue;
        let nextCandidate = active.nextElementSibling;
        if (!nextCandidate && active.parentElement) {
            if (active.parentElement.tagName === 'LI' || active.parentElement.className.includes('item')) {
                nextCandidate = active.parentElement.nextElementSibling;
            }
        }
        if (nextCandidate) {
            console.log("[Heuristics] Strategy 2 Success: Found next sibling via active class"); // DEBUG
            const clickable = nextCandidate.querySelector('a, button, img') || nextCandidate;
            return clickable;
        }
    }

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
