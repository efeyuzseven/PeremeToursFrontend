# AWS test environment

- Region: `eu-central-1`
- Private S3 bucket: `peremetours-test-890571110014-eu-central-1`
- CloudFront distribution: `E2CWRTSM9C24S6`
- Test URL: <https://d2bmjk2h6qp4lz.cloudfront.net>

The bucket blocks all public access. CloudFront reads objects through Origin Access Control, redirects HTTP to HTTPS, adds AWS managed security headers and maps SPA 403/404 responses to `index.html`.

Deploy a new version from PowerShell:

```powershell
.\scripts\deploy-test.ps1
```
