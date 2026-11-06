export type InvoiceDetails = {
  type: 'individual' | 'corporate'
  title: string
  taxNumber: string
  taxOffice: string
  email: string
  address: string
}

export const invoiceTexts = {
  tr: {
    request: 'E-fatura istiyorum', requestHint: 'Fatura bilgilerin ödeme onaylanıp biletler oluştuğunda muhasebe ekibimize iletilir.',
    title: 'Fatura bilgileri', type: 'Fatura tipi', individual: 'Bireysel', corporate: 'Kurumsal',
    name: 'Faturadaki ad soyad', company: 'Şirket unvanı', identity: 'T.C. kimlik no', taxNumber: 'Vergi no / T.C. kimlik no',
    identityHint: 'T.C. kimlik numarası 11 haneli olmalı.', taxNumberHint: 'Vergi numarası 10, şahıs şirketleri için T.C. kimlik numarası 11 haneli olmalı.',
    taxOffice: 'Vergi dairesi', taxOfficeOptional: 'Vergi dairesi (isteğe bağlı)', email: 'Fatura e-postası', address: 'Fatura adresi',
    invalid: 'Fatura bilgilerini kontrol et. Kurumsal faturada vergi dairesi zorunludur.',
  },
  en: {
    request: 'I want an e-invoice', requestHint: 'Your invoice details are sent to our accounting team once payment is approved and tickets are issued.',
    title: 'Invoice details', type: 'Invoice type', individual: 'Individual', corporate: 'Corporate',
    name: 'Name on invoice', company: 'Company name', identity: 'Turkish ID number', taxNumber: 'Tax number / Turkish ID number',
    identityHint: 'Turkish ID numbers must have 11 digits.', taxNumberHint: 'Tax numbers have 10 digits; sole proprietorships use the 11-digit Turkish ID number.',
    taxOffice: 'Tax office', taxOfficeOptional: 'Tax office (optional)', email: 'Invoice email', address: 'Invoice address',
    invalid: 'Please check your invoice details. Corporate invoices need a tax office.',
  },
}

export function emptyInvoice(name: string, email: string): InvoiceDetails {
  return { type: 'individual', title: name, taxNumber: '', taxOffice: '', email, address: '' }
}

// Mirrors the backend rules: individuals use an 11-digit T.C. number; companies a 10-digit tax number
// or, for a sole proprietorship, the owner's 11-digit T.C. number, plus a tax office.
export function isCompleteInvoice(invoice: InvoiceDetails) {
  const taxNumber = invoice.taxNumber.trim()
  const validTaxNumber = invoice.type === 'corporate' ? /^(\d{10}|[1-9]\d{10})$/.test(taxNumber) : /^[1-9]\d{10}$/.test(taxNumber)
  return validTaxNumber && invoice.title.trim().length >= 2 && invoice.address.trim().length >= 2
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invoice.email.trim())
    && (invoice.type === 'individual' || invoice.taxOffice.trim().length >= 2)
}

export type InvoiceRequest = ReturnType<typeof invoiceRequestBody>

export function invoiceRequestBody(invoice: InvoiceDetails) {
  return {
    type: invoice.type, title: invoice.title.trim(), taxNumber: invoice.taxNumber.trim(),
    taxOffice: invoice.taxOffice.trim() || undefined, email: invoice.email.trim(), address: invoice.address.trim(),
  }
}
