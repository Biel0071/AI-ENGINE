$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:4400"
$headers = @{
    "Content-Type" = "application/json"
    "x-tenant-id" = "grg"
    "x-actor-id" = "grg-admin"
    "x-dev-override" = "true"
}

Write-Host "--- MISSION 1: Aprendizado ---"
$reqBody = @{
    source = "Antigravity/Codex"
    userIntent = "Crie um endpoint de upload que salve na AWS"
    project = "grg"
    constraints = "Sem restrições."
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$baseUrl/api/orchestration/requests" -Method Post -Headers $headers -Body $reqBody
$req1 = $response.id
Start-Sleep -Seconds 1

$mission1 = $null
while ($true) {
    $reqStatus = Invoke-RestMethod -Uri "$baseUrl/api/orchestration/requests/$req1" -Method Get -Headers $headers
    if ($reqStatus.status -eq "ASSIGNED") { $mission1 = $reqStatus.missionId; break }
    if ($reqStatus.status -eq "FAILED") { exit 1 }
    Start-Sleep -Seconds 1
}

Write-Host "Mission 1 Assigned. Submitting result to trigger Memory..."
$resultBody = @{ changedFiles = @("src/api/upload.js"); status = "SUCCESS" } | ConvertTo-Json
$null = Invoke-RestMethod -Uri "$baseUrl/api/orchestration/missions/$mission1/result" -Method Post -Headers $headers -Body $resultBody

while ($true) {
    $mStatus = Invoke-RestMethod -Uri "$baseUrl/api/orchestration/missions/$mission1" -Method Get -Headers $headers
    if ($mStatus.status -eq "COMPLETED") { Write-Host "Mission 1 Completed! Memory should be recorded."; break }
    Start-Sleep -Seconds 1
}

Start-Sleep -Seconds 2

Write-Host "--- MISSION 2: Testando Injeção de Memória e Multi-Project ---"
$reqBody2 = @{
    source = "Antigravity/Codex"
    userIntent = "Crie um endpoint de upload de imagens."
    project = "grg"
} | ConvertTo-Json

$response2 = Invoke-RestMethod -Uri "$baseUrl/api/orchestration/requests" -Method Post -Headers $headers -Body $reqBody2
$req2 = $response2.id
Start-Sleep -Seconds 1

while ($true) {
    $reqStatus = Invoke-RestMethod -Uri "$baseUrl/api/orchestration/requests/$req2" -Method Get -Headers $headers
    if ($reqStatus.status -eq "ASSIGNED") { 
        Write-Host "Enhanced Prompt da Missão 2 (Deve conter APRENDIZADOS ANTERIORES e MULTI-SYSTEM MAP):"
        Write-Host "==================================================="
        Write-Host $reqStatus.enhancedPrompt
        Write-Host "==================================================="
        break 
    }
    Start-Sleep -Seconds 1
}

Write-Host "Teste concluído."
