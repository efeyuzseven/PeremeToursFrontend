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
npm run test:e2e
```

Tur listesi ve yönetici tarafından değiştirilebilen tur içerikleri backend API üzerinden gelir. Kartlar, arama alanındaki tarih için EasyTicket'tan gelen en düşük pozitif TL bilet fiyatını gösterir. API hatasında örnek fiyat kullanılmaz. Rezervasyon ekranı açıldığında kalkış noktası, tarih/saat, bilet tipleri, TR/EN bilet notları ve fiyatlar yeniden alınır. Farklı bilet tiplerinden ayrı ayrı adet seçilebilir (toplam 1–12 misafir).

Ad soyad, e-posta ve telefon girildikten sonra `POST /api/v1/tours/quote` güncel fiyatı sunucuda tekrar doğrular ve bir önizleme gösterilir. Kişisel bilgiler bu aşamada sunucuya gönderilmez veya kaydedilmez. Ödeme/bilet kesimi kapalıdır; önizleme bir rezervasyon oluşturmaz ve yer ayırmaz. Kontenjan sayıları API tarafından sunulmadığı için arayüzde tahmini kontenjan gösterilmez.

Playwright testleri yerel Microsoft Edge üzerinde masaüstü ve mobil boyutlarda çalışır; gerçek API/ödeme yerine test verileri kullanılır.

`npm run test:live`, AWS test sitesinde masaüstü ve mobil rezervasyon önizlemesini kontrol eder. Yalnızca canlı fiyat sorgusu yapar; kayıt oluşturmaz veya banka işlemi başlatmaz. Ekran görüntüleri git'e eklenmeyen `test-results` klasörüne kaydedilir.

Arayüz Türkçe ve İngilizce çalışır. Dil seçimi tarayıcıda saklanır. Yönetici panelindeki `Site İçerikleri` ekranından ana sayfanın iki dildeki metinleri, Hizmetlerimiz kartları ve Instagram video bağlantıları düzenlenebilir.

`/iletisim` ve `/sikca-sorulan-sorular` herkese açık ve mobil uyumlu yardım sayfalarıdır. SSS içerikleri yönetici panelindeki `Sıkça Sorulanlar` ekranından iki dilde eklenebilir, düzenlenebilir, sıralanabilir ve yayından kaldırılabilir.

## AWS test yayını

Test ortamı: <https://d2bmjk2h6qp4lz.cloudfront.net>

Yeni bir sürüm yayınlamak için:

```powershell
.\scripts\deploy-test.ps1
```

## Görsel varlıklar

`public/assets` altındaki Boğaz görselleri bu proje için OpenAI yerleşik görsel üretim aracıyla özgün olarak üretilmiştir.

Ana marka logosu, `brand/Dentur-pereme-logo.pdf` kaynağındaki Illustrator vektör yolları korunarak `public/assets/pereme-logo.svg` formatına dönüştürülmüştür.
