import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

export type TourPagePickerGroup = {
  title: string
  // Marks the group with "*" and explains it in the footnote under the list.
  footnote?: string
  items: { key: string; name: string; badge?: string }[]
}

// Dropdown for choosing the page to edit in Tur Sayfaları: grouped options, the current one ticked.
// Keyboard: Enter/Space/Arrow keys open it, Arrow keys/Home/End move, Enter picks, Escape closes.
export function TourPagePicker({ label, groups, value, disabled = false, onChange }: {
  label: string; groups: TourPagePickerGroup[]; value: string; disabled?: boolean; onChange: (key: string) => void
}) {
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const id = useId()
  const items = groups.flatMap(group => group.items)
  const selected = items.find(item => item.key === value)
  const footnotes = groups.filter(group => group.footnote)
  useEffect(() => {
    if (!open) return
    // Start on the current page so the arrow keys continue from it.
    const options = list.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')
    const current = [...(options ?? [])].find(option => option.getAttribute('aria-selected') === 'true') ?? options?.[0]
    current?.focus()
    const closeOutside = (event: MouseEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', closeOutside)
    return () => document.removeEventListener('mousedown', closeOutside)
  }, [open])
  const close = (refocus: boolean) => { setOpen(false); if (refocus) trigger.current?.focus() }
  const pick = (key: string) => { close(true); if (key !== value) onChange(key) }
  const onTriggerKey = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true) }
  }
  const onListKey = (event: KeyboardEvent) => {
    const options = [...(list.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])]
    const index = options.indexOf(document.activeElement as HTMLButtonElement)
    const focus = (next: number) => { event.preventDefault(); options[Math.max(0, Math.min(options.length - 1, next))]?.focus() }
    if (event.key === 'ArrowDown') focus(index + 1)
    else if (event.key === 'ArrowUp') focus(index - 1)
    else if (event.key === 'Home') focus(0)
    else if (event.key === 'End') focus(options.length - 1)
    else if (event.key === 'Escape') { event.preventDefault(); close(true) }
    else if (event.key === 'Tab') close(false)
  }
  return <div className="tour-page-picker" ref={container}>
    <span id={`${id}-label`}>{label}</span>
    <button ref={trigger} type="button" className="tour-page-picker__trigger" disabled={disabled} aria-haspopup="listbox" aria-expanded={open}
      aria-labelledby={`${id}-label ${id}-value`} onClick={() => setOpen(current => !current)} onKeyDown={onTriggerKey}>
      <span id={`${id}-value`}>{selected?.name ?? '—'}{selected?.badge && <i>{selected.badge}</i>}</span>
      <ChevronDown size={17} />
    </button>
    {open && <div className="tour-page-picker__panel">
      <div ref={list} role="listbox" aria-labelledby={`${id}-label`} onKeyDown={onListKey}>
        {groups.map(group => <div role="group" aria-label={group.title} key={group.title}>
          <strong>{group.title}{group.footnote && ' *'}</strong>
          {group.items.map(item => <button type="button" role="option" aria-selected={item.key === value} key={item.key} onClick={() => pick(item.key)}>
            <span>{item.name}</span>{item.badge && <i>{item.badge}</i>}{item.key === value && <Check size={16} />}
          </button>)}
        </div>)}
      </div>
      {footnotes.map(group => <p key={group.title}>* {group.footnote}</p>)}
    </div>}
  </div>
}
