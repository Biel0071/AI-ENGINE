# FÊNIX — Roteiro consolidado (LEVEL 2 → 4) — 2026-11-11

Junta quatro pedidos do dono: LEVEL 2 (convergência das IAs), LEVEL 3 (universo empresarial vivo), "Sociedade autônoma nativa da VPS" e LEVEL 4 (fábrica universal de criação). Detalhes do LEVEL 3 em `FENIX_LEVEL3_SPEC.md`.

## Princípio que manda em tudo

**O FÊNIX existe sem Claude, Codex, Antigravity ou qualquer API externa.** A VPS é o corpo; IAs externas são colaboradoras opcionais que entram e saem sem desligar nada.

| Camada | Funciona sem LLM? | Estado em 2026-11-11 |
|---|---|---|
| 1. Existência (runtime, memória, filas, telemetria, agentes, interface) | Sim | Existe: PM2 na VPS, Postgres, Redis/BullMQ, hub, diretor, aprovações |
| 2. Conversa (modelos locais + resposta determinística quando não há modelo) | Parcial | Chat usa Ollama local; respostas de localização e de páginas já são determinísticas (mapa do frontend, Page Registry); o fallback antigo ainda é genérico |
| 3. Inteligência avançada (Groq/OpenRouter/Gemini/Claude…) | — | API Platform já suporta Groq, OpenRouter, Gemini, OpenAI, Anthropic, xAI; **falta a chave do dono** |

Restrição física medida: a VPS não tem GPU. Benchmark de 2026-11-11 (3 tarefas reais com teste de aceitação) nos modelos locais: `qwen2.5:3b` 89 % (22 s/tarefa), `qwen2.5-coder:1.5b` 78 % (11 s), `deepseek-r1:1.5b` 67 % (38 s). Servem para funções pequenas **sempre com teste**; não constroem sistemas complexos sozinhos. Render 3D, vídeo e música pesada não rodam na VPS: ela coordena, a GPU fica na máquina do dono ou em serviço externo autorizado.

## LEVEL 2 — Convergência (feito nesta etapa, ver registro de execução)

Contabilidade da suíte corrigida (PASS/FAIL/SKIP); busca em português por telas, botões e arquivos (mapa gerado do código); respostas de localização exatas sem depender do modelo; ordem do diretor de 8–16 s para ~1,2 s; indicadores reais de convergência; 3 processos MCP reais simultâneos certificados (10/10) com persistência após reinício; benchmark de modelos; especificação do LEVEL 3.

## Próximo: ENTREGA A — FÊNIX autônomo na VPS (recomendado pelo dono como primeiro)

Comprovar, **sem Claude e sem API externa**, o ciclo: ordem → missão → gerente → subagente → código gerado pelo modelo local → teste → resultado devolvido.

1. **Hierarquia mínima real**: Diretor Fênix → Gerente de Tecnologia → Desenvolvedor/QA, como identidades persistentes (reaproveitar catálogo de agentes + diretor + MissionKernel). Limites: profundidade 3, concorrência 1–2 (CPU da VPS), orçamento de tokens por missão.
2. **Tarefa de código local com teste**: o gerente quebra a ordem em funções pequenas; o desenvolvedor gera com `qwen2.5:3b` via API Platform; o QA roda os testes; até 3 tentativas com o erro do teste como feedback; falhou → "precisa de modelo maior ou humano" (honesto).
3. **Conversa com gerente/funcionário**: falar com o Gerente de Tecnologia e ele responder com o estado real da missão (dados do runtime, não texto inventado).
4. **Modo sem modelo**: se o Ollama cair, o FÊNIX continua: aceita ordens, mostra estado, responde perguntas de dados de forma determinística e avisa que a geração está indisponível.
5. **Telemetria viva da VPS** (pedido explícito): CPU por núcleo, RAM, disco, PM2/Docker, Postgres, Redis/filas, Ollama (modelos carregados, latência), API Platform — coleta leve, sem inventar CPU por agente que divide processo.

*Pronto quando:* uma ordem real ("crie a função X com teste") percorre o ciclo inteiro na VPS com o Claude desconectado, deixa missão, jobs, tentativas, código e resultado registrados, e o painel mostra a VPS trabalhando.

## Depois

- **ENTREGA B — Sociedade empresarial** (LEVEL 3 fases A, E, G, H, I, J; sociedade autônoma fases 2–7): empresas, departamentos, funcionários como identidades sobre um pool pequeno de workers, reuniões registradas, central de ideias, workforce com limites. Integrações reais (WhatsApp, Meta) só por API oficial/OAuth com autorização do dono por conta.
- **ENTREGA C — Universo vivo** (LEVEL 3 fases B, C, D, F): motor com instancing/LOD primeiro (hoje 3.489 chamadas de desenho por quadro), cidade por regiões, prédio em corte com andares, estações e animação por estado real.
- **LEVEL 4 — Fábrica de criação** (jogos, imagens, vídeo, música, 3D, CAD): catálogo de ferramentas com capacidade **testada** antes de anunciada (FFmpeg e ComfyUI já aparecem na API Platform; Blender/Godot/FreeCAD a verificar). Render e geração pesada em GPU do dono ou serviço autorizado; a VPS coordena, guarda arquivos e conhecimento reutilizável. Contas externas só por OAuth/chave que o dono autorizar — o FÊNIX prepara o fluxo, não cria credenciais.

## Decisões do dono

1. Aprovar a Entrega A como próximo passo.
2. Chave de um provedor econômico na API Platform (opcional, mas destrava a camada 3).
3. Para o LEVEL 4: em qual máquina com GPU rodam render e geração pesada.