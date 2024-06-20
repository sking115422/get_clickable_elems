const playwright = require('playwright');
const fs = require('fs');
const { URL } = require('url');



(async () => {
    const data_dir = './data'
    const browser = await playwright.chromium.launch();
    const page = await browser.newPage();

    // Read URLs from the file
    const urlFilePath = 'test_urls.txt'; // Ensure this file exists in the same directory as the script
    const urls = fs.readFileSync(urlFilePath, 'utf-8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line) // Filters out empty lines
        .map(url => url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`); // Ensures each URL starts with http:// or https://

    for (const targetUrl of urls) {
        try {
            const url = new URL(targetUrl);

            // Navigate to the desired URL
            await page.goto(targetUrl);

            // Find all potentially clickable elements
            const elements = await page.$$('*');
            const successfulClicks = [];

            for (const element of elements) {
                if (await isElementClickable(page, element)) {
                    const boundingBox = await element.boundingBox();
                    const elementHTML = await element.evaluate(el => el.outerHTML);
                    if (boundingBox) {
                        successfulClicks.push({
                            x: boundingBox.x,
                            y: boundingBox.y,
                            width: boundingBox.width,
                            height: boundingBox.height,
                            element_full: elementHTML
                        });
                    }
                }
            }

            // Write the coordinates of elements where the click would be successful to a file
            const baseFilename = url.hostname.replace('www.', ''); // Removes 'www.' if present
            fs.writeFileSync(`${data_dir}/${baseFilename}.json`, JSON.stringify(successfulClicks, null, 4));

            // Take a screenshot of the page
            await page.screenshot({ path: `${data_dir}/${baseFilename}.png` });
        } catch (error) {
            console.error(`Failed processing ${targetUrl}: ${error}`);
        }
    }

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
