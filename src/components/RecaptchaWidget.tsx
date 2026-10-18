import { useEffect, useRef } from 'react'
import { recaptchaSiteKey } from '../lib/recaptcha'

type RecaptchaApi = { render?: (element: HTMLElement, options: Record<string, unknown>) => number }

const scriptId = 'google-recaptcha'

// Tokens are single-use: remount the widget (change its key) after every failed payment start.
export function RecaptchaWidget({ language, onToken }: { language: 'tr' | 'en'; onToken: (token: string) => void }) {
  const element = useRef<HTMLDivElement>(null)
  const onTokenRef = useRef(onToken)
  useEffect(() => { onTokenRef.current = onToken })

  useEffect(() => {
    if (!recaptchaSiteKey) return
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.id = scriptId
      script.async = true
      script.src = `https://www.google.com/recaptcha/api.js?render=explicit&hl=${language}`
      document.head.appendChild(script)
    }

    let rendered = false
    const render = () => {
      const api = (window as unknown as { grecaptcha?: RecaptchaApi }).grecaptcha
      if (rendered || !element.current || typeof api?.render !== 'function') return
      try {
        api.render(element.current, {
          sitekey: recaptchaSiteKey,
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(''),
          'error-callback': () => onTokenRef.current(''),
        })
        rendered = true
        window.clearInterval(timer)
      } catch { /* Google initializes the explicit renderer asynchronously. */ }
    }
    const timer = window.setInterval(render, 100)
    render()
    return () => window.clearInterval(timer)
  }, [language])

  return recaptchaSiteKey ? <div ref={element} className="reservation-recaptcha" /> : null
}
