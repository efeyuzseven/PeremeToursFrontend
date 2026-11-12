import { useEffect, useState } from 'react'
import { normalizeHomepage, type HomepageContentDocument } from '../content/homepage'
import { apiRequest } from './api'
import type { ContentLanguage, ContentPageLink } from './content-pages'

export type NavItem = { href: string; label: string }

// The one main menu used by the homepage and every other page.
export function mainNavigation(language: ContentLanguage, showAnnouncements: boolean): NavItem[] {
  const tr = language === 'tr'
  return [
    { href: '/#turlar', label: tr ? 'Turlar' : 'Tours' },
    { href: tr ? '/blog' : '/en/blog', label: 'Blog' },
    ...(showAnnouncements ? [{ href: '/#duyurular', label: tr ? 'Duyurular' : 'Announcements' }] : []),
    { href: '/sikca-sorulan-sorular', label: tr ? 'Sıkça Sorulanlar' : 'FAQ' },
    { href: '/iletisim', label: tr ? 'İletişim' : 'Contact' },
  ]
}

export const hasVisibleAnnouncements = (content: HomepageContentDocument | null | undefined) =>
  !!content && !content.hiddenSections?.includes('announcements') && (content.announcements ?? []).some(item => item.isVisible && item.tr.title.trim())

// One request per page load, shared by every component that asks.
let homepageRequest: Promise<HomepageContentDocument | null> | null = null
const footerRequests: Partial<Record<ContentLanguage, Promise<ContentPageLink[]>>> = {}

export function useAnnouncementsAvailable() {
  const [available, setAvailable] = useState(false)
  useEffect(() => {
    let active = true
    homepageRequest ??= apiRequest<HomepageContentDocument>('/api/v1/site-content/homepage', { cache: 'no-store' }).catch(() => null)
    void homepageRequest.then(content => { if (active) setAvailable(hasVisibleAnnouncements(content)) })
    return () => { active = false }
  }, [])
  return available
}

// The homepage's saved texts in one language (the footer uses them on every page); undefined until they arrive.
// `skip` is for callers that already have the texts.
export function useHomepageTexts(language: ContentLanguage, skip = false) {
  const [content, setContent] = useState<HomepageContentDocument | null>(null)
  useEffect(() => {
    if (skip) return
    let active = true
    homepageRequest ??= apiRequest<HomepageContentDocument>('/api/v1/site-content/homepage', { cache: 'no-store' }).catch(() => null)
    void homepageRequest.then(result => { if (active && result) setContent(normalizeHomepage(result)) })
    return () => { active = false }
  }, [skip])
  return content?.[language].texts
}

// Standalone pages the admin chose to show in the footer.
export function useFooterPages(language: ContentLanguage) {
  const [pages, setPages] = useState<ContentPageLink[]>([])
  useEffect(() => {
    let active = true
    footerRequests[language] ??= apiRequest<ContentPageLink[]>(`/api/v1/pages?language=${language}`, { cache: 'no-store' }).catch(() => [])
    void footerRequests[language]!.then(result => { if (active) setPages(result) })
    return () => { active = false }
  }, [language])
  return pages
}
