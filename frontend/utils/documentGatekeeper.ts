import * as pdfjsLib from "pdfjs-dist";
import { createWorker } from "tesseract.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const PDF_SIGNATURE = "%PDF-";
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];

const FINANCIAL_TERMS = [
  "revenue",
  "ebitda",
  "net profit",
  "retained earnings",
  "operating expenses",
  "liabilities",
  "balance sheet",
];

const PITCH_ANCHORS = [
  "problem",
  "solution",
  "market",
  "tam",
  "sam",
  "traction",
  "team",
  "roadmap",
  "ask",
];

export type DocumentKind =
  | "pitch_deck_cid"
  | "financials_cid"
  | "business_plan_cid"
  | "use_of_funds_cid"
  | "product_demo_cid";

type DocumentValidationResult = {
  valid: boolean;
  error?: string;
};

type PdfDocument = Awaited<ReturnType<typeof pdfjsLib.getDocument>["promise"]>;

// --------------------------------------------------
// FILE SIGNATURE HELPERS
// --------------------------------------------------

function bytesStartWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function decodeBytes(bytes: Uint8Array) {
  return new TextDecoder("latin1").decode(bytes).toLowerCase();
}

// --------------------------------------------------
// PDF TEXT EXTRACTION + OCR
// --------------------------------------------------

async function extractTextFromPdf(pdf: PdfDocument): Promise<string> {
  const pages: string[] = [];
  const pagesRequiringOcr: number[] = [];

  // First attempt normal PDF text extraction.
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const pageText = content.items
      .map((item) =>
        "str" in item && typeof item.str === "string" ? item.str : "",
      )
      .join(" ");

    pages.push(pageText);

    // Identify pages that have little or no extractable text.
    if (pageText.replace(/\s/g, "").length < 20) {
      pagesRequiringOcr.push(pageNum);
    }
  }

  // If every page already has sufficient text, return it.
  if (pagesRequiringOcr.length === 0) {
    return pages.join("\n").toLowerCase();
  }

  console.log("OCR required for pages:", pagesRequiringOcr);

  const worker = await createWorker("eng");

  try {
    for (const pageNum of pagesRequiringOcr) {
      console.log(`Running OCR on page ${pageNum}`);

      const page = await pdf.getPage(pageNum);

      // Higher scale improves OCR accuracy.
      const viewport = page.getViewport({ scale: 2 });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Unable to create canvas context.");
      }

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      await page.render({
        canvas,
        canvasContext: context,
        viewport,
      }).promise;

      const result = await worker.recognize(canvas);

      const ocrText = result.data.text.trim();

      console.log(
        `OCR completed for page ${pageNum}. Characters:`,
        ocrText.length,
      );

      // Replace the empty page text with OCR output.
      pages[pageNum - 1] = ocrText;

      // Release canvas memory.
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    await worker.terminate();
  }

  return pages.join("\n").toLowerCase();
}

// Keep the existing exported function signature.
export async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
  }).promise;

  return extractTextFromPdf(pdf);
}

// --------------------------------------------------
// ZIP / XLSX EXTRACTION
// --------------------------------------------------

async function extractZipText(bytes: Uint8Array) {
  const chunks: string[] = [];
  let offset = 0;

  while (offset + 30 <= bytes.length) {
    if (
      bytes[offset] !== 0x50 ||
      bytes[offset + 1] !== 0x4b ||
      bytes[offset + 2] !== 0x03 ||
      bytes[offset + 3] !== 0x04
    ) {
      break;
    }

    const method = bytes[offset + 8] | (bytes[offset + 9] << 8);

    const compressedSize =
      bytes[offset + 18] |
      (bytes[offset + 19] << 8) |
      (bytes[offset + 20] << 16) |
      (bytes[offset + 21] << 24);

    const fileNameLength = bytes[offset + 26] | (bytes[offset + 27] << 8);

    const extraLength = bytes[offset + 28] | (bytes[offset + 29] << 8);

    const dataStart = offset + 30 + fileNameLength + extraLength;

    const dataEnd = dataStart + compressedSize;

    if (dataEnd > bytes.length) break;

    const compressed = bytes.slice(dataStart, dataEnd);

    if (method === 0) {
      chunks.push(decodeBytes(compressed));
    } else if (method === 8 && typeof DecompressionStream !== "undefined") {
      const stream = new Blob([compressed])
        .stream()
        .pipeThrough(new DecompressionStream("deflate-raw"));

      const decompressed = new Uint8Array(
        await new Response(stream).arrayBuffer(),
      );

      chunks.push(decodeBytes(decompressed));
    }

    offset = dataEnd;
  }

  return chunks.join("\n");
}

