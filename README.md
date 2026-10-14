# PeremeTours Frontend

İstanbul Boğazı tur ve deneyim satışları için canlı, mobil uyumlu web sitesi. Gerçek kullanıcı, rezervasyon ve ödeme verileri içerir.

Site adı: **Dentur | Pereme Tours**. Ana adres: <https://pereme.com.tr>. `www.pereme.com.tr`, yol ve sorgu parametrelerini koruyan bir 308 yönlendirmesiyle ana adrese gider.
Sekme başlıkları, canonical ve paylaşım bilgileri `src/lib/site.ts` üzerinden yönetilir; giriş, hesap ve yönetici sayfaları `noindex` kullanır. Alan adı, DNS ve SSL geçişi tamamlandı; canlı adres normal DNS ile 2026-10-12 tarihinde masaüstü/mobil olarak doğrulandı. DNS kayıtları ve geçiş kontrolleri `infra/README.md` içindedir.

Giriş ekranındaki **Şifremi unuttum** bağlantısı `/sifremi-unuttum` sayfasını açar. TR/EN e-posta talebi ve `/sifre-sifirla` yeni şifre ekranı mevcuttur; yönetici yönlendirme notu gösterilmez, mevcut yönetici giriş yönlendirmesi korunur. E-posta bağlantısındaki tek kullanımlık kod URL fragment'inden alınır ve adres çubuğundan temizlenir; tarayıcı depolamasına yazılmaz. Şifre sıfırlandıktan sonra yerel oturum temizlenir ve yeni şifreyle yeniden giriş gerekir. Bu sayfalar `noindex, nofollow` kullanır.

Oturum açıkken **Hesabım** menüsünde **Kişisel bilgilerim**, **Rezervasyonlarım** ve **Çıkış yap** bulunur. Admin rolünde **Yönetim Paneli** doğrudan yanında görünür; mobilde de erişilebilir. `/hesabim` ekranında kullanıcı kendi ad, soyad ve e-posta bilgilerini düzenleyebilir. E-posta değişikliği mevcut şifreyle doğrulanır; şifre değişikliği mevcut şifre ve yeni şifre tekrarı ister. E-posta/şifre değişince önceki oturumlar ve sıfırlama bağlantıları geçersiz olur, yeniden giriş gerekir. Şifre değerleri tarayıcı depolamasına yazılmaz.

**Hesabımı sil** mevcut şifre, SİL / DELETE metni ve onay kutusu ister. Hesap profili anonimleştirilir ve giriş kalıcı kapatılır; rezervasyon, ödeme ve işlem kayıtları korunur. Bu işlem bilet iptali veya banka iadesi değildir. Silinen kullanıcı admin listesinden çıkar ve panelden yeniden etkinleştirilemez. Aynı e-postayla yeni hesap açılması eski rezervasyonları bağlamaz. Dağıtımın varsayılan yönetici hesabının e-postası ve silinmesi korunur; son aktif yönetici de silinemez. Bu hesapların ad/soyad ve şifre değişikliği açıktır. Hesap ekranının kodu yalnızca ilgili sayfada yüklenir.

`npm run test:live-account` yayınlanmış arayüzü masaüstü/mobil olarak kontrol eder; tüm API istekleri sahte yanıtlarla engellenir. Gerçek profil, şifre, hesap, bilet veya mail üzerinde işlem yapmaz.

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

`Tur Biletleri` sayfasında satın alma ve iptal maili durumları ayrı gösterilir; iptal maili gönderim zamanı İstanbul saatindedir. Kullanıcı hesabındaki rezervasyonlarda da ayrı iptal bildirimi durumu bulunur. `CANCELLATION_EMAIL_*` mail hataları banka reddi gibi gösterilmez. Geçmiş iptallerin satın alma maili `Sent` olsa bile bu, iptal maili gönderildiği anlamına gelmez; yeni banka onaylı iptallerin maili otomatik oluşturulur. Bu arayüz değişikliği iptal/iade veya mail yeniden gönderimi başlatmaz.

`npm run test:live`, `https://pereme.com.tr` üzerinde masaüstü ve mobil rezervasyon önizlemesini kontrol eder. Yalnızca GET/OPTIONS ve kayıt oluşturmayan fiyat doğrulama isteğine izin verir; diğer API yazma işlemlerini, özellikle ödeme başlatmayı engeller. Kart verisi göndermez. Ekran görüntüleri git'e eklenmeyen `test-results` klasörüne kaydedilir.

Arayüz Türkçe ve İngilizce çalışır. Dil seçimi tarayıcıda saklanır. Yönetici panelindeki `Site İçerikleri` ekranından ana sayfanın iki dildeki metinleri, Hizmetlerimiz kartları ve Instagram video bağlantıları düzenlenebilir.

Hizmetlerimiz bölümündeki **İlgili turları gör** bağlantıları `/turlar/turk-gecesi`, `/turlar/sunset`, `/turlar/daytime` ve `/turlar/bogaz-turu` sayfalarını açar. Her canlı tur ayrıca `/tur/{externalTourId}` detay sayfasına sahiptir; ana sayfa ve ilgili tur kartlarındaki başlıklardan erişilir. Bu sayfalardaki rezervasyon butonları mevcut canlı bilet/fiyat akışını açar; liste kartlarında fiyat gösterilmez. Gizlenen veya artık kaynak katalogda bulunmayan turların detay sayfaları yayınlanmaz.

