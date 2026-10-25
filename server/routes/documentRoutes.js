
const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');

const {
  uploadDocument,
  getDocuments,
  downloadDocument,
  deleteDocument
} = require('../controllers/documentController');

const {
  summarizeDocument,
  askDocumentQuestion
} = require('../controllers/aiController');

const {
  searchDocuments
} = require('../controllers/searchController');

const upload = require('../middleware/uploadMiddleware');

// Search uploaded documents.
router.get(
  '/search',
  authMiddleware,
  searchDocuments
);

// Upload a document.
router.post(
  '/upload',
  authMiddleware,
  upload.single('document'),
  uploadDocument
);

// Get documents belonging to the logged-in user.
router.get(
  '/',
  authMiddleware,
  getDocuments
);

// Download a document.
router.get(
  '/download/:id',
  authMiddleware,
  downloadDocument
);

// Delete a document.
router.delete(
  '/:id',
  authMiddleware,
  deleteDocument
);

// Generate an AI summary.
router.post(
  '/:id/summarize',
  authMiddleware,
  summarizeDocument
);

// Ask a question about a document.
router.post(
  '/:id/ask',
  authMiddleware,
  askDocumentQuestion
);

module.exports = router;
