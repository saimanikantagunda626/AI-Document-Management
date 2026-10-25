const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    sources: [
      {
        documentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Document'
        },
        documentName: String
      }
    ]
  },
  { timestamps: true }
);

const chatConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      default: 'New conversation'
    },
    messages: [messageSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  'ChatConversation',
  chatConversationSchema
);