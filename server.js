const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Trendyol scraper endpoint
app.post('/scrape/trendyol', async (req, res) => {
  const { query, limit = 10 } = req.body;

  if (!query) {
    return res.status(400).json({
      error: 'Query parameter is required',
      example: { query: 'laptop', limit: 10 }
    });
  }

  let browser;
  try {
    console.log(`Starting scrape for query: "${query}" with limit: ${limit}`);

    // Launch browser with optimized settings
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const page = await browser.newPage();

    // Block images and CSS for faster loading
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (resourceType === 'image' || resourceType === 'stylesheet' || resourceType === 'font') {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Set user agent to avoid detection
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Navigate to Trendyol search page
    const searchUrl = `https://www.trendyol.com/sr?q=${encodeURIComponent(query)}`;
    console.log(`Navigating to: ${searchUrl}`);

    await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Wait for products to load
    await page.waitForSelector('.product-card', { timeout: 10000 });

    // Extract product data
    const products = await page.evaluate((maxProducts) => {
      const productElements = document.querySelectorAll('.product-card');
      const results = [];

      for (let i = 0; i < Math.min(productElements.length, maxProducts); i++) {
        const product = productElements[i];

        try {
          const nameElement = product.querySelector('.product-name');
          const brandElement = product.querySelector('.product-brand');
          const priceElement = product.querySelector('.price-section');
          const imageElement = product.querySelector('img.image');
          const linkElement = product.querySelector('a');

          const name = nameElement?.textContent?.trim() || '';
          const brand = brandElement?.textContent?.trim() || '';
          const price = priceElement?.textContent?.trim() || '';
          const image = imageElement?.src || '';
          const url = linkElement?.href || product.href || '';

          if (name && url) {
            results.push({
              name: `${brand} ${name}`,
              price: { current: price },
              url: url,
              image: image
            });
          }
        } catch (error) {
          console.error('Error extracting product data:', error);
        }
      }

      return results;
    }, limit);

    await browser.close();

    console.log(`Successfully scraped ${products.length} products`);

    res.status(200).json({
      success: true,
      query,
      count: products.length,
      products
    });

  } catch (error) {
    console.error('Scraping error:', error);

    if (browser) {
      await browser.close();
    }

    res.status(500).json({
      success: false,
      error: 'Failed to scrape Trendyol',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Trendyol Scraper API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Scrape endpoint: POST http://localhost:${PORT}/scrape/trendyol`);
});
