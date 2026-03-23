const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');

const LOG_DIRECTORY = path.join(__dirname, '..', 'logs');
const categories = ['system', 'database', 'sessions', 'messages', 'ai', 'campaigns', 'microtasks'];
const loggers = new Map();

fs.mkdirSync(LOG_DIRECTORY, { recursive: true });

function buildLogger(category) {
  return createLogger({
    defaultMeta: { category },
    format: format.combine(
      format.timestamp(),
      format.errors({ stack: true }),
      format.json()
    ),
    level: process.env.LOG_LEVEL || 'info',
    transports: [
      new transports.File({ filename: path.join(LOG_DIRECTORY, `${category}.log`) }),
      new transports.Console({ format: format.combine(format.colorize(), format.simple()) }),
    ],
  });
}

function getLogger(category = 'system') {
  const normalizedCategory = categories.includes(category) ? category : 'system';

  if (!loggers.has(normalizedCategory)) {
    loggers.set(normalizedCategory, buildLogger(normalizedCategory));
  }

  return loggers.get(normalizedCategory);
}

module.exports = {
  LOG_DIRECTORY,
  getLogger,
};
