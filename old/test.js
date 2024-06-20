const playwright = require('playwright');
const fs = require('fs');
const { URL } = require('url');

(async () => {
    // Launch the browser
    const browser = await playwright.chromium.launch();
    const page = await browser.newPage();

    // Define the URL to navigate to
    const targetUrl = 'https://google.com'; // Replace 'https://google.com' with your target URL
    const url = new URL(targetUrl);

    // Navigate to the desired URL
    await page.goto(targetUrl);

    // Find all elements that are potentially clickable
    const allElements = await page.$$('*');
    const successfulClicks = [];

    for (const element of allElements) {
        try {
            // Attempt to click on the element
            await element.click({ timeout: 500 }); // Set a low timeout to avoid delays

            // If click is successful, get the bounding box of the element
            const boundingBox = await element.boundingBox();
            if (boundingBox) {
                successfulClicks.push({
                    x: boundingBox.x,
                    y: boundingBox.y,
                    width: boundingBox.width,
                    height: boundingBox.height
                });
            }
        } catch (error) {
            // Handle errors (e.g., element not clickable, obscured, etc.)
            console.log(`Failed to click element: ${error.message}`);
        }
    }

    // Write the coordinates of elements where click was successful to a file
    const baseFilename = url.hostname.replace('www.', ''); // Removes 'www.' if present
    fs.writeFileSync(`${baseFilename}.json`, JSON.stringify(successfulClicks, null, 4));

    // Take a screenshot of the page
    await page.screenshot({ path: `${baseFilename}.png` });

    // Close the browser
    await browser.close();
})();