Admin panelindeki **Tur Sayfaları** (`/admin/tour-pages`) ekranı dört hizmet sayfasını ve API'den gelen her turun detay sayfasını yönetir. TR/EN başlık, giriş, buton ve SEO metinleri ayrı saklanır. Tam genişlik veya yan yana kapak, kapak görseli, metin/öne çıkanlar/galeri bölümleri, bölüm sırası, görünürlük ve beyaz/açık mavi arka plan seçilebilir. Taslaklar dil değiştirirken korunur; kaydetmeden iki dilde canlı önizleme yapılabilir. Görseller JPG/PNG/WebP ve en fazla 8 MB olmalıdır. **Sayfayı kaydet** ile iki dil birlikte yayınlanır. Bu içerik değişiklikleri EasyTicket fiyatlarını veya seferlerini değiştirmez.

`/iletisim` ve `/sikca-sorulan-sorular` herkese açık ve mobil uyumlu yardım sayfalarıdır. SSS içerikleri yönetici panelindeki `Sıkça Sorulanlar` ekranından iki dilde eklenebilir, düzenlenebilir, sıralanabilir ve yayından kaldırılabilir.

Herkese açık ekranların sağ altında Dentur Avrasya'daki CSS gemi siluetinden uyarlanan küçük (132 × 76 px), şeffaf arka planlı, Pereme paletindeki iletişim/erişilebilirlik gemisi bulunur. Koçi/asistan görseli veya yeni bir sohbet servisi eklenmez. İletişim düğmesi `/iletisim` sayfasıyla ortak formu açar. **Mesajı gönder** butonu `/api/v1/contact-requests` üzerinden talebi sunucuya kaydeder; mevcut Dentur SMTP hesabıyla `eyilmaz@denturavrasya.com` ve `uakseloglu@denturavrasya.com` adreslerine ayrı, kalıcı gönderim işleri oluşturulur. Gösterilen onay talebin alındığını belirtir; gelen kutusuna teslim garantisi değildir. Taslak tarayıcı depolamasına yazılmaz. HTTP belirsizliğinde aynı istek anahtarı tekrar kullanılır.

Ana sayfa yönetimi `/admin/site-content` ekranındadır: TR / EN metin taslakları birlikte saklanır; ana kapak, alt banner, hikâye görselleri ve dört hizmet görseli (JPG/PNG/WebP, 8 MB) yüklenebilir, odak noktaları ve isteğe bağlı bölüm görünürlüğü değiştirilebilir. Yükleme mevcut yayını değiştirmez; **Tüm değişiklikleri kaydet** ile yayınlanır. Menü, kategori etiketleri, kayan şerit, yorum ve alt bilgi metinleri düzenlenebilir. Gerçek tur kartlarının görselleri `/admin/tour-contents`, tur/kategori sayfaları `/admin/tour-pages` ekranındadır. İçerik değişiklikleri canlı sağlayıcı fiyatlarını veya ödeme verilerini değiştirmez.

Geri Bildirimler `/admin/feedback` sayfası yalnızca Admin rolüne açıktır. Kayıtlı iletişim talepleri ad/e-posta/konu araması, yanıt durumuna göre filtre ve sayfalama ile listelenir. Detayda orijinal mesaj, iç ekip bildirimlerinin durumları ve yanıt geçmişi görünür. **Yanıtı kaydet ve mail gönder** işlemi yanıtı kalıcı gönderim kaydıyla birlikte oluşturur; alıcı formun orijinal e-posta adresidir ve istemci tarafından değiştirilemez. Mail mevcut Dentur SMTP hesabıyla, müşterinin mesaj diline göre TR/EN şablonunda gönderilir; admin yanıt metni otomatik çevrilmez. Gönderim durumu dialog açıkken takip edilir. Yanıtın kaydedilmesi, mailin gönderilmesi ve gelen kutusuna ulaşması ayrı durumlardır. Taslak tarayıcı depolamasına yazılmaz; belirsiz HTTP sonucunda aynı işlem anahtarı tekrar kullanılır. Bekleyen veya belirsiz önceki mail varken yeni gönderim engellenir. Değişmemiş yanıt tekrar mail oluşturmaz. Yeni ekranın kodu herkese açık sayfalarda yüklenmez.

Erişilebilirlik menüsü yazı boyutu, yüksek kontrast, metin aralığı, okunaklı yazı tipi, bağlantı vurgusu ve hareketleri durdurma seçeneklerini sunar. Yalnızca bu görünüm tercihleri `pereme-accessibility-settings` anahtarında cihazda saklanır; **Ayarları sıfırla** ile kaldırılır. Kart/yolcu/form değerleri okunmaz veya kaydedilmez. Hareket tercihi ve işletim sisteminin reduced-motion ayarı kodla başlatılan kaydırmalarda da dikkate alınır. Pencerelerde klavye odağı tutulur, Escape kapatır ve odağı gemiye geri verir. Gemi rezervasyon/ödeme pencereleri ve mobil menü açıkken gizlenir; yönetici ekranlarında gösterilmez veya görünüm tercihleri uygulanmaz. Bunlar yardımcı görünüm araçlarıdır; tek başına bir erişilebilirlik standardına uyum beyanı değildir.

## AWS canlı yayını

Canlı adres: <https://pereme.com.tr>. CloudFront adresi aynı canlı servisin alternatif origin'idir. AWS kaynak/script adlarındaki `test` tarihî adlandırmadır; ortam deneme veya demo değildir.

Yeni bir sürüm yayınlamak için:

```powershell
.\scripts\deploy-test.ps1
```

Canlı kullanıcıların eski bundle'ları yükleyebilmesi için yayın sırasında önceki görsel/JS/CSS dosyaları silinmez.

## Görsel varlıklar

`public/assets` altındaki Boğaz görselleri bu proje için OpenAI yerleşik görsel üretim aracıyla özgün olarak üretilmiştir.

Ana marka logosu, `brand/Dentur-pereme-logo.pdf` kaynağındaki Illustrator vektör yolları korunarak `public/assets/pereme-logo.svg` formatına dönüştürülmüştür.
