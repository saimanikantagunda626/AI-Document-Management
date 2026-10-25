
const mongoose = require("mongoose");
const path = require("path");
const Document = require("../models/document");
const {
  extractDocumentText
} = require("../services/documentTextExtractor");
const {
  summarizeText,
  answerQuestion
} = require("../services/aiService");

async function getDocumentText(req, res) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      message: "Invalid document ID."
    });
    return null;
  }

  const document = await Document.findOne({
    _id: id,
    userId: req.user.userId
  });

  if (!document) {
    res.status(404).json({
      message: "Document not found."
    });
    return null;
  }

  const filePath = path.isAbsolute(document.filePath)
    ? document.filePath
    : path.resolve(process.cwd(), document.filePath);

  const text = await extractDocumentText(
    filePath,
    document.originalName
  );

  if (!text || !text.trim()) {
    res.status(422).json({
      message:
        "No readable text was found. Try a TXT or text-based PDF file."
    });
    return null;
  }

  console.log(
    "Extracted document text length:",
    text.length
  );

  return {
    document,
    text
  };
}

async function summarizeDocument(req, res) {
  try {
    const result = await getDocumentText(req, res);
    if (!result) return;

    const summary = await summarizeText(result.text);

    res.json({
      message: "Document summarized successfully.",
      documentName: result.document.originalName,
      summary
    });
  } catch (error) {
    console.error("Summarize error:", error);

    res.status(500).json({
      message:
        error.message ||
        "Could not summarize this document."
    });
  }
}

async function askDocumentQuestion(req, res) {
  try {
    const question = String(req.body?.question || "").trim();

    if (!question) {
      return res.status(400).json({
        message: "Please enter a question."
      });
    }

    if (question.length > 1000) {
      return res.status(400).json({
        message: "Question must be 1000 characters or fewer."
      });
    }

    const result = await getDocumentText(req, res);
    if (!result) return;

    const answer = await answerQuestion(
      result.text,
      question
    );

    res.json({
      documentName: result.document.originalName,
      question,
      answer
    });
  } catch (error) {
    console.error("Question error:", error);

    res.status(500).json({
      message:
        error.message ||
        "Could not answer the question."
    });
  }
}

module.exports = {
  summarizeDocument,
  askDocumentQuestion
};
