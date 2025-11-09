# Trendyol Scraper API

Puppeteer tabanlı Trendyol ürün çekme API'si.

## Özellikler

- Express.js REST API
- Puppeteer ile web scraping
- Hızlı çalışma için resim/CSS engelleme
- Docker desteği
- Error handling

## Kurulum

### Yerel Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Sunucuyu başlat
npm start
```

Sunucu `http://localhost:3001` adresinde çalışacaktır.

### Docker ile Kurulum

```bash
# Docker image oluştur
docker build -t trendyol-scraper .

# Container'ı çalıştır
docker run -p 3001:3001 trendyol-scraper
```

## Kullanım

### Health Check

```bash
curl http://localhost:3001/health
```

### Ürün Arama

```bash
curl -X POST http://localhost:3001/scrape/trendyol \
  -H "Content-Type: application/json" \
  -d '{
    "query": "laptop",
    "limit": 10
  }'
```

#### Parametreler

- `query` (zorunlu): Aranacak kelime
- `limit` (opsiyonel): Maksimum ürün sayısı (varsayılan: 10)

#### Örnek Yanıt

```json
{
  "success": true,
  "query": "laptop",
  "count": 10,
  "products": [
    {
      "name": "Ürün adı",
      "brand": "Marka",
      "price": "9.999,99 TL",
      "rating": "4.5",
      "url": "https://www.trendyol.com/..."
    }
  ]
}
```

## API Endpoints

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/health` | Sağlık kontrolü |
| POST | `/scrape/trendyol` | Trendyol ürün arama |

## Teknik Detaylar

- **Port:** 3001
- **Node.js:** 18+
- **Headless Browser:** Chromium (Puppeteer)
- **Optimizasyonlar:** Resim ve CSS yüklemesi devre dışı

## Notlar

- Bu API eğitim amaçlıdır
- Trendyol'un robots.txt ve kullanım şartlarına uygun kullanın
- Yüksek trafik için rate limiting eklemeyi düşünün
- Production ortamında CORS ayarlarını yapılandırın

## Lisans

ISC