// --------------------------------------------------
// DOCUMENT KIND VALIDATION
// --------------------------------------------------

export function isDocumentKind(value: unknown): value is DocumentKind {
  return [
    "pitch_deck_cid",
    "financials_cid",
    "business_plan_cid",
    "use_of_funds_cid",
    "product_demo_cid",
  ].includes(value as DocumentKind);
}

// --------------------------------------------------
// BASIC FILE SIGNATURE VALIDATION
// --------------------------------------------------

export async function validateFileSignature(
  file: File,
): Promise<DocumentValidationResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());

  const isPdf = bytesStartWith(
    bytes,
    Array.from(PDF_SIGNATURE).map((char) => char.charCodeAt(0)),
  );

  const isZip = bytesStartWith(bytes, ZIP_SIGNATURE);

  const isJpeg = bytesStartWith(bytes, [0xff, 0xd8, 0xff]);

  const isPng = bytesStartWith(
    bytes,
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  );

  if (!isPdf && !isZip && !isJpeg && !isPng) {
    return {
      valid: false,
      error:
        "The uploaded file type could not be verified from its file signature.",
    };
  }

  return { valid: true };
}

// --------------------------------------------------
// FINANCIAL CONTENT VALIDATION
// --------------------------------------------------

function hasNumericTable(text: string) {
  const numericRows = text.match(
    /(?:[$€£]\s*)?\d[\d,]*(?:\.\d+)?(?:\s+[%$€£]?\s*\d[\d,]*(?:\.\d+)?){2,}/g,
  );

  const percentages = text.match(/\b\d+(?:\.\d+)?\s*%/g) ?? [];

  const currencyValues = text.match(/[$€£]\s*\d[\d,]*(?:\.\d+)?/g) ?? [];

  return (
    (numericRows?.length ?? 0) > 0 ||
    percentages.length >= 2 ||
    currencyValues.length >= 2
  );
}

function validateFinancialContent(text: string): DocumentValidationResult {
  const normalized = text.toLowerCase();

  const accountingTermCount = FINANCIAL_TERMS.filter((term) =>
    normalized.includes(term),
  ).length;

  if (accountingTermCount === 0) {
    return {
      valid: false,
      error:
        "Financial statements must contain accounting terms such as revenue or liabilities.",
    };
  }

  if (!hasNumericTable(normalized)) {
    return {
      valid: false,
      error:
        "Financial statements must contain a numeric table with amounts, percentages, or currency values.",
    };
  }

  return { valid: true };
}

// --------------------------------------------------
// PITCH DECK CONTENT VALIDATION
// --------------------------------------------------

function validatePitchContent(cleanText: string): DocumentValidationResult {
  const normalized = cleanText.toLowerCase();

  const anchorCount = PITCH_ANCHORS.filter((anchor) =>
    normalized.includes(anchor),
  ).length;

  console.log("Pitch deck anchor count:", anchorCount);

  if (anchorCount < 3) {
    return {
      valid: false,
      error:
        "Pitch decks must include at least three sections such as problem, solution, market, traction, team, roadmap, or ask.",
    };
  }

  return { valid: true };
}

// --------------------------------------------------
// IMAGE DIMENSION VALIDATION
// --------------------------------------------------

function getJpegDimensions(bytes: Uint8Array) {
  let offset = 2;

  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];

    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];

    if (marker >= 0xc0 && marker <= 0xc3 && offset + 8 < bytes.length) {
      return {
        height: (bytes[offset + 5] << 8) | bytes[offset + 6],

        width: (bytes[offset + 7] << 8) | bytes[offset + 8],
      };
    }

    if (length < 2) break;

    offset += 2 + length;
  }

  return null;
}

function getPngDimensions(bytes: Uint8Array) {
  if (bytes.length < 24) return null;

  return {
    width:
      bytes[16] * 0x1000000 +
      bytes[17] * 0x10000 +
      bytes[18] * 0x100 +
      bytes[19],

    height:
      bytes[20] * 0x1000000 +
      bytes[21] * 0x10000 +
      bytes[22] * 0x100 +
      bytes[23],
  };
}

