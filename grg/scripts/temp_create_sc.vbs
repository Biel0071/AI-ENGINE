
Set sh = CreateObject("WScript.Shell")
Set sc = sh.CreateShortcut("C:\\Users\\Dell\\Desktop\\PROJETOS\\Fenix OS.lnk")
sc.TargetPath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
sc.Arguments = "--app=http://209.50.241.22:3000"
sc.IconLocation = "C:\\Users\\Dell\\Desktop\\PROJETOS\\logos\\fenix.ico,0"
sc.Description = "Fênix OS - Spatial AI Operating System (VPS Cloud)"
sc.WorkingDirectory = "%USERPROFILE%"
sc.WindowStyle = 1
sc.Save
