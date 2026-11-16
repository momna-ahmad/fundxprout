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

function bytesStartWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function decodeBytes(bytes: Uint8Array) {
  return new TextDecoder("latin1").decode(bytes).toLowerCase();
}

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
      const stream = new Blob([compressed]).stream().pipeThrough(
        new DecompressionStream("deflate-raw"),
      );
      chunks.push(decodeBytes(new Uint8Array(await new Response(stream).arrayBuffer())));
    }

    offset = dataEnd;
  }

  return chunks.join("\n");
}

export function isDocumentKind(value: unknown): value is DocumentKind {
  return [
    "pitch_deck_cid",
    "financials_cid",
    "business_plan_cid",
    "use_of_funds_cid",
    "product_demo_cid",
  ].includes(value as DocumentKind);
}

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
  const isPng = bytesStartWith(bytes, [
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  if (!isPdf && !isZip && !isJpeg && !isPng) {
    return {
      valid: false,
      error: "The uploaded file type could not be verified from its file signature.",
    };
  }

  return { valid: true };
}

function getPdfPageCount(text: string) {
  const pageObjects = text.match(/\/type\s*\/page\b/g)?.length ?? 0;
  return pageObjects;
}

function hasNumericTable(text: string) {
  const numericRows = text.match(
    /(?:[$€£]\s*)?\d[\d,]*(?:\.\d+)?(?:\s+[%$€£]?\s*\d[\d,]*(?:\.\d+)?){2,}/g,
  );
  const percentages = text.match(/\b\d+(?:\.\d+)?\s*%/g) ?? [];
  const currencyValues = text.match(/[$€£]\s*\d[\d,]*(?:\.\d+)?/g) ?? [];
  return (numericRows?.length ?? 0) > 0 || percentages.length >= 2 || currencyValues.length >= 2;
}

function validateFinancialContent(text: string): DocumentValidationResult {
  const accountingTermCount = FINANCIAL_TERMS.filter((term) =>
    text.includes(term),
  ).length;

  if (accountingTermCount === 0) {
    return {
      valid: false,
      error: "Financial statements must contain accounting terms such as revenue or liabilities.",
    };
  }

  if (!hasNumericTable(text)) {
    return {
      valid: false,
      error: "Financial statements must contain a numeric table with amounts, percentages, or currency values.",
    };
  }

  return { valid: true };
}

function validatePitchContent(text: string): DocumentValidationResult {
  const anchorCount = PITCH_ANCHORS.filter((anchor) => text.includes(anchor)).length;
  if (anchorCount < 3) {
    return {
      valid: false,
      error: "Pitch decks must include at least three sections such as problem, solution, market, traction, team, roadmap, or ask.",
    };
  }

  return { valid: true };
}

function getJpegDimensions(bytes: Uint8Array) {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (
      marker >= 0xc0 &&
      marker <= 0xc3 &&
      offset + 8 < bytes.length
    ) {
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

function validateMimeType(file: File, kind: DocumentKind, isPdf: boolean, isZip: boolean, isImage: boolean) {
  if (!file.type) return { valid: true };

  if (isPdf && file.type !== "application/pdf") {
    return { valid: false, error: "The file MIME type does not match its PDF signature." };
  }

  if (isZip && ![
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
  ].includes(file.type)) {
    return { valid: false, error: "The file MIME type does not match its XLSX signature." };
  }

  if (isImage && !file.type.startsWith("image/")) {
    return { valid: false, error: "The file MIME type does not match its image signature." };
  }

  if (kind === "financials_cid" && isImage) {
    return { valid: false, error: "Financial statements must be PDF or XLSX documents, not image thumbnails." };
  }

  return { valid: true };
}

export async function validateDocumentBeforeUpload(
  file: File,
  kind: DocumentKind,
): Promise<DocumentValidationResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPdf = bytesStartWith(bytes, Array.from(PDF_SIGNATURE).map((char) => char.charCodeAt(0)));
  const isZip = bytesStartWith(bytes, ZIP_SIGNATURE);
  const isJpeg = bytesStartWith(bytes, [0xff, 0xd8, 0xff]);
  const isPng = bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const mimeValidation = validateMimeType(
    file,
    kind,
    isPdf,
    isZip,
    isJpeg || isPng,
  );
  if (!mimeValidation.valid) return mimeValidation;

  if (kind === "product_demo_cid" && (isJpeg || isPng)) {
    return validateImageDimensions(bytes);
  }

  if (kind === "financials_cid" && (isJpeg || isPng)) {
    return {
      valid: false,
      error: "Financial statements must be PDF or XLSX documents, not image thumbnails.",
    };
  }

  if (kind === "financials_cid" && isZip) {
    const text = await extractZipText(bytes);
    return validateFinancialContent(text);
  }

  if (!isPdf) {
    return {
      valid: false,
      error: "This document is not a valid PDF based on its file signature.",
    };
  }

  const text = decodeBytes(bytes);
  if (text.includes("/encrypt")) {
    return {
      valid: false,
      error: "Encrypted or password-protected PDFs are not accepted.",
    };
  }

  const pageCount = getPdfPageCount(text);
  if (kind === "pitch_deck_cid" && (pageCount < 5 || pageCount > 25)) {
    return {
      valid: false,
      error: "Pitch decks must contain between 5 and 25 pages.",
    };
  }

  if (kind === "pitch_deck_cid") {
    return validatePitchContent(text);
  }

  if (kind === "financials_cid") {
    return validateFinancialContent(text);
  }

  return { valid: true };
}
