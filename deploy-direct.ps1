$ip = "209.50.241.22"
$user = "root"
$pass = "S53yi4RYq8j4DCGp"
$plink = "C:\Program Files\PuTTY\plink.exe"
$pscp = "C:\Program Files\PuTTY\pscp.exe"
$scriptPath = "C:\projetos\ai-engine-core\ai-engine\remote-setup.sh"

Write-Host "Compactando FENIX OS v2.0 (Deploy)..." -ForegroundColor Cyan
git archive -o fenix-rc20-deploy.zip HEAD

Write-Host "Enviando arquivo ZIP para a VPS..." -ForegroundColor Cyan
cmd.exe /c "echo y | `"$pscp`" -pw $pass fenix-rc20-deploy.zip root@${ip}:/root/fenix-rc20-deploy.zip"

Write-Host "Iniciando a instalação e configuração remota na VPS..." -ForegroundColor Yellow
$setupScript = "echo y | `"$plink`" -ssh `"$user`@$ip`" -pw `"$pass`" -m `"$scriptPath`""
cmd.exe /c $setupScript

Write-Host "DEPLOY FINALIZADO E ENVIADO PARA A VPS!" -ForegroundColor Green
