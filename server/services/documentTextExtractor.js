
const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const XLSX = require("xlsx");
const AdmZip = require("adm-zip");
const pdfParse = require("pdf-parse");

const TEXT_EXTENSIONS = new Set([
  ".txt", ".md", ".markdown", ".js", ".jsx", ".ts", ".tsx",
  ".py", ".java", ".c", ".h", ".cpp", ".hpp", ".cs",
  ".php", ".rb", ".go", ".rs", ".swift", ".kt",
  ".html", ".htm", ".css", ".scss", ".json", ".xml",
  ".yaml", ".yml", ".toml", ".ini", ".sql", ".sh",
  ".bat", ".ps1", ".env.example", ".log", ".csv",
  ".r", ".ipynb", ".vue", ".svelte", ".graphql",
  ".dockerfile", ".gitignore"
]);

function cleanText(text) {
  return String(text || "")
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function extractPptx(filePath) {
  const zip = new AdmZip(filePath);

  const slideFiles = zip.getEntries()
    .filter((entry) =>
      /^ppt\/slides\/slide\d+\.xml$/.test(entry.entryName)
    )
    .sort((a, b) => {
      const numberA = Number(
        a.entryName.match(/slide(\d+)\.xml$/)[1]
      );
      const numberB = Number(
        b.entryName.match(/slide(\d+)\.xml$/)[1]
      );
      return numberA - numberB;
    });

  if (!slideFiles.length) {
    throw new Error("No readable slides found in this PPTX file.");
  }

  return slideFiles.map((entry, index) => {
    const xml = entry.getData().toString("utf8");
    const text = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)]
      .map((match) =>
        match[1]
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
      )
      .join(" ");

    return `Slide ${index + 1}\n${text}`;
  }).join("\n\n");
}

async function extractDocumentText(filePath, originalName) {
  const extension = path.extname(originalName).toLowerCase();

  if (!fs.existsSync(filePath)) {
    throw new Error("The uploaded file could not be found.");
  }

  if (extension === ".pdf") {
    const buffer = fs.readFileSync(filePath);
    const result = await pdfParse(buffer);
    return cleanText(result.text);
  }

  if (extension === ".docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    return cleanText(result.value);
  }

  if (extension === ".pptx") {
    return cleanText(extractPptx(filePath));
  }

  if ([".xlsx", ".xls"].includes(extension)) {
    const workbook = XLSX.readFile(filePath);
    return cleanText(
      workbook.SheetNames.map((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        return `Sheet: ${sheetName}\n${XLSX.utils.sheet_to_csv(sheet)}`;
      }).join("\n\n")
    );
  }

  if (extension === ".rtf") {
    const raw = fs.readFileSync(filePath, "utf8");
    return cleanText(
      raw
        .replace(/\\par[d]?/g, "\n")
        .replace(/\\'[0-9a-f]{2}/gi, "")
        .replace(/\\[a-z]+-?\d* ?/gi, "")
        .replace(/[{}]/g, "")
    );
  }

  if (TEXT_EXTENSIONS.has(extension)) {
    return cleanText(fs.readFileSync(filePath, "utf8"));
  }

  throw new Error(
    `Unsupported file type: ${extension || "unknown"}. ` +
    "Upload a supported text, code, PDF, DOCX, PPTX, XLSX, XLS, or RTF file."
  );
}

module.exports = { extractDocumentText };
