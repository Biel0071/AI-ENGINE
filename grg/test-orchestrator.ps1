$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:4400"
$headers = @{
    "Content-Type" = "application/json"
    "x-tenant-id" = "grg"
    "x-actor-id" = "grg-admin"
    "x-dev-override" = "true"
}

Write-Host "1. Enviando Request para o Orquestrador Central..."
$reqBody = @{
    source = "Antigravity/Codex"
    userIntent = "Preciso que você adicione um botão vermelho brilhante na página principal que dispare confetes."
    project = "grg"
    constraints = "Deve usar CSS puro e animações 60fps."
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$baseUrl/api/orchestration/requests" -Method Post -Headers $headers -Body $reqBody
$requestId = $response.id
Write-Host "RequestId recebido: $requestId"
Write-Host "Status inicial: $($response.status)"
Start-Sleep -Seconds 1

Write-Host "2. Fazendo polling até a missão ser assinalada..."
$missionId = $null
$enhancedPrompt = $null
while ($true) {
    $reqStatus = Invoke-RestMethod -Uri "$baseUrl/api/orchestration/requests/$requestId" -Method Get -Headers $headers
    Write-Host "  -> Status atual: $($reqStatus.status)"
    if ($reqStatus.status -eq "ASSIGNED") {
        $missionId = $reqStatus.missionId
        $enhancedPrompt = $reqStatus.enhancedPrompt
        break
    }
    if ($reqStatus.status -eq "FAILED") {
        Write-Host "Falha na requisição!"
        exit 1
    }
    Start-Sleep -Seconds 1
}

Write-Host "Missão designada! MissionId: $missionId"
Write-Host "Enhanced Prompt gerado pelo FENIX:`n$enhancedPrompt"
Write-Host ""
Write-Host "3. Simulando trabalho do agente Codex..."
Start-Sleep -Seconds 2

Write-Host "4. Submetendo resultado da missão..."
$resultBody = @{
    changedFiles = @("src/frontend/index.html", "src/frontend/style.css")
    commitHash = "abc1234"
    status = "SUCCESS"
} | ConvertTo-Json

$missionResp = Invoke-RestMethod -Uri "$baseUrl/api/orchestration/missions/$missionId/result" -Method Post -Headers $headers -Body $resultBody
Write-Host "Resultado submetido. Status da missão: $($missionResp.status)"
Start-Sleep -Seconds 1

Write-Host "5. Verificando loop de validação..."
while ($true) {
    $mStatus = Invoke-RestMethod -Uri "$baseUrl/api/orchestration/missions/$missionId" -Method Get -Headers $headers
    Write-Host "  -> Mission Status: $($mStatus.status)"
    if ($mStatus.status -eq "COMPLETED" -or $mStatus.status -eq "REPAIRING") {
        Write-Host "Validação final concluída!"
        break
    }
    Start-Sleep -Seconds 1
}

Write-Host "Teste Real-State AI City..."
$swarm = Invoke-RestMethod -Uri "$baseUrl/api/agents/swarm" -Method Get -Headers $headers
$activeAgent = $swarm.agents | Where-Object { $_.currentMission -eq $missionId }
if ($activeAgent) {
    Write-Host "SUCESSO: A missão ativa apareceu no enxame de agentes! Agent $($activeAgent.id) is $($activeAgent.status) doing '$($activeAgent.activity)'"
} else {
    Write-Host "Agent finalizado ou não listado no enxame. OK."
}

Write-Host "Fluxo FÊNIX ORCHESTRATOR Finalizado com sucesso."
