param(
  [string]$BucketName = 'peremetours-test-890571110014-eu-central-1',
  [string]$DistributionId = 'E2CWRTSM9C24S6',
  [string]$Region = 'eu-central-1',
  # Public reCAPTCHA v2 site key for pereme.com.tr; the matching secret lives in /peremetours/test/ZIRAAT_POS.
  [string]$RecaptchaSiteKey = '6LciO_UtAAAAAIZYhH43uUmNyGAciKvGjVMPmI_E'
)

$ErrorActionPreference = 'Stop'

$env:VITE_RECAPTCHA_SITE_KEY = $RecaptchaSiteKey
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Production build failed.' }

aws s3 sync 'dist/assets' "s3://$BucketName/assets" `
  --region $Region `
  --cache-control 'public,max-age=31536000,immutable'
if ($LASTEXITCODE -ne 0) { throw 'Asset upload failed.' }

aws s3 cp 'dist/index.html' "s3://$BucketName/index.html" `
  --region $Region `
  --content-type 'text/html; charset=utf-8' `
  --cache-control 'no-cache,no-store,must-revalidate'
if ($LASTEXITCODE -ne 0) { throw 'HTML upload failed.' }

aws s3 cp 'dist/favicon.svg' "s3://$BucketName/favicon.svg" `
  --region $Region `
  --content-type 'image/svg+xml' `
  --cache-control 'public,max-age=86400'
if ($LASTEXITCODE -ne 0) { throw 'Favicon upload failed.' }

aws cloudfront create-invalidation `
  --region 'us-east-1' `
  --distribution-id $DistributionId `
  --paths '/*' `
  --query 'Invalidation.Id' `
  --output text `
  --no-cli-pager
if ($LASTEXITCODE -ne 0) { throw 'CloudFront invalidation failed.' }

Write-Host 'Deployment complete: https://pereme.com.tr'
