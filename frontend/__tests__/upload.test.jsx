// frontend/__tests__/DocUpload.test.js
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DocUpload } from "../app/create-campaign/page";
import { vi } from "vitest";

// Mock the fetch API
global.fetch = vi.fn();

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
    />
  );

  // 2. Simulate file selection
  const file = new File(["hello"], "hello.pdf", { type: "application/pdf" });
  const input = screen.getByLabelText(/Click to upload/i);
  
  fireEvent.change(input, { target: { files: [file] } });

  // 3. Assertions
  expect(screen.getByText(/Uploading to IPFS/i)).toBeDefined();
  
  await waitFor(() => {
    expect(screen.getByText("QmTest123456789")).toBeDefined();
    expect(onUploaded).toHaveBeenCalledWith("pitch_deck_cid", "QmTest123456789");
  });
});