import type { PassengerDetails } from './passengers'
import type { TourQuote } from './tours'

export const paymentRecoveryKey = 'pereme-payment-attempt'
export function getPaymentRecovery(): string | null {
  try {
    const value = sessionStorage.getItem(paymentRecoveryKey)
    return value && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null
  } catch { return null }
}

export type PaymentCard = { holderName: string; number: string; securityCode: string; expiryMonth: number; expiryYear: number }
export type PaymentAvailability = { enabled: boolean; provider: string }
export type PaymentStart = { ticketId: string; ticketCode: string; amount: number; currency: string; threeDSecureUrl: string }
export type PaymentStatus = {
  ticketCode: string; amount: number; currency: string
  paymentStatus: 'Pending' | 'Processing' | 'Paid' | 'Failed' | 'ReviewRequired' | 'Refunded'
  ticketingStatus: 'Pending' | 'Processing' | 'Issued' | 'ReviewRequired'
  tickets: { pnr: string | null; ticketGuid: string | null }[]
  emailStatus?: 'Queued' | 'Processing' | 'Sent' | 'Failed' | 'ReviewRequired' | null
}
export type PaymentBooking = {
  quote: TourQuote; externalTourId: number; externalDeparturePortId: number; externalDepartureId: number
  passengers: (PassengerDetails & { externalPriceId: number })[]
  contact: { name: string; email: string; phone: string }; privacyNoticeAccepted: boolean
}

export function validPaymentCard(card: PaymentCard, today: string): boolean {
  const number = card.number.replace(/[ -]/g, '')
  if (!/^[0-9]{13,19}$/.test(number) || !/^[0-9]{3,4}$/.test(card.securityCode)
    || card.holderName.trim().length < 2 || card.holderName.trim().length > 160
    || card.expiryMonth < 1 || card.expiryMonth > 12) return false
  const [year, month] = today.split('-').map(Number)
  if (card.expiryYear < year || card.expiryYear > year + 20 || (card.expiryYear === year && card.expiryMonth < month)) return false
  let sum = 0
  for (let i = number.length - 1, double = false; i >= 0; i--, double = !double) {
    let digit = Number(number[i])
    if (double) { digit *= 2; if (digit > 9) digit -= 9 }
    sum += digit
  }
  return sum % 10 === 0
}

export const paymentTexts = {
  tr: {
    title: 'Ödeme Bilgileri', hint: 'Ödeme Ziraat Sanal POS ve 3D Secure doğrulamasıyla yapılır. Kart numarası ve CVC sunucuda kaydedilmez.',
    next: 'Kart bilgilerini, rezervasyon bilgilerini kontrol ettikten sonra girebilirsin.',
    unavailable: 'Ödeme sistemi şu anda kullanılamıyor. Kart bilgisi alınmaz ve tahsilat başlatılmaz.',
    holder: 'Kart Üzerindeki İsim', number: 'Kart Numarası', month: 'Son Kullanma Ayı', year: 'Son Kullanma Yılı',
    monthPlaceholder: 'AA', yearPlaceholder: 'YYYY', invalid: 'Kart numarası, son kullanma tarihi ve CVC bilgilerini kontrol et.',
    pay: 'Güvenli ödeme yap', starting: 'Banka doğrulaması başlatılıyor…', bankTitle: '3D Secure doğrulaması',
    bankHint: 'İşlemi bankanın doğrulama ekranından tamamla. Bu aşamada pencereyi kapatma veya yeni ödeme başlatma.',
    failed: 'Ödeme tamamlanamadı', failedHint: 'Banka işlemi onaylamadı. Kart bilgilerini kontrol edip yeniden deneyebilirsin.',
    success: 'Biletlerin hazır!', paid: 'Ödemen alındı', paidHint: 'Biletlerin kontrol ediliyor. Tekrar ödeme yapma; sipariş koduyla destek ekibine ulaş.',
    uncertain: 'Ödeme sonucu kontrol ediliyor', uncertainHint: 'Banka sonucu henüz kesinleşmedi. Tekrar ödeme yapma; sipariş koduyla destek ekibine ulaş.',
    code: 'Sipariş kodu', pnr: 'Bilet / PNR', support: 'Destek ekibine ulaş', check: 'Ödeme sonucunu kontrol et', retry: 'Tekrar dene',
    error: 'İşlem başlatılamadı. Lütfen tekrar dene.', changed: 'Fiyat veya seçim değişmiş olabilir. Bilgileri düzenleyip güncel tutarı yeniden kontrol et.',
    confirming: 'Ödeme sonucu doğrulanıyor…', secure: '3D Secure · Ziraat Sanal POS', acknowledge: 'Gösterilen tutarı ödemeyi onaylıyorum.',
  },
  en: {
    title: 'Payment details', hint: 'Payment uses Ziraat Virtual POS and 3D Secure verification. Card numbers and CVC are not saved on the server.',
    next: 'Enter your card details after reviewing your booking.', unavailable: 'Payments are currently unavailable. No card details are collected or charges started.',
    holder: 'Name on card', number: 'Card number', month: 'Expiry month', year: 'Expiry year', monthPlaceholder: 'MM', yearPlaceholder: 'YYYY',
    invalid: 'Please check your card number, expiry date and CVC.', pay: 'Pay securely', starting: 'Starting bank verification…', bankTitle: '3D Secure verification',
    bankHint: 'Complete the bank verification below. Do not close this window or start another payment.',
    failed: 'Payment unsuccessful', failedHint: 'The bank did not approve the transaction. Check your card details before trying again.',
    success: 'Your tickets are ready!', paid: 'Payment received', paidHint: 'Your tickets are being checked. Do not pay again; contact support with your order code.',
    uncertain: 'Checking your payment', uncertainHint: 'The bank result has not been confirmed. Do not pay again; contact support with your order code.',
    code: 'Order code', pnr: 'Ticket / PNR', support: 'Contact support', check: 'Check payment status', retry: 'Try again',
    error: 'Payment could not be started. Please try again.', changed: 'The price or selection may have changed. Edit your details and check the current total again.',
    confirming: 'Verifying the payment result…', secure: '3D Secure · Ziraat Virtual POS', acknowledge: 'I confirm payment of the displayed amount.',
  },
}
