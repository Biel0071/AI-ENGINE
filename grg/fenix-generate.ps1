param(
  [string]$Prompt,
  [string]$Task = "generate",
  [string]$ApiKey = "ap_2c76a73c5dae496e922a53d5803f2aa4b6cf0c1fd247f6c2",
  [string]$ApiUrl = "http://localhost:3000",
  [string]$Model  = "qwen2.5:3b",
  [int]$TimeoutSec = 120
)
$body = @{
  provider = "ollama"
  model    = $Model
  messages = @(
    @{ role = "system"; content = "Voce e o FENIX. Gere APENAS o codigo solicitado, sem explicacoes extras, direto o codigo." },
    @{ role = "user";   content = $Prompt }
  )
} | ConvertTo-Json -Depth 5

try {
  $r = Invoke-RestMethod -Uri "$ApiUrl/v1/chat" -Method POST -Body $body -ContentType "application/json" -Headers @{ "x-api-key" = $ApiKey } -TimeoutSec $TimeoutSec
  $content = $r.result.message.content
  Write-Host "GENERATED [$Task] tokens=$($r.tokens.total)" -ForegroundColor Green
  Write-Output $content
} catch {
  Write-Error "FAILED [$Task]: $($_.Exception.Message)"
  exit 1
}
