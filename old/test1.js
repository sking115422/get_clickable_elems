const playwright = require('playwright');
const fs = require('fs');
const { URL } = require('url');

(async () => {
    const browser = await playwright.chromium.launch();
    const page = await browser.newPage();

    // Define the URL to navigate to
    const targetUrl = 'https://facebook.com'; // Replace 'https://google.com' with your target URL
    const url = new URL(targetUrl);

    // Navigate to the desired URL
    await page.goto(targetUrl);

    // Find all potentially clickable elements
    const elements = await page.$$('*');
    const successfulClicks = [];

    for (const element of elements) {
        if (await isElementClickable(page, element)) {
            const boundingBox = await element.boundingBox();
            if (boundingBox) {
                successfulClicks.push({
                    x: boundingBox.x,
                    y: boundingBox.y,
                    width: boundingBox.width,
                    height: boundingBox.height
                });
            }
        }
    }

    // Write the coordinates of elements where the click would be successful to a file
    const baseFilename = url.hostname.replace('www.', ''); // Removes 'www.' if present
    fs.writeFileSync(`${baseFilename}.json`, JSON.stringify(successfulClicks, null, 4));

    // Take a screenshot of the page
    await page.screenshot({ path: `${baseFilename}.png` });

    // Close the browser
    await browser.close();
})();

async function isElementClickable(page, element) {
    const isVisible = await element.isVisible();
    const isEnabled = await element.isEnabled();
    const hasPointerEvents = await element.evaluate(el => getComputedStyle(el).pointerEvents !== 'none');
    const isObstructed = await page.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const x = rect.left + (rect.width / 2);
        const y = rect.top + (rect.height / 2);
        const elementAtPoint = document.elementFromPoint(x, y);
        return elementAtPoint === element;
    }, element);

    return isVisible && isEnabled && hasPointerEvents && isObstructed;
}
