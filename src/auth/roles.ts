export const userRoles = ['User', 'Admin', 'Editor', 'Advisor', 'Service'] as const
export type UserRole = typeof userRoles[number]
export type PanelSection = 'tickets' | 'ticket-errors' | 'tour-contents' | 'tour-pages' | 'site-content' | 'announcements' | 'faqs' | 'feedback' | 'users'

const contentSections: readonly PanelSection[] = ['site-content', 'announcements', 'tour-contents', 'tour-pages', 'faqs']
const serviceSections: readonly PanelSection[] = ['feedback', 'tickets', 'ticket-errors']
const allSections: readonly PanelSection[] = ['tickets', 'ticket-errors', 'tour-contents', 'tour-pages', 'site-content', 'announcements', 'faqs', 'feedback', 'users']

export function allowedPanelSections(role?: string): readonly PanelSection[] {
  if (role === 'Admin') return allSections
  if (role === 'Editor' || role === 'Advisor') return contentSections
  if (role === 'Service') return serviceSections
  return []
}

export function panelHome(role?: string): string | null {
  const first = allowedPanelSections(role)[0]
  return first ? `/admin/${first}` : null
}

export function canAccessPanelPath(role: string | undefined, path: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0].replace(/\/+$/, '')
  return pathname === '/admin' ? !!panelHome(role)
    : allowedPanelSections(role).some((section) => pathname === `/admin/${section}`)
}

export function roleLabel(role: UserRole, language: 'tr' | 'en'): string {
  if (role === 'Admin') return language === 'tr' ? 'Yönetici' : 'Admin'
  if (role === 'User') return language === 'tr' ? 'Kullanıcı' : 'User'
  if (role === 'Editor') return language === 'tr' ? 'Editör' : 'Editor'
  return role
}
