// The widget stays hidden until a site key for pereme.com.tr is configured at build time; the API must
// enable Payments:Protection:RecaptchaEnabled at the same time.
export const recaptchaSiteKey = (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined) || ''
