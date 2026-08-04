const fs = require('fs/promises');
const path = require('path');
const syncCommand = require('./sync');
const missionCommand = require('./mission');

async function promptCommand(client, args = []) {
    const targetAgent = (args[0] || 'codex').toLowerCase();

    const projectRoot = path.resolve(__dirname, '../../../');
    const snapshotPath = path.join(projectRoot, '.fenix-live-state.json');

    let state;
    try {
        const content = await fs.readFile(snapshotPath, 'utf8');
        state = JSON.parse(content);
    } catch {
        state = await syncCommand(client, { json: true });
    }

    const compiledPrompt = `
Você é um agente executor (${targetAgent.toUpperCase()}) operando no projeto FÊNIX (AI ENGINE CORE).
Você DEVE respeitar o Estado Real e as Invariantes Invioláveis sem recriar componentes existentes.

==================================================
1. CONTEXTO DO PROJETO (FÊNIX LIVE STATE)
==================================================
- Branch: ${state.git.branch} (${state.git.commit})
- Arquitetura: ${state.architecture}
- Maturidade Atual: ${state.scores.overall}%
- Suíte de Testes: ${state.tests.passed}/${state.tests.total} ${state.tests.status}

==================================================
2. MISSÃO ATIVA
==================================================
- Componente-Alvo: grg/src/infrastructure/
- Tarefa Principal: Substituir FileStore JSON por PostgreSQL manteniendo a interface StorePort em grg/src/kernel/store.js.

==================================================
3. REGRAS OBRIGATÓRIAS (AGENT RULES)
==================================================
1. NÃO crie arquivos de serviço duplicados (usar Auth, Store e AI Gateway em grg/src).
2. NÃO altere assinaturas de métodos exportados.
3. NÃO remova nem ignore testes unitários existentes.
4. Toda alteração de código DEVE ser validada rodando os testes do projeto.

Inicie a execução e forneça o diff com os resultados dos testes ao terminar.
`;

    console.log(`
==================================================
        PROMPT GERADO PARA: ${targetAgent.toUpperCase()}
==================================================
${compiledPrompt}
==================================================
Prompt gerado com sucesso. Copie o texto acima para o ${targetAgent.toUpperCase()}.
`);

    return compiledPrompt;
}

module.exports = promptCommand;
