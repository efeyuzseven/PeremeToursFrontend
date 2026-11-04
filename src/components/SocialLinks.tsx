import { INSTAGRAM_PROFILE_URL, X_PROFILE_URL } from '../lib/site'
import './social-links.css'

// lucide-react no longer ships brand logos, so the two marks are drawn here.
export function InstagramIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
}

export function XIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="-1.5 -1.5 27 27" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
}

// Icon-only links to the social accounts, used in both site headers.
export default function SocialLinks({ className = '' }: { className?: string }) {
  return <div className={`social-links ${className}`.trim()}>
    <a href={INSTAGRAM_PROFILE_URL} target="_blank" rel="noopener noreferrer" aria-label="Dentur Pereme Instagram" title="Instagram"><InstagramIcon /></a>
    <a href={X_PROFILE_URL} target="_blank" rel="noopener noreferrer" aria-label="Dentur Grup X" title="X"><XIcon /></a>
  </div>
}
