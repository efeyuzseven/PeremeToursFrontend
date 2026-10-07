import { Mail, ShieldCheck } from 'lucide-react'
import { useEffect } from 'react'
import PublicPageLayout from './PublicPageLayout'
import { setPageMetadata } from '../lib/site'

function KvkkContent() {
  useEffect(() => {
    setPageMetadata({ title: 'KVKK Aydınlatma Metni', language: 'tr' })
  }, [])

  return <>
    <section className="info-hero legal-hero">
      <div className="info-hero__rings" />
      <div className="shell">
        <span><ShieldCheck /> KİŞİSEL VERİLERİN KORUNMASI</span>
        <h1>Kişisel Verilerin Korunması <em>ve İşlenmesi</em></h1>
        <p>Aydınlatma Metni</p>
      </div>
    </section>

    <section className="legal-section">
      <article className="shell legal-document">
        <div className="legal-document__intro">
          <span>VERİ SORUMLUSU</span>
          <h2>Avrasya Deniz Taşımacılığı Turizm Hizmetleri İnşaat Sanayi ve Ticaret A.Ş.</h2>
          <strong>(“Dentur Avrasya”)</strong>
          <p>Dentur Avrasya olarak, <b>6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK)</b> kapsamında kişisel verilerinizin güvenliğine ve gizliliğine büyük önem vermekteyiz. Bu aydınlatma metni; biletleme, rezervasyon ve seyahat hizmetleri sırasında kişisel verilerinizin hangi amaçlarla işlendiğini açıklamak amacıyla hazırlanmıştır.</p>
        </div>

        <section>
          <header><span>01</span><h2>İşlenen Kişisel Veriler</h2></header>
          <div className="legal-data-grid">
            <div><h3>Kimlik Bilgileri</h3><p>Ad, soyad, T.C. kimlik numarası, pasaport numarası, doğum tarihi ve uyruk bilgileri.</p></div>
            <div><h3>İletişim Bilgileri</h3><p>Telefon numarası, e-posta adresi ve adres bilgileri.</p></div>
            <div><h3>Ödeme Bilgileri</h3><p>Kredi kartı veya banka kartı bilgileriniz yalnızca ödeme işlemlerinin gerçekleştirilmesi amacıyla yetkili ödeme kuruluşları aracılığıyla işlenmektedir.</p></div>
            <div><h3>Seyahat Bilgileri</h3><p>Güzergâh, sefer tarihi ve bilet numarası bilgileri.</p></div>
          </div>
        </section>

        <section>
          <header><span>02</span><h2>Verilerin İşlenme Amaçları</h2></header>
          <ul>
            <li>Biletleme işlemlerinin gerçekleştirilmesi ve seyahat sözleşmesinin ifası.</li>
            <li>Gümrük ve liman geçiş işlemlerinin ilgili mevzuata uygun yürütülmesi.</li>
            <li>İptal, iade ve sefer değişiklikleri hakkında bilgilendirme yapılması.</li>
            <li>Müşteri talep, öneri ve şikâyetlerinin değerlendirilmesi.</li>
            <li>Yasal yükümlülüklerin yerine getirilmesi.</li>
          </ul>
        </section>

        <section>
          <header><span>03</span><h2>Verilerin Aktarılabileceği Taraflar</h2></header>
          <ul>
            <li>Emniyet Genel Müdürlüğü</li>
            <li>Gümrük Müdürlükleri</li>
            <li>Liman Başkanlıkları</li>
            <li>Bankalar ve ödeme kuruluşları</li>
            <li>Yetkili acenteler ve iş ortakları</li>
          </ul>
        </section>

        <section>
          <header><span>04</span><h2>Haklarınız</h2></header>
          <p>KVKK'nın 11. maddesi kapsamında; kişisel verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini isteme, silinmesini veya yok edilmesini talep etme, işleme faaliyetlerine itiraz etme ve Kanun kapsamındaki diğer haklarınızı kullanabilirsiniz.</p>
        </section>

        <aside className="legal-contact">
          <span><Mail /></span>
          <div><small>KVKK BAŞVURU İLETİŞİM</small><h2>KVKK kapsamındaki tüm taleplerinizi aşağıdaki e-posta adresi üzerinden yazılı olarak iletebilirsiniz.</h2><a href="mailto:dentur@denturavrasya.com">dentur@denturavrasya.com</a></div>
        </aside>
      </article>
    </section>
  </>
}

export default function KvkkPage() {
  return <PublicPageLayout>{() => <KvkkContent />}</PublicPageLayout>
}
