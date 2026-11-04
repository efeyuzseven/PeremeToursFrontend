param(
  [string]$BucketName = 'peremetours-test-890571110014-eu-central-1',
  [string]$DistributionId = 'E2CWRTSM9C24S6',
  [string]$Region = 'eu-central-1',
  # Public reCAPTCHA v2 site key for pereme.com.tr; the matching secret lives in /peremetours/test/ZIRAAT_POS.
  [string]$RecaptchaSiteKey = '6LciO_UtAAAAAIZYhH43uUmNyGAciKvGjVMPmI_E',
  # Installed browser used to prerender pages (scripts/prerender.mjs); 'msedge' or 'chrome'.
  [string]$BrowserChannel = 'msedge'
)

$ErrorActionPreference = 'Stop'
$htmlHeaders = @('--content-type', 'text/html; charset=utf-8', '--cache-control', 'no-cache,no-store,must-revalidate')

$env:VITE_RECAPTCHA_SITE_KEY = $RecaptchaSiteKey
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Production build failed.' }

# Static HTML of each public page for crawlers that do not run JavaScript. Never blocks a deploy:
# a page without a prerender is served the plain SPA shell, as before.
$env:PRERENDER_BROWSER_CHANNEL = $BrowserChannel
npm run prerender
$prerendered = $LASTEXITCODE -eq 0 -and (Test-Path 'dist/prerendered/manifest.json')
if (-not $prerendered) { Write-Warning 'Prerendering failed; every page is served the plain SPA shell this time.' }

aws s3 sync 'dist/assets' "s3://$BucketName/assets" `
  --region $Region `
  --cache-control 'public,max-age=31536000,immutable'
if ($LASTEXITCODE -ne 0) { throw 'Asset upload failed.' }

# The shell goes to index.html (replaced below by the homepage prerender) and to spa.html, the page
# CloudFront should return for addresses without an object (see infra/README.md).
foreach ($key in @('index.html', 'spa.html')) {
  aws s3 cp 'dist/index.html' "s3://$BucketName/$key" --region $Region @htmlHeaders
  if ($LASTEXITCODE -ne 0) { throw 'HTML upload failed.' }
}

aws s3 cp 'dist/favicon.svg' "s3://$BucketName/favicon.svg" `
  --region $Region `
  --content-type 'image/svg+xml' `
  --cache-control 'public,max-age=86400'
if ($LASTEXITCODE -ne 0) { throw 'Favicon upload failed.' }

aws s3 cp 'dist/robots.txt' "s3://$BucketName/robots.txt" `
  --region $Region `
  --content-type 'text/plain; charset=utf-8' `
  --cache-control 'public,max-age=3600'
if ($LASTEXITCODE -ne 0) { throw 'robots.txt upload failed.' }

# Each prerendered page is stored at its address without an extension (key "turlar/sunset" serves
# /turlar/sunset). prerender-manifest.json lists the keys in use; same steps as .github/workflows/deploy.yml.
$pages = @()
if ($prerendered) { $pages = @((Get-Content 'dist/prerendered/manifest.json' -Raw -Encoding UTF8 | ConvertFrom-Json).pages) }
foreach ($page in $pages) {
  aws s3 cp "dist/prerendered/$($page.file)" "s3://$BucketName/$($page.key)" --region $Region --only-show-errors @htmlHeaders
  if ($LASTEXITCODE -ne 0) { throw "Upload of prerendered page $($page.path) failed." }
}

# Pages prerendered last time but not now would still load the previous bundle: remove them, or replace them
# with the current shell. Before the first such deploy the address returns the shell, not JSON.
$previousKeys = @()
try {
  $previous = Invoke-RestMethod -Uri 'https://pereme.com.tr/prerender-manifest.json' -UseBasicParsing
  if ($previous -isnot [string] -and $previous.pages) { $previousKeys = @($previous.pages | ForEach-Object { $_.key }) }
} catch { Write-Warning "Previous prerender manifest unavailable: $($_.Exception.Message)" }
$currentKeys = @($pages | ForEach-Object { $_.key })
foreach ($key in $previousKeys) {
  if ($key -eq 'index.html' -or $currentKeys -contains $key) { continue }
  Write-Host "Removing stale prerendered page $key"
  aws s3 rm "s3://$BucketName/$key" --region $Region --only-show-errors
  if ($LASTEXITCODE -ne 0) {
    aws s3 cp 'dist/index.html' "s3://$BucketName/$key" --region $Region --only-show-errors @htmlHeaders
    if ($LASTEXITCODE -ne 0) { throw "Could not remove stale prerendered page $key." }
  }
}

$published = Join-Path ([IO.Path]::GetTempPath()) 'prerender-manifest.json'
$manifestJson = ConvertTo-Json -Depth 3 -InputObject @{ pages = @($pages | ForEach-Object { @{ path = $_.path; key = $_.key } }) }
[IO.File]::WriteAllText($published, $manifestJson)
aws s3 cp $published "s3://$BucketName/prerender-manifest.json" --region $Region --only-show-errors `
  --content-type 'application/json' --cache-control 'no-cache,no-store,must-revalidate'
if ($LASTEXITCODE -ne 0) { throw 'Prerender manifest upload failed.' }

aws cloudfront create-invalidation `
  --region 'us-east-1' `
  --distribution-id $DistributionId `
  --paths '/*' `
  --query 'Invalidation.Id' `
  --output text `
  --no-cli-pager
if ($LASTEXITCODE -ne 0) { throw 'CloudFront invalidation failed.' }

Write-Host 'Deployment complete: https://pereme.com.tr'
