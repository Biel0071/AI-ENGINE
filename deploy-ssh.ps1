Import-Module Posh-SSH -ErrorAction Stop

$ip = "209.50.241.22"
$user = "root"
$pass = "S53yi4RYq8j4DCGp"
$zipPath = "C:\projetos\ai-engine-core\fenix-deploy.zip"
$remoteZip = "/opt/fenix-deploy.zip"

$securePass = ConvertTo-SecureString $pass -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential ($user, $securePass)

Write-Host "Conectando ao FÊNIX SERVER ($ip)..." -ForegroundColor Cyan
$session = New-SSHSession -ComputerName $ip -Credential $cred -AcceptKey

if ($session) {
    Write-Host "Upload do Kernel zipado..." -ForegroundColor Yellow
    Set-SCPFile -SessionId $session.SessionId -LocalFile $zipPath -RemotePath $remoteZip
    
    Write-Host "Injetando Motor de Setup..." -ForegroundColor Yellow
    $cmd = @"
    cd /opt
    apt-get update -y
    apt-get install -y unzip curl
    rm -rf /opt/fenix-os
    unzip -o fenix-deploy.zip -d /opt/fenix-os
    cd /opt/fenix-os
    
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    fi
    
    npm install
    
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
    fi
    
    echo "Inicializando o Environment Discovery Engine..."
    cd platform/bootstrap
    npm install
    node installer.js
    
    pm2 delete fenix-daemon || true
    pm2 start ../cli/fenix.js --name "fenix-daemon" -- up
    pm2 save
    pm2 startup | tail -n 1 | bash
    
    echo "======================================"
    echo "FÊNIX OS V1.0 ESTÁ ONLINE E ISOLADO!"
    echo "======================================"
"@
    
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command $cmd
    Write-Host "Saída do Servidor:" -ForegroundColor Green
    Write-Host $result.Output
    if ($result.Error) {
        Write-Host "Erros no Servidor:" -ForegroundColor Red
        Write-Host $result.Error
    }
    
    Remove-SSHSession -SessionId $session.SessionId
    Write-Host "Deplopyment Completo. Cérebro Online." -ForegroundColor Cyan
} else {
    Write-Host "Falha ao conectar via SSH." -ForegroundColor Red
}
