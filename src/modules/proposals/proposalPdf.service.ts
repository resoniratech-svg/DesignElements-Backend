import puppeteer, { Browser } from "puppeteer";
import fs from "fs";
import path from "path";

export const generatePdf = async (
  html: string,
  filePath: string
): Promise<string> => {

  let browser: Browser | null = null;

  try {

    // Ensure directory exists
    const directory = path.dirname(filePath);

    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    // Launch puppeteer browser
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    // Load HTML content
    await page.setContent(html, {
      waitUntil: "networkidle0"
    });

    // Generate PDF
    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        bottom: "20px",
        left: "20px",
        right: "20px"
      }
    });

    return filePath;

  } catch (error: any) {

    console.error("PDF generation error:", error);

    throw new Error("Failed to generate proposal PDF");

  } finally {

    if (browser) {
      await browser.close();
    }

  }
};