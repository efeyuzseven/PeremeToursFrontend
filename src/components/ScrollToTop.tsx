import { useEffect, useLayoutEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// Opening another page through a link starts at its top instead of keeping the previous page's scroll
// position; a link with a "#section" goes to that section. Back/forward keep the browser's own position.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const navigationType = useNavigationType()
  useLayoutEffect(() => {
    if (navigationType === 'POP' || hash) return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, hash, navigationType])
  useEffect(() => {
    if (navigationType === 'POP' || !hash) return
    // The section may appear a moment after the page does, so look for it a few times.
    let attempts = 0
    let timer = 0
    const reveal = () => {
      const target = /^#[A-Za-z][\w-]*$/.test(hash) ? document.getElementById(hash.slice(1)) : null
      if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' })
      else if (attempts++ < 10) timer = window.setTimeout(reveal, 100)
    }
    reveal()
    return () => window.clearTimeout(timer)
  }, [pathname, hash, navigationType])
  return null
}
