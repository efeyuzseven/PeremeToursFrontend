import DOMPurify from 'dompurify'
import { Download, FileText } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import PublicPageLayout, { type PublicLanguage } from './PublicPageLayout'
import { setPageMetadata } from '../lib/site'
import contractTr from '../content/contracts/mesafeli-satis-sozlesmesi-tr.html?raw'
import contractEn from '../content/contracts/mesafeli-satis-sozlesmesi-en.html?raw'
import contractTrDocx from '../content/contracts/mesafeli-satis-sozlesmesi-tr.docx?url'
import contractEnDocx from '../content/contracts/mesafeli-satis-sozlesmesi-en.docx?url'

const copy = {
  tr: {
    eyebrow: 'SÖZLEŞMELER', title: 'Mesafeli Satış', accent: 'Sözleşmesi', subtitle: 'Elektronik bilet satışı ve yolcu taşıma koşulları',
    seller: 'SATICI', download: 'Word olarak indir', fileName: 'Dentur Avrasya Mesafeli Satış Sözleşmesi.docx',
    description: 'Dentur | Pereme Tours üzerinden satın alınan biletler için geçerli mesafeli satış sözleşmesi.',
    html: contractTr, docx: contractTrDocx,
  },
  en: {
    eyebrow: 'AGREEMENTS', title: 'Distance Sales', accent: 'Agreement', subtitle: 'Electronic ticket sales and passenger transportation terms',
    seller: 'SELLER', download: 'Download as Word', fileName: 'Dentur Avrasya Distance Sales Agreement.docx',
    description: 'The distance sales agreement for tickets purchased through Dentur | Pereme Tours.',
    html: contractEn, docx: contractEnDocx,
  },
}

// The documents are generated from the signed .docx files; the page supplies its own heading.
function contractBody(source: string) {
  const parsed = new DOMParser().parseFromString(source, 'text/html')
  parsed.querySelector('h1')?.remove()
  return DOMPurify.sanitize(parsed.body.innerHTML, {
    ALLOWED_TAGS: ['h2', 'h3', 'p', 'strong', 'table', 'tbody', 'tr', 'th', 'td'],
    ALLOWED_ATTR: ['class', 'scope'],
  })
}

function ContractContent({ language }: { language: PublicLanguage }) {
  const c = copy[language]
  const body = useMemo(() => contractBody(c.html), [c.html])

  useEffect(() => {
    setPageMetadata({ title: `${c.title} ${c.accent}`, description: c.description, language })
  }, [c, language])

  return <>
    <section className="info-hero legal-hero">
      <div className="info-hero__rings" />
      <div className="shell">
        <span><FileText /> {c.eyebrow}</span>
        <h1>{c.title} <em>{c.accent}</em></h1>
        <p>{c.subtitle}</p>
      </div>
    </section>

    <section className="legal-section">
      <article className="shell legal-document contract-document" lang={language}>
        <div className="legal-document__intro">
          <span>{c.seller}</span>
          <h2>Avrasya Deniz Taşımacılığı Turizm Hizmetleri İnşaat Sanayi ve Ticaret A.Ş.</h2>
          <strong>(“Dentur Avrasya”)</strong>
          <a className="contract-download" href={c.docx} download={c.fileName}><Download /> {c.download}</a>
        </div>
        <div className="contract-document__body" dangerouslySetInnerHTML={{ __html: body }} />
      </article>
    </section>
  </>
}

export default function ContractPage() {
  return <PublicPageLayout>{(language) => <ContractContent language={language} />}</PublicPageLayout>
}
