# Starter testmiljøet for Sammen: lokal server + offentlig test-URL.
# Kjør: høyreklikk -> «Kjør med PowerShell», eller i terminal: .\start-test.ps1
# NB: URL-en er ny hver gang, og dør når dette vinduet lukkes eller PC-en slås av.

$here = $PSScriptRoot
$port = 8123

$listening = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if (-not $listening) {
  Start-Process powershell -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$here\serve.ps1`"", "-Port", $port -WindowStyle Minimized
  Start-Sleep -Seconds 2
  Write-Host "Lokal server startet på port $port"
} else {
  Write-Host "Lokal server kjører allerede på port $port"
}

Write-Host "Starter tunnel — vent på adressen nedenfor, åpne den i Safari på telefonen..." -ForegroundColor Cyan
& "$here\tools\cloudflared.exe" tunnel --url "http://localhost:$port" --http-host-header localhost
