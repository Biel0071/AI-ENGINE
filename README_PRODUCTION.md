# 🚀 ZapAI CRM - Guia de Produção na VPS

## Visão Geral

Este guia descreve como implantar o ZapAI CRM em uma VPS (Virtual Private Server) para produção, com back-end e front-end estáveis e prontos para uso.

## Requisitos da VPS

- **Sistema Operacional**: Ubuntu 20.04+ ou Debian 11+
- **RAM**: Mínimo 2GB (recomendado 4GB+)
- **CPU**: 2 vCPUs ou mais
- **Armazenamento**: 20GB+ SSD
- **Ports**: 22 (SSH), 80 (HTTP), 443 (HTTPS) liberados

## Instalação Rápida (0-Click)

### Opção 1: Script Automático de Produção

```bash
# Acessar VPS via SSH
ssh root@seu-ip-vps

# Baixar e executar script de produção
cd /tmp
wget https://raw.githubusercontent.com/seu-repo/zapai-crm/main/production-setup.sh
chmod +x production-setup.sh
./production-setup.sh
```

### Opção 2: Instalação Manual Passo a Passo

#### 1. Preparar Ambiente

```bash
# Atualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instalar Nginx
apt install -y nginx

# Instalar Git
apt install -y git
```

#### 2. Clonar Repositório

```bash
cd /opt
git clone https://github.com/seu-repo/zapai-crm.git
cd zapai-crm
```

#### 3. Configurar Backend

```bash
cd /opt/zapai-crm/crm/backend

# Instalar dependências
npm install --production

# Criar arquivo .env
cat > .env << EOF
PORT=4000
NODE_ENV=production
FRONTEND_URL=http://seu-ip-vps
OPENAI_API_KEY=sua-chave-aqui
