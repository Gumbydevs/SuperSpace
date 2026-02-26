# SuperSpace Pre-Launch Verification Script
# Performs automated checks before deployment

Write-Host "SuperSpace Pre-Launch Verification" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$checks = @()
$warnings = @()
$errors = @()

# Check 1: Verify version number is set
Write-Host "Checking version number..." -ForegroundColor Yellow
$versionFile = "js\resetConfig.js"
if (Test-Path $versionFile) {
    $content = Get-Content $versionFile -Raw
    if ($content -match "GAME_VERSION = '(\d{4}\.\d{2}\.\d{2}\.\d{3})'") {
        $version = $matches[1]
        Write-Host "   [OK] Version: $version" -ForegroundColor Green
        $checks += "Version number found: $version"
    } else {
        Write-Host "   [ERROR] Could not find version number!" -ForegroundColor Red
        $errors += "Version number not found in resetConfig.js"
    }
} else {
    Write-Host "   [ERROR] resetConfig.js not found!" -ForegroundColor Red
    $errors += "resetConfig.js file missing"
}

# Check 2: Verify essential files exist
Write-Host "`nChecking essential files..." -ForegroundColor Yellow
$essentialFiles = @(
    "index.html",
    "package.json",
    "vercel.json",
    "render.yaml",
    "js\game.js",
    "js\player.js",
    "js\multiplayer.js",
    "server\server.js"
)

foreach ($file in $essentialFiles) {
    if (Test-Path $file) {
        Write-Host "   [OK] $file" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] $file MISSING!" -ForegroundColor Red
        $errors += "Missing essential file: $file"
    }
}

# Check 3: Check for excessive console.logs (production)
Write-Host "`nChecking for production console.logs..." -ForegroundColor Yellow
$productionLogs = Select-String -Path "js\*.js" -Pattern "^\s*console\.log\(" -CaseSensitive | Measure-Object
if ($productionLogs.Count -gt 0) {
    Write-Host "   [WARN] Found $($productionLogs.Count) uncommented console.log statements" -ForegroundColor Yellow
    $warnings += "$($productionLogs.Count) console.log statements found (should be commented for production)"
} else {
    Write-Host "   [OK] No active console.log statements found" -ForegroundColor Green
    $checks += "Console logs cleaned up"
}

# Check 4: Verify HTML files have lang attribute
Write-Host "`nChecking HTML lang attributes..." -ForegroundColor Yellow
$htmlFiles = Get-ChildItem -Path . -Filter "*.html" -File
$htmlIssues = 0
foreach ($file in $htmlFiles) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match '<html[^>]*lang=') {
        Write-Host "   [OK] $($file.Name)" -ForegroundColor Green
    } else {
        Write-Host "   [WARN] $($file.Name) missing lang attribute" -ForegroundColor Yellow
        $htmlIssues++
    }
}
if ($htmlIssues -eq 0) {
    $checks += "All HTML files have lang attributes"
}

# Check 5: Verify server configuration
Write-Host "`nChecking server configuration..." -ForegroundColor Yellow
if (Test-Path "server\package.json") {
    Write-Host "   [OK] Server package.json exists" -ForegroundColor Green
    $checks += "Server configuration present"
} else {
    Write-Host "   [ERROR] Server package.json missing!" -ForegroundColor Red
    $errors += "Server package.json not found"
}

# Check 6: Look for TODO/FIXME/HACK comments
Write-Host "`nChecking for TODO/FIXME comments..." -ForegroundColor Yellow
$todos = Select-String -Path "js\*.js" -Pattern "(TODO|FIXME|HACK|XXX):" | Measure-Object
if ($todos.Count -gt 0) {
    Write-Host "   [INFO] Found $($todos.Count) TODO/FIXME comments (informational)" -ForegroundColor Cyan
} else {
    Write-Host "   [OK] No TODO/FIXME comments found" -ForegroundColor Green
}

# Check 7: Verify deployment configs
Write-Host "`nChecking deployment configurations..." -ForegroundColor Yellow
if (Test-Path "vercel.json") {
    Write-Host "   [OK] Vercel config present" -ForegroundColor Green
    $checks += "Vercel configuration valid"
}
if (Test-Path "render.yaml") {
    Write-Host "   [OK] Render config present" -ForegroundColor Green
    $checks += "Render configuration valid"
}

# Check 8: Git status
Write-Host "`nChecking git status..." -ForegroundColor Yellow
try {
    $gitStatus = git status --porcelain 2>$null
    if ($LASTEXITCODE -eq 0) {
        if ($gitStatus) {
            Write-Host "   [WARN] Uncommitted changes detected" -ForegroundColor Yellow
            $warnings += "Uncommitted changes in git repository"
            Write-Host "   Files with changes:" -ForegroundColor Gray
            $gitStatus | ForEach-Object { Write-Host "     $_" -ForegroundColor Gray }
        } else {
            Write-Host "   [OK] Git repository clean" -ForegroundColor Green
            $checks += "Git repository clean"
        }
    }
} catch {
    Write-Host "   [INFO] Git not available or not a git repository" -ForegroundColor Cyan
}

# Summary
Write-Host "`n" 
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[OK] Checks passed: $($checks.Count)" -ForegroundColor Green
Write-Host "[WARN] Warnings: $($warnings.Count)" -ForegroundColor Yellow
Write-Host "[ERROR] Errors: $($errors.Count)" -ForegroundColor Red
Write-Host ""

if ($warnings.Count -gt 0) {
    Write-Host "Warnings:" -ForegroundColor Yellow
    $warnings | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    Write-Host ""
}

if ($errors.Count -gt 0) {
    Write-Host "Errors:" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "LAUNCH NOT RECOMMENDED - please fix errors first!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "SUCCESS: All critical checks passed!" -ForegroundColor Green
    if ($warnings.Count -eq 0) {
        Write-Host "Ready for production deployment!" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Ready to launch, but consider addressing warnings" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Display current version info
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Current Game Version: $version" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
