
const fs = require("fs");
const path = require("path");
const Document = require("../models/document");

const allowedExtensions = new Set([
  ".pdf",
  ".txt",
  ".md",
  ".docx",
  ".pptx",
  ".xlsx",
  ".xls",
  ".csv",
  ".rtf",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".java",
  ".c",
  ".h",
  ".cpp",
  ".hpp",
  ".cs",
  ".php",
  ".rb",
  ".go",
  ".rs",
  ".swift",
  ".kt",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".json",
  ".xml",
  ".sql",
  ".yml",
  ".yaml",
  ".sh",
  ".bat",
  ".ps1",
  ".log",
  ".r",
  ".ipynb",
  ".vue",
  ".svelte",
  ".graphql",
  ".toml",
  ".ini"
]);

// Upload a document
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please select a file to upload."
      });
    }

    const extension = path.extname(req.file.originalname).toLowerCase();

    if (!allowedExtensions.has(extension)) {
      await fs.promises.unlink(req.file.path).catch(() => {});

      return res.status(400).json({
        message: `The file type ${extension || "(unknown)"} is not supported.`
      });
    }

    const document = await Document.create({
      userId: req.user.userId,
      originalName: path.basename(req.file.originalname),
      fileName: req.file.filename,
      filePath: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size
    });

    return res.status(201).json({
      message: "Document uploaded successfully.",
      document
    });
  } catch (error) {
    if (req.file?.path) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }

    console.error("Upload error:", error.message);

    return res.status(500).json({
      message: "Failed to upload document."
    });
  }
};

// Get documents belonging to the logged-in user
exports.getDocuments = async (req, res) => {
  try {
    const documents = await Document.find({
      userId: req.user.userId
    }).sort({ createdAt: -1 });

    return res.json({ documents });
  } catch (error) {
    console.error("Get documents error:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve documents."
    });
  }
};

// Download a document
exports.downloadDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!document) {
      return res.status(404).json({
        message: "Document not found."
      });
    }

    const absolutePath = path.resolve(document.filePath);

    await fs.promises.access(absolutePath, fs.constants.R_OK);

    return res.download(
      absolutePath,
      path.basename(document.originalName),
      (error) => {
        if (error && !res.headersSent) {
          res.status(500).json({
            message: "Failed to download document."
          });
        }
      }
    );
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({
        message: "The document file is missing from storage."
      });
    }

    console.error("Download error:", error.message);

    return res.status(500).json({
      message: "Failed to download document."
    });
  }
};

// Delete a document
exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!document) {
      return res.status(404).json({
        message: "Document not found."
      });
    }

    const absolutePath = path.resolve(document.filePath);

    await Document.deleteOne({ _id: document._id });

    try {
      await fs.promises.unlink(absolutePath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error("File cleanup error:", error.message);
      }
    }

    return res.json({
      message: "Document deleted successfully."
    });
  } catch (error) {
    console.error("Delete error:", error.message);

    return res.status(500).json({
      message: "Failed to delete document."
    });
  }
};
