# Simple configuration check script
$ErrorActionPreference = "Stop"

Write-Host "Checking Cloudflare configuration..." -ForegroundColor Green

# Check wrangler.toml exists
if (-not (Test-Path "wrangler.toml")) {
    Write-Host "ERROR: wrangler.toml file not found" -ForegroundColor Red
    exit 1
}

# Check for placeholders
$config = Get-Content "wrangler.toml" -Raw
$placeholders = @(
    "your-database-id-here",
    "your-kv-namespace-id-here", 
    "your-main-kv-namespace-id-here",
    "your-config-kv-namespace-id-here",
    "your-preview-kv-namespace-id-here",
    "your-preview-main-kv-namespace-id-here",
    "your-preview-config-kv-namespace-id-here"
)

$hasPlaceholders = $false
foreach ($placeholder in $placeholders) {
    if ($config -match $placeholder) {
        Write-Host "WARNING: Found placeholder: $placeholder" -ForegroundColor Yellow
        $hasPlaceholders = $true
    }
}

if ($hasPlaceholders) {
    Write-Host "Configuration contains placeholders. Need to create resources first." -ForegroundColor Red
    Write-Host "Run: npm run setup" -ForegroundColor Yellow
    exit 1
}

Write-Host "Configuration check passed!" -ForegroundColor Green

# Check Wrangler CLI
try {
    $wranglerVersion = wrangler --version
    Write-Host "Wrangler CLI: OK" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Wrangler CLI not installed" -ForegroundColor Red
    exit 1
}

# Check login status
try {
    wrangler whoami | Out-Null
    Write-Host "Cloudflare authentication: OK" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Not logged in to Cloudflare" -ForegroundColor Red
    exit 1
}

# Check TypeScript compilation
Write-Host "Checking TypeScript compilation..." -ForegroundColor Cyan
try {
    npx tsc --noEmit
    Write-Host "TypeScript compilation: OK" -ForegroundColor Green
} catch {
    Write-Host "ERROR: TypeScript compilation failed" -ForegroundColor Red
    exit 1
}

Write-Host "All checks passed! Ready to deploy." -ForegroundColor Green