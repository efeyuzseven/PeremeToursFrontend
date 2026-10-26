import { apiBaseUrl } from './api'

export type ContentLanguage = 'tr' | 'en'
export type ContentKind = 'blog' | 'page'

// A published blog post or page in one language (from /api/v1/blog/{slug} or /api/v1/pages/{slug}).
export type PublicContentPage = {
  kind: ContentKind; language: ContentLanguage; title: string; slug: string; summary: string | null; body: string
  metaTitle: string | null; metaDescription: string | null; coverImageUrl: string | null
  publishedAtUtc: string | null; updatedAtUtc: string; slugTr: string; slugEn: string | null
}
export type PublicContentPageListItem = { title: string; slug: string; summary: string | null; coverImageUrl: string | null; publishedAtUtc: string | null }
export type PublicContentPageList = { items: PublicContentPageListItem[]; total: number; page: number; pageSize: number }
export type ContentPageLink = { title: string; slug: string }

export type ContentPageText = { title: string; slug: string; summary: string | null; body: string; metaTitle: string | null; metaDescription: string | null }
// Admin record (from /api/v1/admin/content-pages).
export type ContentPageSummary = {
  id: string; kind: ContentKind; isPublished: boolean; publishedAtUtc: string | null; coverImageUrl: string | null
  showInFooter: boolean; sortOrder: number; tr: ContentPageText; en: ContentPageText | null; createdAtUtc: string; updatedAtUtc: string
}

// Same rules as the backend's ContentSlug: Turkish letters transliterated, apostrophes dropped, other runs become one hyphen.
export function slugify(value: string) {
  return value.trim().toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .normalize('NFD').replace(/[̀-ͯ'’‘`]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120).replace(/-+$/, '')
}

export const blogPath = (language: ContentLanguage, slug?: string) => `${language === 'en' ? '/en' : ''}/blog${slug ? `/${slug}` : ''}`
export const pagePath = (language: ContentLanguage, slug: string) => `${language === 'en' ? '/en' : ''}/${slug}`
export const contentPath = (kind: ContentKind, language: ContentLanguage, slug: string) => kind === 'blog' ? blogPath(language, slug) : pagePath(language, slug)
export const contentImage = (url: string | null) => url ? (url.startsWith('/api/') ? `${apiBaseUrl}${url}` : url) : null

export const formatContentDate = (value: string | null, language: ContentLanguage) => value
  ? new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' }).format(new Date(value))
  : ''
