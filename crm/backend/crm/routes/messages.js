const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messagesController');

router.get('/chats', messagesController.getChats);
router.get('/chats/:chatId/messages', messagesController.getMessagesByChatId);
router.get('/messages/by-phone/:phone', messagesController.getMessagesByPhone);
router.get('/messages/:conversationId', messagesController.getMessagesByConversationId);
router.post('/messages', messagesController.createMessage);
router.post('/send-message', messagesController.sendMessage);
router.post('/send-media', messagesController.sendMedia);
router.post('/receive-message', messagesController.receiveMessage);

module.exports = router;
