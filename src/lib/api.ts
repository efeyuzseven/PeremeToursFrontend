export const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? 'https://api-peremetours-test.d1-tech.com'
).replace(/\/$/, '')

type ApiOptions = Omit<RequestInit, 'body'> & {
  token?: string
  body?: unknown
}

type ProblemDetails = {
  title?: string
  detail?: string
  message?: string
  errors?: Record<string, string[]>
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

async function readApiResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => ({})) as ProblemDetails
  if (!response.ok) {
    const validationMessage = data.errors
      ? Object.values(data.errors).flat().join(' ')
      : undefined
    throw new ApiError(
      response.status,
      validationMessage || data.detail || data.message || data.title || 'İşlem tamamlanamadı.',
    )
  }
  return data as T
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body !== undefined) headers.set('content-type', 'application/json')
  if (options.token) headers.set('authorization', `Bearer ${options.token}`)

  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiError(0, 'Sunucuya ulaşılamadı. Lütfen bağlantınızı kontrol edin.')
  }

  return readApiResponse<T>(response)
}

export async function apiUpload<T>(path: string, formData: FormData, token: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: formData,
    })
  } catch {
    throw new ApiError(0, 'Sunucuya ulaşılamadı. Lütfen bağlantınızı kontrol edin.')
  }
  return readApiResponse<T>(response)
}
