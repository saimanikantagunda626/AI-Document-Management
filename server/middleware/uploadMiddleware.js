
const multer = require('multer')
const path = require('path')
const fs = require('fs')

const uploadDirectory = path.join(__dirname, '..', 'uploads')

// Create uploads folder automatically
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true })
}

const allowedExtensions = new Set([
  '.pdf', '.txt', '.md', '.markdown',
  '.docx', '.pptx', '.xlsx', '.xls', '.csv', '.rtf',
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java',
  '.c', '.h', '.cpp', '.hpp', '.cs', '.php',
  '.rb', '.go', '.rs', '.swift', '.kt',
  '.html', '.htm', '.css', '.scss', '.json',
  '.xml', '.sql', '.yml', '.yaml', '.sh',
  '.bat', '.ps1', '.log', '.r', '.ipynb',
  '.vue', '.svelte', '.graphql', '.toml', '.ini'
])

const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, uploadDirectory)
  },

  filename: function (req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase()
    const safeName = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 80)

    const uniqueName =
      Date.now() + '-' + Math.round(Math.random() * 1e9) +
      '-' + safeName + extension

    callback(null, uniqueName)
  }
})

function fileFilter(req, file, callback) {
  const extension = path.extname(file.originalname).toLowerCase()

  if (!allowedExtensions.has(extension)) {
    return callback(
      new Error('Unsupported file format. Please upload a supported document or code file.')
    )
  }

  callback(null, true)
}

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
})

module.exports = upload
