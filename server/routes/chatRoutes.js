const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');

const {
  listConversations,
  getConversation,
  sendMessage,
  deleteConversation
} = require('../controllers/chatController');

router.use(authMiddleware);

// List saved conversations
router.get('/', listConversations);

// Create a conversation or send a message to an existing one
router.post('/', sendMessage);

// Load a conversation and its messages
router.get('/:id', getConversation);

// Delete a conversation
router.delete('/:id', deleteConversation);

module.exports = router;