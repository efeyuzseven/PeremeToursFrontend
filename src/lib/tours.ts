import { apiRequest } from './api'

export type TourPrice = {
  externalPriceId: number
  externalPassengerTypeId: number
  passengerType: string
  passengerTypeEn?: string | null
  amount: number
  currency: string
  taxRate: number
}

export type TourDeparture = {
  externalId: number
  externalTripId: number
  externalPortId: number
  portName: string
  date: string | null
  time: string | null
}

export type TourPort = { externalPortId: number; name: string; displayOrder: number }
export type TourAvailability = {
  externalTourId: number
  tourName: string
  prices: TourPrice[]
  departures: TourDeparture[]
  bookingNote?: string | null
  bookingNoteEn?: string | null
}
export type PortAvailability = { port: TourPort; availability: TourAvailability }

export type TourQuote = {
  externalTourId: number
  tourName: string
  portName: string
  tourDate: string
  departureTime: string
  tickets: { externalPriceId: number; ticketType: string; ticketTypeEn?: string | null; quantity: number; unitAmount: number; amount: number }[]
  guestCount: number
  amount: number
  currency: string
  checkedAtUtc: string
}

export async function loadTourBookingOptions(tourId: number, signal: AbortSignal): Promise<PortAvailability[]> {
  const ports = await apiRequest<TourPort[]>(`/api/v1/tours/${tourId}/ports`, { signal, cache: 'no-store' })
  return Promise.all(ports.map(async (port) => ({
    port,
    availability: await apiRequest<TourAvailability>(
      `/api/v1/tours/${tourId}/availability?departurePortId=${port.externalPortId}&saleType=2`,
      { signal, cache: 'no-store' },
    ),
  })))
}

export function isTryPrice(price: TourPrice) {
  return price.externalPriceId > 0 && price.amount >= 0 && ['TRY', 'TL'].includes(price.currency.toUpperCase())
}

export function isUpcomingDeparture(departure: TourDeparture, now = Date.now()) {
  // EasyTicket dates and times are local to Istanbul, not the visitor's time zone.
  return departure.externalId > 0 && !!departure.date && !!departure.time
    && new Date(`${departure.date}T${departure.time}+03:00`).getTime() > now
}

export function getStartingPrice(options: PortAvailability[], date: string): number | null {
  const amounts = options.flatMap(({ availability }) =>
    availability.departures.some((departure) => departure.date === date && isUpcomingDeparture(departure))
      ? availability.prices.filter((price) => isTryPrice(price) && price.amount > 0).map((price) => price.amount)
      : [],
  )
  return amounts.length ? Math.min(...amounts) : null
}

export function formatMoney(amount: number, language: 'tr' | 'en', currency = 'TRY') {
  return new Intl.NumberFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
    style: 'currency', currency, maximumFractionDigits: 2,
  }).format(amount)
}
