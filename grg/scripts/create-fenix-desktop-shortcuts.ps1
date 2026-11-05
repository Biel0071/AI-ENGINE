$sh = New-Object -ComObject WScript.Shell

$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$browser = if (Test-Path $chrome) { $chrome } elseif (Test-Path $edge) { $edge } else { "cmd.exe" }

$vpsUrl = "http://209.50.241.22:3000"
$args = if ($browser -ne "cmd.exe") { "--app=$vpsUrl" } else { "/c start $vpsUrl" }
$icon = "C:\Users\Dell\Desktop\PROJETOS\logos\fenix.ico,0"

# 1. Desktop shortcut: "Fenix OS.lnk"
$sc1 = $sh.CreateShortcut("C:\Users\Dell\Desktop\Fenix OS.lnk")
$sc1.TargetPath = $browser
$sc1.Arguments = $args
$sc1.IconLocation = $icon
$sc1.Description = "Fenix OS - Spatial AI Operating System (VPS Cloud)"
$sc1.WorkingDirectory = $env:USERPROFILE
$sc1.Save()

# 2. Desktop shortcut: "Fenix OS (VPS).lnk"
$sc2 = $sh.CreateShortcut("C:\Users\Dell\Desktop\Fenix OS (VPS).lnk")
$sc2.TargetPath = $browser
$sc2.Arguments = $args
$sc2.IconLocation = $icon
$sc2.Description = "Fenix OS - Spatial AI Operating System (VPS Cloud)"
$sc2.WorkingDirectory = $env:USERPROFILE
$sc2.Save()

# 3. PROJETOS folder shortcut: "Fenix OS.lnk"
$sc3 = $sh.CreateShortcut("C:\Users\Dell\Desktop\PROJETOS\Fenix OS.lnk")
$sc3.TargetPath = $browser
$sc3.Arguments = $args
$sc3.IconLocation = $icon
$sc3.Description = "Fenix OS - Spatial AI Operating System (VPS Cloud)"
$sc3.WorkingDirectory = $env:USERPROFILE
$sc3.Save()

# 4. PROJETOS folder shortcut: "Fenix OS (VPS).lnk"
$sc4 = $sh.CreateShortcut("C:\Users\Dell\Desktop\PROJETOS\Fenix OS (VPS).lnk")
$sc4.TargetPath = $browser
$sc4.Arguments = $args
$sc4.IconLocation = $icon
$sc4.Description = "Fenix OS - Spatial AI Operating System (VPS Cloud)"
$sc4.WorkingDirectory = $env:USERPROFILE
$sc4.Save()

Write-Output "SHORTCUTS_CREATED_OK"