function validateImageDimensions(bytes: Uint8Array): DocumentValidationResult {
  const dimensions = bytesStartWith(bytes, [0xff, 0xd8, 0xff])
    ? getJpegDimensions(bytes)
    : bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47])
      ? getPngDimensions(bytes)
      : null;

  if (!dimensions || dimensions.width < 800 || dimensions.height < 600) {
    return {
      valid: false,
      error: "Document images must be at least 800x600 pixels.",
    };
  }

  return { valid: true };
}

// --------------------------------------------------
// MIME TYPE VALIDATION
// --------------------------------------------------

function validateMimeType(
  file: File,
  kind: DocumentKind,
  isPdf: boolean,
  isZip: boolean,
  isImage: boolean,
): DocumentValidationResult {
  if (!file.type) return { valid: true };

  if (isPdf && file.type !== "application/pdf") {
    return {
      valid: false,
      error: "The file MIME type does not match its PDF signature.",
    };
  }

  if (
    isZip &&
    ![
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/zip",
    ].includes(file.type)
  ) {
    return {
      valid: false,
      error: "The file MIME type does not match its XLSX signature.",
    };
  }

  if (isImage && !file.type.startsWith("image/")) {
    return {
      valid: false,
      error: "The file MIME type does not match its image signature.",
    };
  }

  if (kind === "financials_cid" && isImage) {
    return {
      valid: false,
      error:
        "Financial statements must be PDF or XLSX documents, not image thumbnails.",
    };
  }

  return { valid: true };
}

// --------------------------------------------------
// MAIN DOCUMENT VALIDATION
// --------------------------------------------------

export async function validateDocumentBeforeUpload(
  file: File,
  kind: DocumentKind,
): Promise<DocumentValidationResult> {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());

    const isPdf = bytesStartWith(
      bytes,
      Array.from(PDF_SIGNATURE).map((char) => char.charCodeAt(0)),
    );

    const isZip = bytesStartWith(bytes, ZIP_SIGNATURE);

    const isJpeg = bytesStartWith(bytes, [0xff, 0xd8, 0xff]);

    const isPng = bytesStartWith(
      bytes,
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    );

    const isImage = isJpeg || isPng;

    // 1. Validate MIME type and signature compatibility.
    const mimeValidation = validateMimeType(file, kind, isPdf, isZip, isImage);

    if (!mimeValidation.valid) {
      return mimeValidation;
    }

    // 2. Product demo image validation.
    if (kind === "product_demo_cid" && isImage) {
      return validateImageDimensions(bytes);
    }

    // 3. Financial statements cannot be image thumbnails.
    if (kind === "financials_cid" && isImage) {
      return {
        valid: false,
        error:
          "Financial statements must be PDF or XLSX documents, not image thumbnails.",
      };
    }

    // 4. Financial XLSX validation.
    if (kind === "financials_cid" && isZip) {
      const text = await extractZipText(bytes);

      return validateFinancialContent(text);
    }

    // 5. Remaining document types must be PDFs.
    if (!isPdf) {
      return {
        valid: false,
        error: "This document is not a valid PDF based on its file signature.",
      };
    }

    // 6. Load the PDF once using PDF.js.
    const pdf = await pdfjsLib.getDocument({
      data: bytes,
    }).promise;

    // 7. Validate actual PDF page count.
    if (kind === "pitch_deck_cid" && (pdf.numPages < 5 || pdf.numPages > 25)) {
      return {
        valid: false,
        error: "Pitch decks must contain between 5 and 25 pages.",
      };
    }

    // 8. Extract text for content-based validation.
    if (kind === "pitch_deck_cid" || kind === "financials_cid") {
      const cleanText = await extractTextFromPdf(pdf);

      console.log("Extracted document text:", cleanText);

      if (!cleanText.trim()) {
        return {
          valid: false,
          error: "Unable to extract readable text from this PDF.",
        };
      }

      if (kind === "pitch_deck_cid") {
        return validatePitchContent(cleanText);
      }

      return validateFinancialContent(cleanText);
    }

    // 9. Preserve existing behavior for other PDF document kinds.
    return { valid: true };
  } catch (error) {
    console.error("Document validation failed:", error);

    return {
      valid: false,
      error:
        "Unable to read this document. It may be corrupted, password-protected, or contain unsupported content.",
    };
  }
}
