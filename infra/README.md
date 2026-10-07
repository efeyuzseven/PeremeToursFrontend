# AWS test environment

- Region: `eu-central-1`
- Private S3 bucket: `peremetours-test-890571110014-eu-central-1`
- CloudFront distribution: `E2CWRTSM9C24S6`
- Test URL: <https://d2bmjk2h6qp4lz.cloudfront.net>
- Official site name: `Dentur | Pereme Tours`
- Official URL: <https://www.pereme.com.tr>

The bucket blocks all public access. CloudFront reads objects through Origin Access Control, redirects HTTP to HTTPS, adds AWS managed security headers and maps SPA 403/404 responses to `index.html`.

Deploy a new version from PowerShell:

```powershell
.\scripts\deploy-test.ps1
```

## Custom domain cutover (pending)

As checked on 2026-10-07, DNS is managed outside this AWS account at Güzel Hosting. `www.pereme.com.tr` is a CNAME to `pereme.com.tr`, which points to a different hosting server. The CloudFront distribution currently has no custom aliases or ACM certificate for this domain. Updating page metadata does not migrate DNS or the existing website.

Before replacing the existing `www` record:

1. Confirm access to the domain's DNS panel and approval to switch the existing site.
2. Request and DNS-validate an ACM certificate in `us-east-1` covering `www.pereme.com.tr` (and `pereme.com.tr` if serving the apex).
3. Attach the issued certificate and matching aliases to the existing CloudFront distribution.
4. Configure backend CORS and the Ziraat frontend origin for the new domain. The bank frame and callback use a restricted frontend origin: changing DNS alone is not enough. Keep the current origin until cutover to avoid interrupting test payments.
5. Point `www` via CNAME to `d2bmjk2h6qp4lz.cloudfront.net`. Configure an HTTPS apex-to-www redirect or provider-supported ALIAS/ANAME separately; do not use CloudFront IP addresses as fixed A records.
6. Verify HTTPS, sign-in, live tour availability and the bank callback before making the new domain primary. Then update email website links to the official URL.

Existing support email addresses and SMTP credentials are not changed by this branding update.
