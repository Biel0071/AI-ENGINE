const fs = require('fs');

async function main() {
  console.log('[MISSION] Iniciando Motor de Auto-Desenvolvimento FÊNIX...');
  const baseUrl = 'http://127.0.0.1:4400';

  // 1. FÊNIX FS API: Criar arquivo inicial
  console.log('[MISSION] Criando arquivo grg/src/utils/math.js via FÊNIX API...');
  const initCode = 'function add(a, b) {\n  return a + b;\n}\n\nmodule.exports = { add };\n';
  await fetch(`${baseUrl}/api/dev/fs/file?path=grg/src/utils/math.js`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: initCode })
  });

  // 2. ENGINE/PROVIDER API: Chamar AI Transform para modificar
  console.log('[MISSION] Chamando Motor de IA (Ollama/Qwen) via FÊNIX API...');
  const aiRes = await fetch(`${baseUrl}/api/dev/ai/transform-file`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: 'grg/src/utils/math.js', instruction: 'Mantenha o código existente. Adicione uma função subtract(a, b) que subtraia b de a. Exporte-a no module.exports junto com add.' })
  }).then(r => r.json());

  if (aiRes.error) {
    console.error('[MISSION] Erro na IA:', aiRes.error);
    return;
  }
  console.log(`[MISSION] Motor respondeu usando ${aiRes.provider} / ${aiRes.model}`);
  
  // 3. FÊNIX FS API: Salvar resultado
  console.log('[MISSION] Salvando código modificado via FÊNIX API...');
  await fetch(`${baseUrl}/api/dev/fs/file?path=grg/src/utils/math.js`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: aiRes.content })
  });

  // 4. Criar teste
  console.log('[MISSION] Criando arquivo de teste grg/test/math.test.js...');
  const testCode = `
const assert = require('assert');
const { add, subtract } = require('../src/utils/math');

// Testa Add
assert.strictEqual(add(2, 2), 4, 'add() deve somar 2 + 2 = 4');
// Testa Subtract
assert.strictEqual(subtract(5, 2), 3, 'subtract() deve subtrair 5 - 2 = 3');
console.log('MISSION_SUCCESS: Testes passaram perfeitamente no Motor FÊNIX!');
`;
  await fetch(`${baseUrl}/api/dev/fs/file?path=grg/test/math.test.js`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: testCode })
  });

  // 5. TEST: Executar o teste no FÊNIX Terminal
  console.log('[MISSION] Executando o teste via FÊNIX Terminal API...');
  const termRes = await fetch(`${baseUrl}/api/dev/terminal`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: 'node test/math.test.js', sessionId: 'mission-s1' })
  }).then(r => r.json());

  console.log('[MISSION] Job submetido ao terminal:', termRes.status);
  
  // Terminal é assíncrono, então aguardamos um instante e conferimos o terminal output ou executamos manualmente para evidência rápida
  console.log('[MISSION] FÊNIX Motor de Auto-Desenvolvimento executou todo o pipeline via APIs REST locais.');
}

main().catch(console.error);
