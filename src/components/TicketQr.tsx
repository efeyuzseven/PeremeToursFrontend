import { QRCodeSVG } from 'qrcode.react'

export function TicketQr({
  guid,
  label,
}: {
  guid: string | null | undefined
  label: string
}) {
  // Use only the ticket identifier issued by EasyTicket, never our order code or a guessed PNR.
  if (
    !guid ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      guid,
    ) ||
    guid === '00000000-0000-0000-0000-000000000000'
  )
    return null
  return (
    <div className="ticket-qr" data-testid="ticket-qr">
      <QRCodeSVG
        value={guid}
        size={176}
        level="Q"
        marginSize={4}
        title={label}
        role="img"
        aria-label={label}
      />
      <small>EasyTicket · {label}</small>
    </div>
  )
}
