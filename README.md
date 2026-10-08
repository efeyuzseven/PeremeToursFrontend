# PeremeTours Frontend

İstanbul Boğazı tur ve deneyim satış sitesi için hazırlanan responsive tasarım prototipi.

Site adı: **Dentur | Pereme Tours**. Resmî adres: <https://www.pereme.com.tr>.
Sekme başlıkları, canonical ve paylaşım bilgileri `src/lib/site.ts` üzerinden yönetilir; giriş, hesap ve yönetici sayfaları `noindex` kullanır. Alan adının AWS'ye yönlendirilmesi tamamlanana kadar mevcut CloudFront test adresi kullanılmaya devam eder.

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

Tur listesi ve yönetici tarafından değiştirilebilen tur içerikleri backend API üzerinden gelir. Tur kartlarında fiyat ve tarih gösterilmez; yalnızca rezervasyon butonu bulunur. Rezervasyon ekranı açıldığında kalkış noktası, tarih/saat, bilet tipleri, TR/EN bilet notları ve güncel fiyatlar EasyTicket'tan alınır. API hatasında örnek fiyat kullanılmaz. Farklı bilet tiplerinden ayrı ayrı adet seçilebilir (toplam 1–12 misafir).

İletişim ve yolcu bilgileri girildikten sonra **Bilgileri Kontrol et ve Ödemeye geç** butonu alanları doğrular; `POST /api/v1/tours/quote` güncel fiyatı sunucuda tekrar kontrol eder. Başarılı doğrulamanın ardından rezervasyon özeti ve ödeme bilgileri gösterilir. İlk formda ve doğrulama sürerken kart alanları bulunmaz; bilgiler düzenlenmek üzere geri dönüldüğünde de kaldırılır. Kişisel bilgiler fiyat sorgusunda sunucuya gönderilmez veya kaydedilmez. Bu buton ödeme başlatmaz, rezervasyon oluşturmaz ve yer ayırmaz. Kontenjan sayıları API tarafından sunulmadığı için arayüzde tahmini kontenjan gösterilmez.

Her seçilen bilet için ad, soyad, cinsiyet, uyruk (T.C./yabancı), T.C. kimlik/pasaport numarası ve doğum tarihi girilir. T.C. numarası için 11 haneli biçim, pasaport için doluluk ve doğum tarihi için gelecekte olmama kontrolü yapılır; resmî kimlik doğrulaması yapılmaz. Önizlemede kimlik/pasaport numarası maskelenir. Bilet adedi azaltıldığında çıkarılan yolcunun bilgileri silinir; kişisel veriler tarayıcı depolamasına veya fiyat sorgusuna eklenmez.

Birden fazla yolcu varsa hem bilgi girişindeki hem özetteki yolcu listesi kendi sınırlı alanında kaydırılır. Başlık alanın dışında kalır; tek yolcuda iç kaydırma kullanılmaz. Alan klavyeyle odaklanabilir ve listenin sonuna gelindiğinde kaydırma ana panele aktarılmaz.

Kart üzerindeki isim, kart numarası, son kullanma ayı/yılı ve CVC alanları yalnızca ödeme adımında gösterilir. Etkinlik durumu `GET /api/v1/payments/availability` üzerinden alınır; ödeme kapalıysa kart alanları devre dışıdır. Kullanıcı tutarı ayrıca onaylayıp güvenli ödeme butonuna basınca Ziraat Sanal POS / 3D Secure işlemi başlar. Kart bilgileri tarayıcı depolamasına yazılmaz.

Playwright testleri yerel Microsoft Edge üzerinde masaüstü ve mobil boyutlarda çalışır; gerçek API/ödeme yerine test verileri kullanılır.

`npm run test:live`, AWS test sitesinde masaüstü ve mobil rezervasyon önizlemesini kontrol eder. Yalnızca canlı fiyat sorgusu yapar; kayıt oluşturmaz veya banka işlemi başlatmaz. Ekran görüntüleri git'e eklenmeyen `test-results` klasörüne kaydedilir.

Arayüz Türkçe ve İngilizce çalışır. Dil seçimi tarayıcıda saklanır. Yönetici panelindeki `Site İçerikleri` ekranından ana sayfanın iki dildeki metinleri, Hizmetlerimiz kartları ve Instagram video bağlantıları düzenlenebilir.

Hizmetlerimiz bölümündeki **İlgili turları gör** bağlantıları `/turlar/turk-gecesi`, `/turlar/sunset`, `/turlar/daytime` ve `/turlar/bogaz-turu` sayfalarını açar. Her canlı tur ayrıca `/tur/{externalTourId}` detay sayfasına sahiptir; ana sayfa ve ilgili tur kartlarındaki başlıklardan erişilir. Bu sayfalardaki rezervasyon butonları mevcut canlı bilet/fiyat akışını açar; liste kartlarında fiyat gösterilmez. Gizlenen veya artık kaynak katalogda bulunmayan turların detay sayfaları yayınlanmaz.

Admin panelindeki **Tur Sayfaları** (`/admin/tour-pages`) ekranı dört hizmet sayfasını ve API'den gelen her turun detay sayfasını yönetir. TR/EN başlık, giriş, buton ve SEO metinleri ayrı saklanır. Tam genişlik veya yan yana kapak, kapak görseli, metin/öne çıkanlar/galeri bölümleri, bölüm sırası, görünürlük ve beyaz/açık mavi arka plan seçilebilir. Taslaklar dil değiştirirken korunur; kaydetmeden iki dilde canlı önizleme yapılabilir. Görseller JPG/PNG/WebP ve en fazla 8 MB olmalıdır. **Sayfayı kaydet** ile iki dil birlikte yayınlanır. Bu içerik değişiklikleri EasyTicket fiyatlarını veya seferlerini değiştirmez.

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
