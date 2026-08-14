# ZapAI CRM - Guia de Deploy na VPS

## Status Atual do Sistema

✅ **Backend**: Funcional e testado
- Porta: 4000
- Health check: http://localhost:4000/api/health
- WebSocket: Habilitado

✅ **Frontend**: Build pronto em /workspace/crm/frontend/dist

✅ **Scripts de Deploy**: Criados e prontos
- production-setup.sh (deploy completo)
- deploy-vps.sh (alternativo)

## Como Implantar na SUA VPS

### Passo 1: Acessar sua VPS

```bash
ssh root@SEU_IP_VPS
```

### Passo 2: Copiar Projeto para VPS

No seu computador local:
```bash
scp -r /workspace/* root@SEU_IP_VPS:/opt/zapai-crm/
```

OU usar git na VPS:
```bash
cd /opt
git clone SEU_REPO_GIT zapai-crm
cd zapai-crm
```

### Passo 3: Executar Script de Producao

Na VPS:
```bash
cd /opt/zapai-crm
chmod +x production-setup.sh
./production-setup.sh
```

O script vai:
1. Instalar Node.js, Docker, Nginx
2. Instalar dependencias do backend e frontend
3. Fazer build de producao do frontend
4. Iniciar servicos Docker (Qdrant, Docling)
5. Configurar systemd para o backend
6. Configurar Nginx como proxy reverso
7. Configurar firewall
8. Iniciar todos os servicos

## URLs de Acesso Apos Deploy

Substitua SEU_IP_VPS pelo IP da sua VPS:

- **Aplicacao Principal**: http://SEU_IP_VPS
- **API Health**: http://SEU_IP_VPS/api/health
- **Backend Direto**: http://SEU_IP_VPS:4000/api/health

## Comandos Uteis na VPS

```bash
# Ver logs do backend
journalctl -u zapai-backend -f

# Ver status dos servicos
systemctl status zapai-backend
systemctl status nginx
systemctl status docker

# Reiniciar backend
systemctl restart zapai-backend

# Logs do Docker
docker-compose logs -f
```

## Requisitos da VPS

- Ubuntu 20.04+ ou Debian 11+
- 2GB RAM minimo (4GB recomendado)
- 2 vCPUs
- 20GB armazenamento
- Portas liberadas: 22 (SSH), 80 (HTTP), 443 (HTTPS)

## Arquivos no Workspace

- /workspace/production-setup.sh - Script principal de deploy
- /workspace/deploy-vps.sh - Script alternativo
- /workspace/README_PRODUCTION.md - Documentacao completa
- /workspace/crm/backend/src/server.js - Backend funcional
- /workspace/crm/frontend/dist/ - Frontend buildado

## Teste Local Antes de Subir

Backend ja esta rodando localmente:
- http://localhost:4000/api/health

Para testar frontend:
```bash
cd /workspace/crm/frontend
npm run dev
```
Acesse: http://localhost:8080

---
Versao: 1.0
Data: 2025
