<#
Simple deploy helper: prepares a docs/ folder from the repo root so
GitHub Pages can serve the site from the `main` branch -> `/docs`.

Usage (PowerShell):
  ./tools/deploy_to_pages.ps1

After running, review and edit `docs/config.json` to point to your Railway URL,
then commit and push. In your GitHub repo settings enable Pages to serve from
`main` branch / `docs` folder.
#>
Set-StrictMode -Version Latest
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Push-Location $root
try {
    $dst = Join-Path $root 'docs'
    if (Test-Path $dst) {
        Remove-Item -LiteralPath $dst -Recurse -Force -ErrorAction SilentlyContinue
    }
    New-Item -ItemType Directory -Path $dst | Out-Null

    # Exclude developer/server-only folders
    $exclude = @('.git','node_modules','server','src','tools','exports')

    Get-ChildItem -Path $root -Force | Where-Object {
        $exclude -notcontains $_.Name
    } | ForEach-Object {
        $target = Join-Path $dst $_.Name
        if ($_.PSIsContainer) {
            # Use robocopy for robust folder copy if available
            $srcFolder = $_.FullName
            if (Get-Command robocopy -ErrorAction SilentlyContinue) {
                robocopy $srcFolder $target /E /NFL /NDL /NJH /NJS | Out-Null
            } else {
                Copy-Item -LiteralPath $srcFolder -Destination $target -Recurse -Force
            }
        } else {
            Copy-Item -LiteralPath $_.FullName -Destination $target -Force
        }
    }

    # Add runtime config placeholder
    $config = @{ API_URL = 'https://your-railway.app' } | ConvertTo-Json
    $configPath = Join-Path $dst 'config.json'
    Set-Content -Path $configPath -Value $config -Encoding UTF8

    # Prevent Jekyll from ignoring files that start with an underscore
    New-Item -Path (Join-Path $dst '.nojekyll') -ItemType File -Force | Out-Null

    Write-Output "Prepared docs/ with runtime config at docs/config.json"
    Write-Output "Edit docs/config.json to point to your Railway app, commit, push, then enable Pages from main/docs."
} finally {
    Pop-Location
}
