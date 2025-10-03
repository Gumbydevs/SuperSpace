Param(
  [string]$Url = "https://superspace-server-production.up.railway.app/analytics/reset",
  [string]$Secret = "superspaceRESET_8f7c2b1e4d9a",
  [switch]$Force
)

# Admin script to reset server analytics data. Run this once when you want to wipe analytics.
Write-Host "Analytics reset script" -ForegroundColor Cyan
Write-Host "Target URL: $Url"

if (-not $Force) {
  $confirm = Read-Host "This will permanently delete analytics data on the server. Type RESET to continue"
  if ($confirm -ne 'RESET') {
    Write-Host "Cancelled by user." -ForegroundColor Yellow
    exit 1
  }
}

try {
  $headers = @{ 'x-analytics-secret' = $Secret }
  Write-Host "Sending reset request..."
  $resp = Invoke-RestMethod -Uri $Url -Method POST -Headers $headers -TimeoutSec 30
  Write-Host "Server response:" -ForegroundColor Green
  Write-Host ($resp | ConvertTo-Json -Depth 5)
} catch {
  Write-Host "Error while calling analytics reset endpoint:" -ForegroundColor Red
  Write-Host $_.Exception.Message
  exit 2
}

Write-Host "Done." -ForegroundColor Cyan
