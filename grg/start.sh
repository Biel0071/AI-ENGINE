#!/usr/bin/env bash
# Sobe o GRG Services OS ligado ao AI Platform Enterprise (a "API GRATIS" do portfólio).
# Cadeia de LLM: AI Platform (VPS/gateway) -> Ollama local -> modo regras.
#
# Ajuste GRG_AIPLATFORM_URL quando o túnel da VPS mudar (cat "API GRATIS/tunnel-url.txt").
# Se a VPS estiver fora do ar, o sistema cai automaticamente no Ollama local.

export GRG_LLM=1
export GRG_AIPLATFORM_URL="${GRG_AIPLATFORM_URL:-}"
: "${GRG_AIPLATFORM_KEY:?GRG_AIPLATFORM_KEY must be supplied by the environment or secret manager}"
export GRG_LLM_MODEL="${GRG_LLM_MODEL:-qwen2.5:3b}"   # modelo Ollama de fallback
export PORT="${PORT:-4400}"

NODE="${GRG_NODE:-/c/Program Files/Adobe/Adobe Photoshop 2023/node.exe}"
cd "$(dirname "$0")"
echo "GRG_AIPLATFORM_URL=$GRG_AIPLATFORM_URL"
"$NODE" src/server.js
