#!/bin/bash

# ZapAI CRM - VPS Deployment Script
# This script deploys the complete ZapAI CRM system to a VPS

set -e

echo "🚀 ZapAI CRM - VPS Deployment Script"
echo "======================================"

# Configuration
APP_NAME="zapai-crm"
INSTALL_DIR="/opt/zapai-crm"
BACKEND_PORT=4000
FRONTEND_PORT=8080
SYSTEMD_USER="root"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root or with sudo"
    exit 1
fi

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found. Installing..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm not found"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_warn "Docker not found. Installing..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        systemctl enable docker
        systemctl start docker
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_warn "Docker Compose not found. Installing..."
        apt-get install -y docker-compose
    fi
    
    log_info "Prerequisites check complete"
}

# Create application directory
setup_directory() {
    log_info "Setting up application directory..."
    
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    
    # Clone repository if not exists
    if [ ! -d ".git" ]; then
        log_info "Cloning repository..."
        git clone . "$INSTALL_DIR" 2>/dev/null || cp -r /workspace/* "$INSTALL_DIR"/
    fi
    
    log_info "Directory setup complete"
}

# Setup backend
setup_backend() {
    log_info "Setting up backend..."
    
    cd "$INSTALL_DIR/crm/backend"
    
    # Install dependencies
    npm install --production
    
    # Create logs directory
    mkdir -p logs
    
    # Create systemd service file
    cat > /etc/systemd/system/zapai-backend.service << EOSERVICE
[Unit]
Description=ZapAI CRM Backend Service
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=$SYSTEMD_USER
WorkingDirectory=$INSTALL_DIR/crm/backend
Environment="NODE_ENV=production"
Environment="PORT=$BACKEND_PORT"
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=zapai-backend

[Install]
WantedBy=multi-user.target
EOSERVICE

    log_info "Backend setup complete"
}

# Setup frontend
setup_frontend() {
    log_info "Setting up frontend..."
    
    cd "$INSTALL_DIR/crm/frontend"
    
    # Install dependencies
    npm install --production
    
    # Build frontend
    npm run build
    
    log_info "Frontend setup complete"
}

# Setup Docker services
setup_docker() {
    log_info "Setting up Docker services..."
    
    cd "$INSTALL_DIR"
    
    # Start Docker services (Qdrant, Docling)
    docker-compose up -d
    
    log_info "Docker services started"
}

# Configure firewall
configure_firewall() {
    log_info "Configuring firewall..."
    
    # Allow SSH
    ufw allow 22/tcp 2>/dev/null || true
    
    # Allow backend port
    ufw allow $BACKEND_PORT/tcp 2>/dev/null || true
    
    # Allow frontend port (if using dev server)
    ufw allow $FRONTEND_PORT/tcp 2>/dev/null || true
    
    # Enable UFW if not already enabled
    ufw --force enable 2>/dev/null || true
    
    log_info "Firewall configured"
}

# Start services
start_services() {
    log_info "Starting services..."
    
    # Reload systemd
    systemctl daemon-reload
    
    # Enable and start backend
    systemctl enable zapai-backend
    systemctl start zapai-backend
    
    # Wait for backend to be ready
    sleep 5
    
    # Check backend status
    if systemctl is-active --quiet zapai-backend; then
        log_info "Backend service started successfully"
    else
        log_error "Failed to start backend service"
        systemctl status zapai-backend --no-pager
        exit 1
    fi
    
    log_info "All services started"
}

# Generate deployment report
generate_report() {
    echo ""
    echo "======================================"
    echo "✅ Deployment Complete!"
    echo "======================================"
    echo ""
    echo "📍 Installation Directory: $INSTALL_DIR"
    echo "🔧 Backend Port: $BACKEND_PORT"
    echo "🎨 Frontend Port: $FRONTEND_PORT"
    echo ""
    echo "🌐 Access URLs:"
    echo "   - Backend API: http://$(hostname -I | awk '{print $1}'):${BACKEND_PORT}/api/health"
    echo "   - Frontend (dev): http://$(hostname -I | awk '{print $1}'):${FRONTEND_PORT}"
    echo ""
    echo "📊 Service Status:"
    echo "   - Backend: $(systemctl is-active zapai-backend)"
    echo "   - Docker: $(systemctl is-active docker)"
    echo ""
    echo "📝 Useful Commands:"
    echo "   - View backend logs: journalctl -u zapai-backend -f"
    echo "   - Restart backend: systemctl restart zapai-backend"
    echo "   - Stop backend: systemctl stop zapai-backend"
    echo "   - Docker logs: docker-compose logs -f"
    echo ""
    echo "======================================"
}

# Main execution
main() {
    check_prerequisites
    setup_directory
    setup_backend
    setup_frontend
    setup_docker
    configure_firewall
    start_services
    generate_report
}

# Run main function
main "$@"
