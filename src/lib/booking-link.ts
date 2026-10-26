// Booking links open a tour page with the reservation drawer already filled in, e.g.
// /tur/2?iskele=3&tarih=2026-10-24&saat=20:30&bilet=145:2,146:1 (sefer=<departure id> is also accepted).
export type BookingLinkSelection = {
  date?: string
  time?: string
  portId?: number
  departureId?: number
  tickets?: Record<number, number>
}

export const bookingLinkParams = ['iskele', 'tarih', 'saat', 'sefer', 'bilet'] as const

const positiveId = (value: string | null) => value && /^[1-9]\d{0,9}$/.test(value) && Number(value) <= 2147483647 ? Number(value) : undefined

export function parseBookingLink(params: URLSearchParams): BookingLinkSelection | null {
  if (!bookingLinkParams.some((name) => params.has(name))) return null
  const date = params.get('tarih') ?? ''
  const time = params.get('saat') ?? ''
  const tickets: Record<number, number> = {}
  let guests = 0
  for (const item of (params.get('bilet') ?? '').split(',')) {
    const [id, quantity] = item.split(':')
    const priceId = positiveId(id)
    const count = /^\d{1,2}$/.test(quantity ?? '') ? Number(quantity) : 0
    if (!priceId || count < 1 || tickets[priceId] || guests + count > 12) continue
    tickets[priceId] = count
    guests += count
  }
  return {
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
    time: /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : undefined,
    portId: positiveId(params.get('iskele')),
    departureId: positiveId(params.get('sefer')),
    tickets: guests > 0 ? tickets : undefined,
  }
}
