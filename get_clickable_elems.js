const playwright = require('playwright');
const fs = require('fs');
const { URL } = require('url');
const path = require('path');

const RETRY_LIMIT = 3; // Number of retry attempts for network issues

(async () => {
    const data_dir = './data';
    if (!fs.existsSync(data_dir)) {
        fs.mkdirSync(data_dir, { recursive: true });
    }
    const browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Path to the URL file
    const urlFilePath = path.join(__dirname, 'test_urls.txt');
    try {
        const urls = fs.readFileSync(urlFilePath, 'utf-8')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line) // Filters out empty lines
            .map(url => url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`); // Ensures each URL starts with http:// or https://

        for (const targetUrl of urls) {
            console.log(targetUrl);
            let attempt = 0;
            let success = false;
            
            while (attempt < RETRY_LIMIT && !success) {
                attempt++;
                try {
                    const url = new URL(targetUrl);

                    // Navigate to the desired URL
                    await page.goto(targetUrl, { waitUntil: 'load' });

                    // Find all potentially clickable elements
                    const elements = await page.$$('*');
                    const successfulClicks = [];

                    for (const element of elements) {
                        if (await isElementClickable(page, element)) {
                            const boundingBox = await element.boundingBox();
                            const attributes = await element.evaluate(el => {
                                return {
                                    id: el.id || null,
                                    class: el.className || null,
                                    name: el.name || null,
                                    role: el.getAttribute('role') || null,
                                    type: el.type || null,
                                    'aria-label': el.getAttribute('aria-label') || null,
                                    'aria-labelledby': el.getAttribute('aria-labelledby') || null,
                                    href: el.href || null,
                                    alt: el.alt || null,
                                    action: el.form ? el.form.action : null,
                                    dataAttributes: Object.fromEntries(Array.from(el.attributes).filter(attr => attr.name.startsWith('data-')).map(attr => [attr.name, attr.value])),
                                    innerText: el.innerText || null,
                                    tag: el.tagName.toLowerCase() || null
                                };
                            });
                            if (boundingBox) {
                                successfulClicks.push({
                                    x: boundingBox.x,
                                    y: boundingBox.y,
                                    width: boundingBox.width,
                                    height: boundingBox.height,
                                    ...attributes
                                });
                            }
                        }
                    }

                    // Write the coordinates of elements where the click would be successful to a file
                    const baseFilename = url.hostname.replace('www.', ''); // Removes 'www.' if present
                    fs.writeFileSync(`${data_dir}/${baseFilename}.json`, JSON.stringify(successfulClicks, null, 4));

                    // Take a screenshot of the page
                    await page.screenshot({ path: `${data_dir}/${baseFilename}.png` });

                    success = true; // Mark as successful if no error occurs
                } catch (err) {
                    console.error(`Attempt ${attempt} failed processing ${targetUrl}: ${err.message}`);
                    if (attempt >= RETRY_LIMIT) {
                        console.error(`Failed processing ${targetUrl} after ${RETRY_LIMIT} attempts: ${err.message}`);
                    }
                }
            }
        }
    } catch (err) {
        console.error(`Failed reading URL file: ${err.message}`);
    }

    // Close the browser
    await browser.close();
})();

// Define an asynchronous function to determine if an element is clickable.
async function isElementClickable(page, element) {
    // Check if the element is visible. An element is considered visible if it has a non-zero dimension and is not hidden via CSS.
    const isVisible = await element.isVisible();

    // Check if the element is enabled. An element is considered enabled if it is not disabled
    const isEnabled = await element.isEnabled();

    // Check if the element has pointer events enabled. This CSS property determines if the element can be the target of mouse events (e.g., 'none' means it cannot be).
    const hasPointerEvents = await element.evaluate(el => getComputedStyle(el).pointerEvents !== 'none');

    // Determine if the element is obstructed by another element. This checks if the center of the element is actually the topmost element at its position, which implies it can be clicked.
    const isObstructed = await page.evaluate((element) => {
        const rect = element.getBoundingClientRect(); // Get the element's position and size.
        const x = rect.left + (rect.width / 2); // Calculate the center x-coordinate.
        const y = rect.top + (rect.height / 2); // Calculate the center y-coordinate.
        const elementAtPoint = document.elementFromPoint(x, y); // Find the topmost element at the center position.
        return elementAtPoint === element; // Check if the topmost element is the element itself.
    }, element);

    // Check if the cursor changes when hovering over the element
    const cursorChanges = await element.evaluate(el => {
        const originalCursor = getComputedStyle(el).cursor;
        el.style.cursor = 'auto';
        const hoverCursor = getComputedStyle(el).cursor;
        el.style.cursor = '';
        return originalCursor !== hoverCursor;
    });

    // Return true if all conditions are met
    return isVisible && isEnabled && hasPointerEvents && isObstructed && cursorChanges;
}
