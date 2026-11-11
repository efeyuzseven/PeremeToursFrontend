import type { AdminLanguage } from './AdminLayout'

// Who started a cancellation/refund, why and when; the actor is missing when that staff user no longer exists.
export type CancellationInfo = {
  actorName?: string | null; actorEmail?: string | null; reason: string; requestedAtUtc: string; completedAtUtc?: string | null
}

const copy = {
  tr: { by: 'İadeyi yapan', unknown: 'Kullanıcı bulunamadı', reason: 'İade nedeni', at: 'İade zamanı', completed: 'tamamlandı' },
  en: { by: 'Refunded by', unknown: 'User not found', reason: 'Reason', at: 'Refund time', completed: 'completed' },
}

export default function CancellationDetails({ details, language, compact = false }: { details: CancellationInfo; language: AdminLanguage; compact?: boolean }) {
  const c = copy[language]
  const format = (value: string) => new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-GB', {
    dateStyle: compact ? 'short' : 'medium', timeStyle: 'short', timeZone: 'Europe/Istanbul',
  }).format(new Date(value))
  const requested = format(details.requestedAtUtc)
  const completed = details.completedAtUtc ? format(details.completedAtUtc) : null
  return <dl className={`cancellation-details${compact ? ' cancellation-details--compact' : ''}`}>
    <div><dt>{c.by}</dt><dd>{details.actorName
      ? <>{details.actorName}{details.actorEmail && <span>{details.actorEmail}</span>}</>
      : <em>{c.unknown}</em>}</dd></div>
    <div><dt>{c.reason}</dt><dd>{details.reason}</dd></div>
    <div><dt>{c.at}</dt><dd>{requested}{completed && completed !== requested && <span>{c.completed}: {completed}</span>}</dd></div>
  </dl>
}
