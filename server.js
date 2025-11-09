const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');

const app = express();
const PORT = 3001;

// ScraperAPI key
const SCRAPERAPI_KEY = '3597374f16e523476e267bf66afc2503';

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

    // ScraperAPI URL with premium mode and wait for selector
    const scraperUrl = `https://api.scraperapi.com/?api_key=${SCRAPERAPI_KEY}&url=${encodeURIComponent(trendyolUrl)}&render=true&wait_for_selector=.product-card&premium=true`;

    console.log('Fetching from ScraperAPI...');
    const response = await fetch(scraperUrl);

    if (!response.ok) {
      throw new Error(`ScraperAPI returned ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`Received HTML (${html.length} characters)`);

    // Parse with Cheerio
    const $ = cheerio.load(html);
    const products = [];

    // Extract product data
    $('.product-card').each((i, element) => {
      if (i >= limit) return false; // Stop after limit

      try {
        const $product = $(element);

        const name = $product.find('.product-name').text().trim();
        const brand = $product.find('.product-brand').text().trim();
        const price = $product.find('.price-section').text().trim();
        const url = $product.find('a').attr('href') || '';

        // Get image - try multiple selectors
        let image = '';
        const $images = $product.find('img.image, img.image.with-actions');
        $images.each((j, img) => {
          const src = $(img).attr('src');
          if (src && !src.includes('placeholder') && !image) {
            image = src;
            return false; // Break loop
          }
        });

        // Fallback to first image
        if (!image && $images.length > 0) {
          image = $images.first().attr('src') || '';
        }

        // Add full URL if relative
        const fullUrl = url.startsWith('http') ? url : `https://www.trendyol.com${url}`;

        if (name && url) {
          products.push({
            name: `${brand} ${name}`.trim(),
            price: { current: price },
            url: fullUrl,
            image: image
          });
        }
      } catch (error) {
        console.error('Error extracting product data:', error);
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
