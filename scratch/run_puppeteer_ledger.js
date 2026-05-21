const puppeteer = require('puppeteer');

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new"
        });
        const page = await browser.newPage();

        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('DIAGNOSTIC')) {
                console.log('BROWSER_CONSOLE:', text);
            }
        });

        console.log("Navigating to login...");
        await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
        
        console.log("Entering credentials...");
        await page.type('#login-email', 'admin@erp.com');
        await page.type('#login-password', 'Admin@123');
        
        console.log("Clicking submit...");
        await page.click('#login-submit');
        
        console.log("Waiting for navigation...");
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        console.log("Navigating to ledger...");
        await page.goto('http://localhost:5173/ledger', { waitUntil: 'networkidle2' });
        
        console.log("Waiting 2 seconds on All Sectors view...");
        await new Promise(r => setTimeout(r, 2000));
        
        console.log("Finding ALL button text contents...");
        const buttons = await page.$$('button');
        let tradingBtn, contractingBtn;
        for (let btn of buttons) {
            const text = await page.evaluate(el => el.textContent, btn);
            console.log(`BUTTON TEXT: "${text.trim()}"`);
            if (text.includes('Trading')) {
                tradingBtn = btn;
            } else if (text.includes('Contracting')) {
                contractingBtn = btn;
            }
        }

        const printUIState = async (label) => {
            console.log(`--- UI STATE FOR ${label} ---`);
            const pTexts = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('p')).map(p => p.textContent.trim());
            });
            console.log("Paragraphs:", pTexts.filter(t => t.includes('QAR') || t.includes('Total') || t.includes('Net')));
            
            const rowTexts = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('tbody tr')).map(tr => {
                    return Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim()).join(' | ');
                });
            });
            console.log("Table Rows:");
            rowTexts.forEach(r => console.log("  ", r));
        };

        await printUIState("ALL SECTORS");

        if (tradingBtn) {
            console.log("Clicking TRADING sector button...");
            await page.evaluate(el => el.click(), tradingBtn);
            await new Promise(r => setTimeout(r, 2000));
            await printUIState("TRADING SECTOR");
        }

        if (contractingBtn) {
            console.log("Clicking CONTRACTING sector button...");
            await page.evaluate(el => el.click(), contractingBtn);
            await new Promise(r => setTimeout(r, 2000));
            await printUIState("CONTRACTING SECTOR");
        }
        
    } catch (e) {
        console.error("ERROR IN PUPPETEER:", e);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
