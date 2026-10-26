import DOMPurify from 'dompurify'

// Links that open a new tab must not get access to this page.
DOMPurify.addHook('afterSanitizeAttributes', node => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') node.setAttribute('rel', 'noopener noreferrer')
})

// Admin-written HTML is sanitized before rendering: no scripts, event handlers, forms, frames or page-wide <style> blocks.
export const sanitizeHtml = (html: string) => DOMPurify.sanitize(html, {
  FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'iframe', 'object', 'embed'], ADD_ATTR: ['target'],
})

// Plain text of an HTML fragment, e.g. for a meta description when none was written.
export const htmlToText = (html: string) => {
  const element = document.createElement('div')
  element.innerHTML = sanitizeHtml(html)
  return (element.textContent ?? '').replace(/\s+/g, ' ').trim()
}
