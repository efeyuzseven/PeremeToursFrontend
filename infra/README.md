# AWS test environment

- Region: `eu-central-1`
- Private S3 bucket: `peremetours-test-890571110014-eu-central-1`
- CloudFront distribution: `E2CWRTSM9C24S6`
- Test URL: <https://d2bmjk2h6qp4lz.cloudfront.net>
- Official site name: `Dentur | Pereme Tours`
- Primary URL: <https://pereme.com.tr>

The bucket blocks all public access. CloudFront reads objects through Origin Access Control, redirects HTTP to HTTPS, adds AWS managed security headers and maps SPA 403/404 responses to `index.html`.

Deploy a new version from PowerShell:

```powershell
.\scripts\deploy-test.ps1
```

## Custom domain cutover (AWS prepared; external DNS pending)

On 2026-10-12 the domain delegates to `jimmy.ns.cloudflare.com` and `summer.ns.cloudflare.com`. Both ACM validation CNAME records are present and certificate `arn:aws:acm:us-east-1:890571110014:certificate/3e7354cf-beae-44b4-9288-a950f05a3ed2` is issued. The apex still resolves to the previous server, `104.247.167.147`; DNS is managed outside this AWS account.

The existing distribution is prepared with both custom aliases and the issued certificate, SNI-only and TLS 1.2 minimum. `peremetours-www-to-apex` is a native CloudFront Function (not Lambda) using `www-to-apex.js`. It redirects only the exact `www` host to `https://pereme.com.tr`, preserving paths and encoded/repeated query values. The CloudFront test host is not redirected. Validate it with `node scripts/test-domain-redirect.mjs`. Previous live distribution configuration is backed up in the private tour-image bucket under `deployment-backups/domain-cutover/`; always retrieve the current ETag before any rollback update.

Backend CORS and bank iframe/callback allowlists include the apex, `www` and the test origin. Existing payment credentials, callback API URL and SMTP settings are retained. PostMessage uses explicit target origins, never `*` or request-header-derived origins.

DNS owner handoff (Cloudflare, initially **DNS only / grey cloud**, TTL Auto):

| Type | Name | Target |
| --- | --- | --- |
| CNAME | `@` | `d2bmjk2h6qp4lz.cloudfront.net` |
| CNAME | `www` | `d2bmjk2h6qp4lz.cloudfront.net` |

Replace only the conflicting old apex A/AAAA and `www` records. Cloudflare flattens the apex CNAME; do not assign fixed CloudFront IPs. Preserve MX, SPF/DKIM/DMARC TXT, mail-related records and both ACM validation CNAMEs. If enabling Cloudflare proxy later, use **Full (strict)** TLS, not Flexible, and ensure caching/WAF do not interfere with application behavior.

After DNS switches, verify normal HTTPS (without DNS overrides), `www` redirects with query values intact, deep routes, TR/EN, live tour availability, sign-in and the payment frame/CORS policies. Verification must not start purchases/refunds or submit live card data. Then change the runtime `MailSettings:WebsiteUrl` to `https://pereme.com.tr`; it intentionally remains on the working test URL until the external DNS cutover is confirmed.

Existing email accounts, MX records and SMTP credentials are not changed by the AWS preparation.
