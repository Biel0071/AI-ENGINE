import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import winston from 'winston';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || '*';

// Middleware
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:5173', FRONTEND_URL],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create HTTP server and Socket.IO
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:8080', 'http://localhost:5173', FRONTEND_URL],
    credentials: true
  }
});

// In-memory storage (can be replaced with PostgreSQL)
const conversations = new Map();
const customers = new Map();
const messages = new Map();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.get('/api/customers', (req, res) => {
  res.json({ customers: Array.from(customers.values()) });
});

app.get('/api/customers/:id', (req, res) => {
  const customer = customers.get(req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  res.json(customer);
});

app.post('/api/customers', (req, res) => {
  const { name, phone, email, company } = req.body;
  const id = `cust_${Date.now()}`;
  const customer = { id, name, phone, email, company, createdAt: new Date().toISOString() };
  customers.set(id, customer);
  io.emit('customer:created', customer);
  res.status(201).json(customer);
});

app.get('/api/conversations', (req, res) => {
  res.json({ conversations: Array.from(conversations.values()) });
});

app.get('/api/conversations/:id/messages', (req, res) => {
  const convMessages = messages.get(req.params.id) || [];
  res.json({ messages: convMessages });
});

app.post('/api/messages/send', (req, res) => {
  const { conversationId, content, type = 'text' } = req.body;
  const message = {
    id: `msg_${Date.now()}`,
    conversationId,
    content,
    type,
    from: 'system',
    timestamp: new Date().toISOString()
  };
  
  if (!messages.has(conversationId)) {
    messages.set(conversationId, []);
  }
  messages.get(conversationId).push(message);
  
  io.to(conversationId).emit('message:new', message);
  res.json(message);
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('join:conversation', (conversationId) => {
    socket.join(conversationId);
    logger.info(`Client ${socket.id} joined conversation ${conversationId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
httpServer.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 ZapAI Backend running on port ${PORT}`);
  logger.info(`📡 WebSocket server ready`);
  logger.info(`🌍 CORS enabled for: ${FRONTEND_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  httpServer.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

export { app, io, logger };
