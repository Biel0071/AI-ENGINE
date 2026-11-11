# deploy-fenix.ps1 - Canonical deploy to the PM2 runtime at /opt/fenix-os (replaces disabled deploy.bat).
# Usage (from ai-engine/):
#   powershell -File scripts/deploy-fenix.ps1 -Files grg/src/server.js,grg/public/unified-app.js
#   powershell -File scripts/deploy-fenix.ps1 -GitRange origin/main..HEAD
#   add -DryRun to only build and list the payload.
# Follows AGENTS.md rule 6: the remote logic lives in scripts/remote-deploy.sh, uploaded and run via `bash /tmp/...`.
param(
  [string[]]$Files = @(),
  [string]$GitRange = '',
  [string]$Vps = 'root@209.50.241.22',
  [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if ($GitRange) {
  $Files += git diff --name-only --diff-filter=AM $GitRange -- grg/src grg/public platform/src
}
$Files = $Files | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() -replace '\\', '/' } | Where-Object { $_ } | Sort-Object -Unique
if (-not $Files) { throw 'No files to deploy (use -Files or -GitRange).' }
foreach ($f in $Files) {
  if ($f -notmatch '^(grg/src|grg/public|platform)/' -or $f -match '(^|/)\.\.(/|$)') { throw "Refusing path outside allowed roots: $f" }
  if (-not (Test-Path $f)) { throw "Missing local file: $f" }
  if ($f -match '\.(c?js)$') { node --check $f; if ($LASTEXITCODE) { throw "node --check failed locally: $f" } }
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$tar = Join-Path $env:TEMP "fenix-deploy-$stamp.tar"
$list = Join-Path $env:TEMP "fenix-deploy-$stamp.txt"
[IO.File]::WriteAllLines($list, [string[]]$Files)
tar -cf $tar -T $list
if ($LASTEXITCODE) { throw 'tar failed' }
Write-Host "Payload: $($Files.Count) files -> $tar"
$Files | ForEach-Object { Write-Host "  $_" }
if ($DryRun) { Write-Host 'DryRun: nothing uploaded.'; exit 0 }

scp -q $tar "${Vps}:/tmp/fenix-deploy-$stamp.tar"; if ($LASTEXITCODE) { throw 'scp payload failed' }
scp -q (Join-Path $PSScriptRoot 'remote-deploy.sh') "${Vps}:/tmp/fenix-remote-deploy.sh"; if ($LASTEXITCODE) { throw 'scp script failed' }
ssh $Vps "bash /tmp/fenix-remote-deploy.sh /tmp/fenix-deploy-$stamp.tar $stamp"
$code = $LASTEXITCODE
Remove-Item $tar, $list -ErrorAction SilentlyContinue
if ($code) { throw "Remote deploy failed (exit $code); remote script attempted rollback." }
Write-Host "Deploy $stamp OK"
