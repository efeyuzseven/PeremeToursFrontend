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

Tur içerikleri ve fiyatlar demo verisidir. Gerçek envanter, kullanıcı hesabı ve ödeme sistemi sonraki fazda API üzerinden bağlanacaktır.

## AWS test yayını

Test ortamı: <https://d2bmjk2h6qp4lz.cloudfront.net>

Yeni bir sürüm yayınlamak için:

```powershell
.\scripts\deploy-test.ps1
```

## Görsel varlıklar

`public/assets` altındaki Boğaz görselleri bu proje için OpenAI yerleşik görsel üretim aracıyla özgün olarak üretilmiştir.

Ana marka logosu, `brand/Dentur-pereme-logo.pdf` kaynağındaki Illustrator vektör yolları korunarak `public/assets/pereme-logo.svg` formatına dönüştürülmüştür.
