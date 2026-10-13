import { Accessibility, ALargeSmall, Contrast, Link2, Mail, MoveHorizontal, Pause, RotateCcw, Type, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import ContactForm from './ContactForm'
import './floating-support.css'

type Language = 'tr' | 'en'
type Settings = { textSize: 0 | 1 | 2; contrast: boolean; spacing: boolean; readableFont: boolean; highlightLinks: boolean; pauseMotion: boolean }
const defaults: Settings = { textSize: 0, contrast: false, spacing: false, readableFont: false, highlightLinks: false, pauseMotion: false }
const storageKey = 'pereme-accessibility-settings'
function readSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? '{}') as Partial<Settings> | null
    return { textSize: saved?.textSize === 1 || saved?.textSize === 2 ? saved.textSize : 0,
      contrast: saved?.contrast === true, spacing: saved?.spacing === true, readableFont: saved?.readableFont === true,
      highlightLinks: saved?.highlightLinks === true, pauseMotion: saved?.pauseMotion === true }
  } catch { return { ...defaults } }
}
function subscribeLanguage(notify: () => void) {
  const observer = new MutationObserver(notify)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
  return () => observer.disconnect()
}
const getLanguage = (): Language => document.documentElement.lang === 'en' ? 'en' : 'tr'
function subscribeOverlays(notify: () => void) {
  const observer = new MutationObserver(notify)
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'aria-hidden', 'aria-modal'] })
  return () => observer.disconnect()
}
const hasOverlay = () => Array.from(document.querySelectorAll<HTMLElement>(
  '[role="dialog"][aria-modal="true"]:not([data-pereme-support-panel]), .mobile-menu--open, .info-mobile-menu.is-open',
)).some((node) => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden')
const copy = {
  tr: { group: 'İletişim ve erişilebilirlik', contact: 'İletişim', openContact: 'İletişim formunu aç', accessibility: 'Erişilebilirlik', openAccessibility: 'Erişilebilirlik menüsünü aç',
    contactTitle: 'Nasıl yardımcı olabiliriz?', contactIntro: 'Sorunu veya talebini bizimle paylaş.', contactPage: 'İletişim sayfasına git',
    settingsTitle: 'Erişilebilirlik ayarları', settingsIntro: 'Görünümü kendine göre düzenle. Tercihlerin yalnızca bu cihazda saklanır.',
    textSize: 'Yazı boyutu', sizes: ['Standart', 'Büyük', 'Daha büyük'], contrast: 'Yüksek kontrast', spacing: 'Metin aralığı', readableFont: 'Okunaklı yazı tipi',
    highlightLinks: 'Bağlantıları vurgula', pauseMotion: 'Hareketleri durdur', reset: 'Ayarları sıfırla', close: 'Kapat' },
  en: { group: 'Contact and accessibility', contact: 'Contact', openContact: 'Open contact form', accessibility: 'Accessibility', openAccessibility: 'Open accessibility menu',
    contactTitle: 'How can we help?', contactIntro: 'Share your question or request with us.', contactPage: 'Go to the contact page',
    settingsTitle: 'Accessibility settings', settingsIntro: 'Adjust the view to suit you. Preferences are saved only on this device.',
    textSize: 'Text size', sizes: ['Default', 'Large', 'Larger'], contrast: 'High contrast', spacing: 'Text spacing', readableFont: 'Readable font',
    highlightLinks: 'Highlight links', pauseMotion: 'Pause animations', reset: 'Reset settings', close: 'Close' },
}

export default function FloatingSupport() {
  const location = useLocation()
  const language = useSyncExternalStore(subscribeLanguage, getLanguage)
  const overlay = useSyncExternalStore(subscribeOverlays, hasOverlay)
  const [settings, setSettings] = useState<Settings>(readSettings)
  const [panel, setPanel] = useState<{ type: 'contact' | 'accessibility'; path: string } | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const close = useCallback(() => setPanel(null), [])
  const isAdmin = location.pathname === '/admin' || location.pathname.startsWith('/admin/')
  const c = copy[language]
  const currentPanel = panel?.path === location.pathname && !isAdmin && !overlay ? panel.type : null

  useEffect(() => {
    window.addEventListener('popstate', close)
    return () => window.removeEventListener('popstate', close)
  }, [close])

  useEffect(() => {
    const root = document.documentElement
    for (const [key, value] of Object.entries(settings)) {
      const attribute = `data-pereme-a11y-${key.toLowerCase()}`
      if (isAdmin || value === false || value === 0) root.removeAttribute(attribute)
      else root.setAttribute(attribute, String(value))
    }
    return () => { for (const key of Object.keys(defaults)) root.removeAttribute(`data-pereme-a11y-${key.toLowerCase()}`) }
  }, [settings, isAdmin])

  const updateSettings = (next: Settings) => {
    setSettings(next)
    try {
      if (Object.keys(defaults).every((key) => next[key as keyof Settings] === defaults[key as keyof Settings])) localStorage.removeItem(storageKey)
      else localStorage.setItem(storageKey, JSON.stringify(next))
    } catch { /* Controls continue to work in memory when browser storage is unavailable. */ }
  }
  const toggles = [
    ['contrast', Contrast], ['spacing', MoveHorizontal], ['readableFont', Type], ['highlightLinks', Link2], ['pauseMotion', Pause],
  ] as const
  if (isAdmin) return null
  return createPortal(<>
    {!overlay && <div className="pereme-support-ship" role="group" aria-label={c.group} inert={!!currentPanel}>
      <span className="pereme-ship-superstructure" aria-hidden="true"><span className="pereme-ship-windows" /></span>
      <span className="pereme-ship-funnel" aria-hidden="true" />
      <button className="pereme-ship-action pereme-ship-action--contact" type="button" aria-label={c.openContact} title={c.contact} aria-haspopup="dialog" aria-expanded={currentPanel === 'contact'} onClick={(event) => { trigger.current = event.currentTarget; setPanel({ type: 'contact', path: location.pathname }) }}><Mail aria-hidden="true" /><span>{c.contact}</span></button>
      <button className="pereme-ship-action pereme-ship-action--accessibility" type="button" aria-label={c.openAccessibility} title={c.accessibility} aria-haspopup="dialog" aria-expanded={currentPanel === 'accessibility'} onClick={(event) => { trigger.current = event.currentTarget; setPanel({ type: 'accessibility', path: location.pathname }) }}><Accessibility aria-hidden="true" /><span>{c.accessibility}</span></button>
    </div>}
    {currentPanel && <SupportPanel title={currentPanel === 'contact' ? c.contactTitle : c.settingsTitle} intro={currentPanel === 'contact' ? c.contactIntro : c.settingsIntro} closeLabel={c.close} onClose={close} returnFocus={trigger}>
      {currentPanel === 'contact' ? <>
        <ContactForm language={language} />
        <Link className="pereme-support-page-link" to="/iletisim" onClick={close}>{c.contactPage}</Link>
      </> : <>
        <fieldset className="pereme-a11y-text-size"><legend><ALargeSmall size={18} />{c.textSize}</legend><div>{c.sizes.map((label, index) => <button type="button" key={label} aria-pressed={settings.textSize === index} onClick={() => updateSettings({ ...settings, textSize: index as Settings['textSize'] })}>{label}</button>)}</div></fieldset>
        <div className="pereme-a11y-tools">{toggles.map(([key, Icon]) => <button type="button" role="switch" aria-checked={settings[key]} key={key} onClick={() => updateSettings({ ...settings, [key]: !settings[key] })}><Icon size={18} aria-hidden="true" /><span>{c[key]}</span><i aria-hidden="true" /></button>)}</div>
        <button className="pereme-a11y-reset" type="button" onClick={() => updateSettings({ ...defaults })}><RotateCcw size={16} />{c.reset}</button>
      </>}
    </SupportPanel>}
  </>, document.body)
}

function SupportPanel({ title, intro, closeLabel, onClose, returnFocus, children }: {
  title: string; intro: string; closeLabel: string; onClose: () => void; returnFocus: RefObject<HTMLButtonElement | null>; children: ReactNode
}) {
  const dialog = useRef<HTMLElement>(null)
  useEffect(() => {
    const previous = returnFocus.current
    const root = document.getElementById('root')
    const inert = root?.inert ?? false
    const overflow = document.body.style.overflow
    if (root) root.inert = true
    document.body.style.overflow = 'hidden'
    dialog.current?.focus()
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose() }
      if (event.key !== 'Tab') return
      const nodes = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href]')
      if (!nodes?.length) { event.preventDefault(); return }
      const first = nodes[0], last = nodes[nodes.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keyboard)
    return () => {
      document.removeEventListener('keydown', keyboard)
      if (root) root.inert = inert
      document.body.style.overflow = overflow
      requestAnimationFrame(() => { if (previous?.isConnected) previous.focus() })
    }
  }, [onClose, returnFocus])
  return <div className="pereme-support-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="pereme-support-panel" ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="pereme-support-title" aria-describedby="pereme-support-intro" data-pereme-support-panel>
      <header><div><small>DENTUR | PEREME TOURS</small><h2 id="pereme-support-title">{title}</h2></div><button type="button" aria-label={closeLabel} onClick={onClose}><X size={20} /></button></header>
      <p id="pereme-support-intro">{intro}</p>
      {children}
    </section>
  </div>
}
