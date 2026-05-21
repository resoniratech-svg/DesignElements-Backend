const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.text()));
    page.on('request', request => {
        if (request.method() !== 'GET') {
            console.log('NETWORK_REQUEST:', request.method(), request.url());
        }
    });

    await page.goto('http://localhost:5173/login', {waitUntil:'networkidle2'});
    
    // Login
    await page.type('input[type="email"]', 'admin');
    await page.type('input[type="password"]', 'admin123'); // assuming default credentials
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    // Go to Quotations
    await page.goto('http://localhost:5173/quotations', {waitUntil:'networkidle2'});
    
    // Switch to invoices tab
    const tabs = await page.$$('button');
    for(let tab of tabs) {
        const text = await page.evaluate(el => el.textContent, tab);
        if(text.includes('Invoices')) {
            await tab.click();
            break;
        }
    }
    
    // Wait a bit
    await new Promise(r => setTimeout(r, 2000));
    
    // Click all SVG elements that represent the trash icon
    // Using simple approach: wait for trash icons
    const trashIcons = await page.$$('button svg.lucide-trash-2');
    if(trashIcons.length > 0) {
        console.log(`Found ${trashIcons.length} trash icons. Clicking the first one...`);
        // we can just click the button parent
        const parentBtn = await page.evaluateHandle(el => el.parentElement, trashIcons[0]);
        await parentBtn.click();
    } else {
        console.log('No trash icons found.');
    }
    
    await new Promise(r => setTimeout(r, 2000));
    
    await browser.close();
})();
