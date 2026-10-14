'use strict';

// MISSION-0004 — CONTRATO DE UM CONECTOR.
//
// Este arquivo NÃO conecta a nada. Ele define a forma que todo conector do Connector
// Runtime precisa ter, e valida essa forma no momento do registro. É um validador de
// interface, não uma classe base: cada conector traz sua própria lógica (o GitHub compõe
// o GitHubConnector existente; um conector futuro comporá outra coisa). Uma classe base
// tentaria adivinhar comportamento comum que não existe — REST, OAuth e webhook não
// compartilham implementação, só compartilham contrato.
//
// Por que um contrato explícito importa aqui: a regra REALITY FIRST proíbe o painel mostrar
// CONNECTED por configuração. Para o runtime derivar o estado real, ele precisa poder
// chamar authenticate/selfTest/health em QUALQUER conector do mesmo jeito. Sem o contrato,
// cada conector exporia métodos diferentes e o runtime cairia em ifs por tipo — que é onde
// a mentira se esconde ("se for github faça X, senão assuma conectado").

// Os doze métodos que a MISSION-0004 exige de todo conector. A ordem é a do ciclo de vida:
// identidade → conexão → prova → capacidade → observação.
const REQUIRED_METHODS = Object.freeze([
  'register',      // declara identidade e contrato no registry
  'connect',       // transição de lifecycle para uso (REST não mantém socket vivo)
  'disconnect',    // encerra o uso; volta o lifecycle
  'authenticate',  // há credencial? mede presença, nunca fabrica sucesso
  'authorize',     // a credencial cobre o escopo pedido?
  'selfTest',      // prova de vida real contra a fonte, sem efeito colateral
  'health',        // estado derivado de authenticate + selfTest, nunca literal
  'capabilities',  // o que o conector realmente sabe fazer
  'limits',        // limites da fonte, para o runtime respeitar
  'events',        // eventos que o conector emite/recebe
  'metrics',       // chamadas/latência/falhas medidas
  'version',       // versão da API/protocolo
]);

// Estados de lifecycle. CONNECTED é o único que exige prova (authenticate+selfTest+health);
// os demais são posições honestas de quem ainda não provou conexão. Nunca existe um estado
// "quase conectado" que o painel possa arredondar para CONNECTED.
const CONNECTOR_STATES = Object.freeze({
  PLANNED: 'PLANNED',             // conector previsto, sem implementação
  CONFIGURED: 'CONFIGURED',       // registrado, contrato aceito, sem credencial provada
  AUTHENTICATED: 'AUTHENTICATED', // credencial presente, mas selfTest ainda não passou
  CONNECTED: 'CONNECTED',         // authenticate + selfTest + health OK, medido
  DEGRADED: 'DEGRADED',           // já conectou, mas o selfTest mais recente falhou
  DISCONNECTED: 'DISCONNECTED',   // desligado explicitamente
  ERROR: 'ERROR',                 // falha não recuperável na última medição
});

// Lança se o conector não implementa os doze métodos. Chamado pelo runtime no registro:
// um conector incompleto não entra, em vez de entrar e falhar no meio de uma operação.
function assertConnectorContract(impl) {
  if (!impl || typeof impl !== 'object') {
    throw new Error('connector must be an object implementing the connector contract');
  }
  const missing = REQUIRED_METHODS.filter((name) => typeof impl[name] !== 'function');
  if (missing.length) {
    throw new Error(`connector '${impl.id || 'unknown'}' is missing required methods: ${missing.join(', ')}`);
  }
  if (!impl.id || typeof impl.id !== 'string') {
    throw new Error('connector must expose a string id');
  }
  return true;
}

module.exports = { REQUIRED_METHODS, CONNECTOR_STATES, assertConnectorContract };
