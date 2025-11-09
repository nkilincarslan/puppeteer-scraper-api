const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const fs = require('fs');

const app = express();
const PORT = 3001;

// ScraperAPI key
const SCRAPERAPI_KEY = '3597374f16e523476e267bf66afc2503';

console.log('Starting server...');
console.log('SCRAPERAPI_KEY:', process.env.SCRAPERAPI_KEY ? 'Found' : 'Missing');
console.log('PORT:', process.env.PORT);

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

  try {
    console.log(`Starting scrape for query: "${query}" with limit: ${limit}`);

    // Trendyol search URL
    const trendyolUrl = `https://www.trendyol.com/sr?q=${encodeURIComponent(query)}`;
    console.log(`Target URL: ${trendyolUrl}`);

    // ScraperAPI URL with premium mode
    const scraperUrl = `https://api.scraperapi.com/?api_key=${SCRAPERAPI_KEY}&url=${encodeURIComponent(trendyolUrl)}&render=true&premium=true`;

    console.log('Fetching from ScraperAPI...');
    const response = await fetch(scraperUrl);

    if (!response.ok) {
      throw new Error(`ScraperAPI returned ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`Received HTML (${html.length} characters)`);

    // Debug: Save HTML to file
    fs.writeFileSync('/tmp/scraperapi_response.html', html);
    console.log('✅ HTML saved to /tmp/scraperapi_response.html');

    // Parse with Cheerio
    const $ = cheerio.load(html);
    console.log('Product cards found:', $('.product-card').length);
    const products = [];

    // Extract product data
    $('.product-card').each((i, element) => {
      if (i >= limit) return false; // Stop after limit

      try {
        const name = $(element).find('.prdct-desc-cntnr-name').text().trim();
        console.log(`✅ Product ${i} name:`, name);

        const priceElement = $(element).find('.prc-box-dscntd');
        console.log(`  Price element found:`, priceElement.length);
        const price = priceElement.text().trim();
        console.log(`  Price:`, price);

        const imageElement = $(element).find('img');
        console.log(`  Image element found:`, imageElement.length);
        const image = imageElement.attr('src');
        console.log(`  Image:`, image);

        const urlElement = $(element).find('a');
        console.log(`  URL element found:`, urlElement.length);
        const url = 'https://www.trendyol.com' + urlElement.attr('href');
        console.log(`  URL:`, url);

        if (name && price && image && url) {
          products.push({ name, price, image, url });
          console.log(`✅ Product ${i} SUCCESSFULLY ADDED`);
        } else {
          console.log(`❌ Product ${i} MISSING FIELDS`);
        }
      } catch (error) {
        console.error(`❌ Parse error for product ${i}:`, error.message);
      }
    });

    console.log(`Successfully scraped ${products.length} products`);

    res.status(200).json({
      success: true,
      query,
      count: products.length,
      products
    });

  } catch (error) {
    console.error('Scraping error:', error);

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
