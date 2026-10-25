
const path = require('path');
const Document = require('../models/document');
const {
  extractDocumentText
} = require('../services/documentTextExtractor');

function makeSnippet(text, index, length = 240) {
  const start = Math.max(0, index - 90);
  const end = Math.min(text.length, index + length - 90);

  const snippet = text
    .slice(start, end)
    .replace(/\s+/g, ' ')
    .trim();

  return `${start > 0 ? '…' : ''}${snippet}${end < text.length ? '…' : ''}`;
}

exports.searchDocuments = async (req, res) => {
  const query = String(req.query.q || '').trim();

  if (query.length < 2) {
    return res.status(400).json({
      message: 'Enter at least 2 characters to search.'
    });
  }

  if (query.length > 120) {
    return res.status(400).json({
      message: 'Search query must be 120 characters or fewer.'
    });
  }

  try {
    // Search only documents owned by the authenticated user.
    const documents = await Document.find({
      userId: req.user.userId
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const terms = [
      ...new Set(
        query.toLowerCase().split(/\s+/).filter(Boolean)
      )
    ];

    const results = [];
    let unreadableCount = 0;

    for (const document of documents) {
      try {
        const text = await extractDocumentText(
          document.filePath,
          document.originalName
        );

        if (!text) continue;

        const lowerText = text.toLowerCase();
        const lowerName = document.originalName.toLowerCase();

        const hits = terms.filter(
          (term) =>
            lowerText.includes(term) ||
            lowerName.includes(term)
        );

        if (!hits.length) continue;

        const filenameHit = terms.some(
          (term) => lowerName.includes(term)
        );

        let position = -1;

        for (const term of terms) {
          position = lowerText.indexOf(term);
          if (position >= 0) break;
        }

        results.push({
          _id: String(document._id),
          name: document.originalName,
          size: document.size,
          createdAt: document.createdAt,
          matchedTerms: hits,
          matchType:
            filenameHit && position < 0
              ? 'filename'
              : 'content',
          snippet:
            position >= 0
              ? makeSnippet(text, position)
              : 'The search term matches this document’s filename.',
          score: hits.length + (filenameHit ? 2 : 0)
        });
      } catch (error) {
        unreadableCount += 1;

        console.warn(
          `Search skipped ${path.basename(document.originalName)}: ${error.message}`
        );
      }
    }

    results.sort(
      (a, b) =>
        b.score - a.score ||
        new Date(b.createdAt || 0) -
          new Date(a.createdAt || 0)
    );

    return res.json({
      query,
      total: results.length,
      searchedDocuments: documents.length,
      results: results.slice(0, 30),
      ...(unreadableCount
        ? {
            notice: `${unreadableCount} document(s) could not be searched because their files were unavailable or unreadable.`
          }
        : {})
    });
  } catch (error) {
    console.error('Document search error:', error.message);

    return res.status(500).json({
      message: 'Document search failed. Please try again.'
    });
  }
};
