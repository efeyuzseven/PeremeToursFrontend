import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

type Option = { value: string; label: string }

export function BookingSelect({ label, value, options, onChange }: {
  label: string; value: string; options: Option[]; onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    const selected = container.current?.querySelector<HTMLButtonElement>('[role="option"][aria-selected="true"]')
      ?? container.current?.querySelector<HTMLButtonElement>('[role="option"]')
    selected?.focus({ preventScroll: true })
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])

  const close = () => { setOpen(false); trigger.current?.focus() }

  return <div className={`reservation-select ${open ? 'reservation-select--open' : ''}`} ref={container}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}
    onKeyDown={(event) => {
      if (event.key === 'Escape' && open) { event.stopPropagation(); close() }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      if (!open) { setOpen(true); return }
      const buttons = Array.from(container.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
      buttons[next]?.focus()
    }}>
    <span id={`${id}-label`} className="reservation-field-label">{label}</span>
    <button ref={trigger} className="reservation-select__trigger" type="button" aria-haspopup="listbox"
      aria-expanded={open} aria-controls={open ? id : undefined} aria-labelledby={`${id}-label ${id}-value`}
      disabled={!options.length} onClick={() => setOpen(!open)}>
      <span id={`${id}-value`}>{options.find((option) => option.value === value)?.label ?? '—'}</span><ChevronDown size={17} />
    </button>
    {open && <div className="reservation-select__options" role="listbox" id={id} aria-labelledby={`${id}-label`}>
      {options.map((option) => <button key={option.value} type="button" role="option" aria-selected={option.value === value}
        onClick={() => { onChange(option.value); close() }}>{option.label}{option.value === value && <Check size={16} />}</button>)}
    </div>}
  </div>
}
