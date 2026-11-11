'use strict';
// Contexto do job em execucao (por chamada assincrona). Permite que camadas profundas,
// como o AIGateway, saibam a qual job/missao uma chamada de IA pertence sem mudar a
// assinatura de cada servico. Fora de um job, getStore() retorna undefined.
const { AsyncLocalStorage } = require('node:async_hooks');

const jobContext = new AsyncLocalStorage();

module.exports = { jobContext };