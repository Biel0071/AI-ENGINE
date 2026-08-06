const fs = require('fs/promises');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

class IntelligenceAdapter {
    static async execute(pkg, provider) {
        console.log(`[Adapter] Chamando provedor de IA: ${provider.toUpperCase()}`);
        
        const openAiKey = process.env.OPENAI_API_KEY;
        if (!openAiKey) {
            throw new Error("OPENAI_API_KEY não encontrada no .env");
        }

        const prompt = `
Você é o Agente de IA: ${provider.toUpperCase()} trabalhando no FÊNIX Agent OS.
Sua missão: ${pkg.mission.id} - ${pkg.mission.title}
Objetivo: ${pkg.goal}
Arquivos permitidos para alteração: ${JSON.stringify(pkg.allowedFiles)}

Você deve fornecer uma resposta no formato JSON estrito, sem nenhum markdown ao redor, seguindo essa estrutura exata:
{
  "patch": "string com o diff unificado (estilo git) das alterações",
  "summary": "resumo do que foi feito",
  "warnings": ["qualquer aviso sobre a implementação"],
  "reasoning": "explicação do seu raciocínio arquitetural",
  "confidence": 0.95
}

Restrições (Architecture Freeze):
- Você NÃO PODE criar novos diretórios estruturais.
- Você DEVE alterar APENAS os arquivos permitidos.
- Se o escopo for grg/src/kernel/store.js, você deve garantir que a função seja robusta e não quebre a interface MemoryStore existente.

MUITO IMPORTANTE: Não retorne markdown como \`\`\`json. Retorne APENAS o JSON parseável puro!
`;

        try {
            // Como fallback genérico para o benchmark inicial (já que só temos OPENAI_API_KEY confirmada),
            // rotearemos todos temporariamente pela OpenAI, mas variando a temperatura/modelo para simular agentes diferentes,
            // ou implementaremos os endpoints reais se as chaves existirem depois.
            
            let model = "gpt-4o-mini";
            if (provider === "codex") model = "gpt-4o";
            if (provider === "claude") model = "gpt-4o"; // Usando 4o como fallback para claude
            
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${openAiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: "system", content: "Você é uma IA programadora especialista em JavaScript e Node.js." },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.2
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`API Error: ${response.status} - ${errText}`);
            }

            const data = await response.json();
            let content = data.choices[0].message.content.trim();
            
            // Limpa markdown caso a IA desobedeça
            if (content.startsWith('\`\`\`json')) {
                content = content.substring(7);
            }
            if (content.startsWith('\`\`\`')) {
                content = content.substring(3);
            }
            if (content.endsWith('\`\`\`')) {
                content = content.substring(0, content.length - 3);
            }
            
            const result = JSON.parse(content.trim());
            return {
                patch: result.patch || "",
                summary: result.summary || "No summary",
                warnings: result.warnings || [],
                reasoning: result.reasoning || "No reasoning",
                confidence: result.confidence || 0.9,
                tokensInput: data.usage.prompt_tokens,
                tokensOutput: data.usage.completion_tokens
            };

        } catch (error) {
            console.error(`[Adapter] Erro ao chamar ${provider}:`, error.message);
            return {
                patch: "",
                summary: "Falha na chamada da API",
                warnings: [error.message],
                reasoning: "A API do provedor falhou.",
                confidence: 0,
                tokensInput: 0,
                tokensOutput: 0
            };
        }
    }
}

module.exports = IntelligenceAdapter;
