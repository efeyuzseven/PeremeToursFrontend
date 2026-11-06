import { invoiceTexts, type InvoiceDetails } from '../lib/invoice'
import { BookingSelect } from './BookingSelect'

export function InvoiceForm({ requested, invoice, language, onRequestedChange, onChange }: {
  requested: boolean; invoice: InvoiceDetails; language: 'tr' | 'en'
  onRequestedChange: (requested: boolean) => void; onChange: (value: InvoiceDetails) => void
}) {
  const c = invoiceTexts[language]
  const corporate = invoice.type === 'corporate'

  return <section className="reservation-invoice">
    <label className="reservation-consent"><input type="checkbox" name="wantsEInvoice" checked={requested} onChange={(event) => onRequestedChange(event.target.checked)} /><span>{c.request}</span></label>
    {requested && <>
      <small className="reservation-helper reservation-invoice__hint">{c.requestHint}</small>
      <fieldset className="reservation-invoice__details">
        <legend>{c.title}</legend>
        <div className="reservation-passenger__fields">
          <BookingSelect label={c.type} value={invoice.type}
            options={[{ value: 'individual', label: c.individual }, { value: 'corporate', label: c.corporate }]}
            onChange={(value) => onChange({ ...invoice, type: value as InvoiceDetails['type'] })} />
          <label><span className="reservation-field-label">{corporate ? c.company : c.name}</span><input name="invoice-title" autoComplete={corporate ? 'organization' : 'name'} required minLength={2} maxLength={160}
            value={invoice.title} onChange={(event) => onChange({ ...invoice, title: event.target.value })} /></label>
          <div><label><span className="reservation-field-label">{corporate ? c.taxNumber : c.identity}</span><input name="invoice-taxNumber" autoComplete="off" required inputMode="numeric"
            minLength={corporate ? 10 : 11} maxLength={11} pattern={corporate ? '[0-9]{10}|[1-9][0-9]{10}' : '[1-9][0-9]{10}'} aria-describedby="invoice-taxNumber-hint"
            value={invoice.taxNumber} onChange={(event) => onChange({ ...invoice, taxNumber: event.target.value })} /></label>
            <small className="reservation-helper" id="invoice-taxNumber-hint">{corporate ? c.taxNumberHint : c.identityHint}</small></div>
          <label><span className="reservation-field-label">{corporate ? c.taxOffice : c.taxOfficeOptional}</span><input name="invoice-taxOffice" autoComplete="off" required={corporate} minLength={corporate ? 2 : undefined} maxLength={80}
            value={invoice.taxOffice} onChange={(event) => onChange({ ...invoice, taxOffice: event.target.value })} /></label>
          <label><span className="reservation-field-label">{c.email}</span><input type="email" name="invoice-email" autoComplete="email" required maxLength={320}
            value={invoice.email} onChange={(event) => onChange({ ...invoice, email: event.target.value })} /></label>
          <label className="reservation-invoice__address"><span className="reservation-field-label">{c.address}</span><input name="invoice-address" autoComplete="street-address" required minLength={2} maxLength={500}
            value={invoice.address} onChange={(event) => onChange({ ...invoice, address: event.target.value })} /></label>
        </div>
      </fieldset>
    </>}
  </section>
}
