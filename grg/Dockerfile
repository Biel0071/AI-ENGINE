FROM node:22.17.1-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22.17.1-alpine
ENV NODE_ENV=production
WORKDIR /app
# git: o repo-intel clona/le repositorios de verdade (git clone/log/diff). Sem ele o
# scanner falha com "git: not found" e a capability cai em erro, nao em fallback.
RUN apk add --no-cache docker-cli git && addgroup -S fenix && adduser -S -G fenix -u 10001 fenix
COPY --from=dependencies --chown=fenix:fenix /app/node_modules ./node_modules
COPY --chown=fenix:fenix src ./src
COPY --chown=fenix:fenix skills ./skills
COPY --chown=fenix:fenix public ./public
COPY --chown=fenix:fenix runtime ./runtime
COPY --chown=fenix:fenix ops/container-entrypoint.sh ./ops/container-entrypoint.sh
# Diagnostico read-only dentro do container: context-snapshot (Living Mode: veracidade
# operacional medida pelo auditor), import-closure, llm-preflight, capability-probe.
# Sem isto o operador nao consegue medir o runtime de dentro de producao, que e onde importa.
COPY --chown=fenix:fenix ops/context-snapshot.js ops/import-closure.js ops/llm-preflight.js ops/capability-probe.js ./ops/
COPY --chown=fenix:fenix package.json ./package.json
USER 10001:10001
EXPOSE 4400
HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD wget -qO- http://127.0.0.1:4400/health || exit 1
ENTRYPOINT ["/app/ops/container-entrypoint.sh"]
CMD ["node", "src/server.js"]
