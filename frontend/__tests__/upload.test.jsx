import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DocUpload } from "../app/create-campaign/page";
import { vi } from "vitest";

// Mock the fetch API
global.fetch = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
});

function validPitchDeckFile() {
  const pages = Array.from({ length: 5 }, () => "/Type /Page").join("\n");
  const anchors = "problem solution market traction team roadmap ask";
  return new File([`%PDF-1.7\n${pages}\n${anchors}\n%%EOF`], "pitch-deck.pdf", {
    type: "application/pdf",
  });
}

test("uploads file to IPFS and shows CID", async () => {
  // 1. Mock a successful IPFS upload response
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ cid: "QmTest123456789" }),
  });

  const onUploaded = vi.fn();
  render(
    <DocUpload
      docKey="pitch_deck_cid"
      label="Pitch Deck"
      accept=".pdf"
      onUploaded={onUploaded}
    />,
  );

  // 2. Simulate file selection
  const file = validPitchDeckFile();
  const input = screen.getByTestId("file-input");

  fireEvent.change(input, { target: { files: [file] } });

  // 3. Assertions
  expect(screen.getByText(/Uploading to IPFS/i)).toBeDefined();

  await waitFor(() => {
    expect(screen.getByText("QmTest123456789")).toBeDefined();
    expect(onUploaded).toHaveBeenCalledWith(
      "pitch_deck_cid",
      "QmTest123456789",
    );
  });
});

test("rejects a file with an invalid signature before IPFS upload", async () => {
  const onUploaded = vi.fn();
  render(
    <DocUpload
      docKey="pitch_deck_cid"
      label="Pitch Deck"
      accept=".pdf"
      onUploaded={onUploaded}
    />,
  );

  const file = new File(["not a PDF"], "renamed.exe", {
    type: "application/pdf",
  });
  fireEvent.change(screen.getByTestId("file-input"), {
    target: { files: [file] },
  });

  await waitFor(() => {
    expect(
      screen.getByText(/not a valid PDF based on its file signature/i),
    ).toBeDefined();
  });
  expect(fetch).not.toHaveBeenCalled();
  expect(onUploaded).not.toHaveBeenCalled();
});
