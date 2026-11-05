const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('[FenixDesktopPWA] Configurando atalhos do Fênix OS e suporte PWA...');

const desktopDir = 'C:\\Users\\Dell\\Desktop';
const projetosDir = path.join(desktopDir, 'PROJETOS');
const logosDir = path.join(projetosDir, 'logos');
const fenixIco = path.join(logosDir, 'fenix.ico');
const fenixPng = path.join(logosDir, 'fenix.png');

const publicDir = path.resolve(__dirname, '..', 'public');
const assetsDir = path.join(publicDir, 'assets');

// 1. Copy icon to public and assets
if (fs.existsSync(fenixIco)) {
  fs.copyFileSync(fenixIco, path.join(publicDir, 'favicon.ico'));
  fs.copyFileSync(fenixIco, path.join(assetsDir, 'fenix.ico'));
  console.log('✅ favicon.ico e fenix.ico atualizados em grg/public/');
}
if (fs.existsSync(fenixPng)) {
  fs.copyFileSync(fenixPng, path.join(assetsDir, 'fenix.png'));
  console.log('✅ fenix.png copiado para assets/');
}

// 2. Generate 192 and 512 png icons via powershell script file
const psScriptPath = path.join(__dirname, 'temp_gen_icons.ps1');
const psScript = `
Add-Type -AssemblyName System.Drawing
$icoPath = '${fenixIco.replace(/'/g, "''")}'
$assets = '${assetsDir.replace(/'/g, "''")}'

if (Test-Path $icoPath) {
  $icon = New-Object System.Drawing.Icon($icoPath, 256, 256)
  $bmp = $icon.ToBitmap()

  $b192 = New-Object System.Drawing.Bitmap(192, 192)
  $g192 = [System.Drawing.Graphics]::FromImage($b192)
  $g192.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g192.DrawImage($bmp, 0, 0, 192, 192)
  $b192.Save((Join-Path $assets 'fenix-icon-192.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $g192.Dispose()
  $b192.Dispose()

  $b512 = New-Object System.Drawing.Bitmap(512, 512)
  $g512 = [System.Drawing.Graphics]::FromImage($b512)
  $g512.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g512.DrawImage($bmp, 0, 0, 512, 512)
  $b512.Save((Join-Path $assets 'fenix-icon-512.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $g512.Dispose()
  $b512.Dispose()

  $bmp.Dispose()
  $icon.Dispose()
  Write-Output 'PNGs_OK'
}
`;
fs.writeFileSync(psScriptPath, psScript);
try {
  const out = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psScriptPath}"`).toString();
  console.log('✅ Ícones PWA gerados:', out.trim());
} catch (e) {
  console.warn('⚠️ Falha ao gerar PNGs redimensionados, usando fenix.png padrão:', e.message);
  if (fs.existsSync(fenixPng)) {
    fs.copyFileSync(fenixPng, path.join(assetsDir, 'fenix-icon-192.png'));
    fs.copyFileSync(fenixPng, path.join(assetsDir, 'fenix-icon-512.png'));
  }
} finally {
  if (fs.existsSync(psScriptPath)) fs.unlinkSync(psScriptPath);
}

// 3. Find browser executable for Web App mode
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browserExe = fs.existsSync(chromePath) ? chromePath : (fs.existsSync(edgePath) ? edgePath : null);

// 4. Create Windows shortcuts via VBScript
function createWindowsShortcut(shortcutPath, target, args, icon, description) {
  const vbsFile = path.join(__dirname, 'temp_create_sc.vbs');
  const vbs = `
Set sh = CreateObject("WScript.Shell")
Set sc = sh.CreateShortcut("${shortcutPath.replace(/\\/g, '\\\\')}")
sc.TargetPath = "${target.replace(/\\/g, '\\\\')}"
sc.Arguments = "${args}"
sc.IconLocation = "${icon.replace(/\\/g, '\\\\')}"
sc.Description = "${description}"
sc.WorkingDirectory = "%USERPROFILE%"
sc.WindowStyle = 1
sc.Save
`;
  fs.writeFileSync(vbsFile, vbs);
  try {
    execSync(`cscript //nologo "${vbsFile}"`);
    console.log(`✅ Atalho criado com sucesso: ${shortcutPath}`);
  } finally {
    try { if (fs.existsSync(vbsFile)) fs.unlinkSync(vbsFile); } catch (_) {}
  }
}

const vpsUrl = 'http://209.50.241.22:3000';
const appTarget = browserExe || 'cmd.exe';
const appArgs = browserExe ? `--app=${vpsUrl}` : `/c start ${vpsUrl}`;
const iconLoc = fs.existsSync(fenixIco) ? `${fenixIco},0` : 'shell32.dll,220';

// A. Desktop shortcut "Fênix OS.lnk"
createWindowsShortcut(
  path.join(desktopDir, 'Fênix OS.lnk'),
  appTarget,
  appArgs,
  iconLoc,
  'Fênix OS - Spatial AI Operating System (VPS Cloud)'
);

// B. PROJETOS shortcut "Fenix OS.lnk" and "Fênix OS (VPS).lnk"
createWindowsShortcut(
  path.join(projetosDir, 'Fênix OS (VPS).lnk'),
  appTarget,
  appArgs,
  iconLoc,
  'Fênix OS - Spatial AI Operating System (VPS Cloud)'
);
createWindowsShortcut(
  path.join(projetosDir, 'Fenix OS.lnk'),
  appTarget,
  appArgs,
  iconLoc,
  'Fênix OS - Spatial AI Operating System (VPS Cloud)'
);

// 5. Create launcher BAT in PROJETOS
const batContent = `@echo off
chcp 65001 >nul
title Fênix OS - Conectando VPS...
echo ========================================================
echo   FÊNIX OS - SPATIAL AI OPERATING SYSTEM (VPS CLOUD)
echo   Conectando a http://209.50.241.22:3000 em modo app...
echo ========================================================
if exist "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" (
  start "" "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --app=http://209.50.241.22:3000
) else if exist "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" (
  start "" "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --app=http://209.50.241.22:3000
) else (
  start http://209.50.241.22:3000
)
exit
`;
fs.writeFileSync(path.join(projetosDir, 'Iniciar-fenix-vps.bat'), batContent, 'utf8');
fs.writeFileSync(path.join(projetosDir, 'Iniciar-fenix.bat'), batContent, 'utf8');
console.log('✅ Iniciar-fenix.bat e Iniciar-fenix-vps.bat configurados.');

// 6. Update C:\Users\Dell\Desktop\PROJETOS\projetos.json for fenix entry
const projetosJsonPath = path.join(projetosDir, 'projetos.json');
if (fs.existsSync(projetosJsonPath)) {
  const content = fs.readFileSync(projetosJsonPath, 'utf8');
  try {
    const data = JSON.parse(content.replace(/^\uFEFF/, ''));
    const fenixEntry = data.items.find(i => i.id === 'fenix');
    if (fenixEntry) {
      fenixEntry.remoteUrl = vpsUrl;
      fenixEntry.url = vpsUrl;
      fs.writeFileSync(projetosJsonPath, JSON.stringify(data, null, 2), 'utf8');
      console.log('✅ projetos.json atualizado com remoteUrl para Fênix OS');
    }
  } catch (err) {
    console.error('Erro ao atualizar projetos.json:', err.message);
  }
}

console.log('[FenixDesktopPWA] Concluído com sucesso!');
