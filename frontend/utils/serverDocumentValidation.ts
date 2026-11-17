export type ServerDocumentKind =
  // Campaign documents
  | "pitch_deck_cid"
  | "financials_cid"
  | "business_plan_cid"
  | "use_of_funds_cid"
  | "product_demo_cid"
  // KYC verification documents
  | "national_id_cid"
  | "passport_cid"
  | "selfie_cid"
  | "proof_of_address_cid"
  // KYB business verification documents
  | "business_reg_cid"
  | "tax_cert_cid"
  | "bank_statement_cid"
  // General fallback
  | "document";

const VALID_DOCUMENT_KINDS: string[] = [
  "pitch_deck_cid",
  "financials_cid",
  "business_plan_cid",
  "use_of_funds_cid",
  "product_demo_cid",
  "national_id_cid",
  "passport_cid",
  "selfie_cid",
  "proof_of_address_cid",
  "business_reg_cid",
  "tax_cert_cid",
  "bank_statement_cid",
  "document",
];

export function isServerDocumentKind(
  value: unknown,
): value is ServerDocumentKind {
  return typeof value === "string" && VALID_DOCUMENT_KINDS.includes(value);
}

export async function validateServerFileSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());

  const startsWith = (signature: number[]) =>
    signature.every((byte, index) => bytes[index] === byte);

  const isPdf = startsWith([0x25, 0x50, 0x44, 0x46, 0x2d]);

  const isZip = startsWith([0x50, 0x4b, 0x03, 0x04]);

  const isJpeg = startsWith([0xff, 0xd8, 0xff]);

  const isPng = startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  if (!isPdf && !isZip && !isJpeg && !isPng) {
    return {
      valid: false,
      error: "Invalid file signature.",
    };
  }

  if (isPdf && file.type !== "application/pdf") {
    return {
      valid: false,
      error: "PDF MIME type mismatch.",
    };
  }

  if (
    isZip &&
    ![
      "application/zip",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ].includes(file.type)
  ) {
    return {
      valid: false,
      error: "XLSX MIME type mismatch.",
    };
  }

  if (isJpeg && file.type !== "image/jpeg") {
    return {
      valid: false,
      error: "JPEG MIME type mismatch.",
    };
  }

  if (isPng && file.type !== "image/png") {
    return {
      valid: false,
      error: "PNG MIME type mismatch.",
    };
  }

  return { valid: true };
}
