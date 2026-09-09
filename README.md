# PeremeTours Frontend

İstanbul Boğazı tur ve deneyim satış sitesi için hazırlanan responsive tasarım prototipi.

## Geliştirme

```bash
npm install
npm run dev
```

## Kontroller

```bash
npm run typecheck
npm run lint
npm run build
```

Tur listesi ve yönetici tarafından değiştirilebilen tur içerikleri backend API üzerinden gelir. Fiyat, tarih ve kontenjan gibi satış verilerinin kaynağı EasyTicket'tır; ödeme işlemi sonraki fazda bağlanacaktır.

Arayüz Türkçe ve İngilizce çalışır. Dil seçimi tarayıcıda saklanır. Yönetici panelindeki `Site İçerikleri` ekranından ana sayfanın iki dildeki metinleri, Hizmetlerimiz kartları ve Instagram video bağlantıları düzenlenebilir.

## AWS test yayını

Test ortamı: <https://d2bmjk2h6qp4lz.cloudfront.net>

Yeni bir sürüm yayınlamak için:

```powershell
.\scripts\deploy-test.ps1
```

## Görsel varlıklar

`public/assets` altındaki Boğaz görselleri bu proje için OpenAI yerleşik görsel üretim aracıyla özgün olarak üretilmiştir.

Ana marka logosu, `brand/Dentur-pereme-logo.pdf` kaynağındaki Illustrator vektör yolları korunarak `public/assets/pereme-logo.svg` formatına dönüştürülmüştür.
