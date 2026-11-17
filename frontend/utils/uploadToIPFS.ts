export async function uploadToIPFS(
    file: File,
    name: string
): Promise<{ cid: string; url: string }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("docKey", "document");

    const res = await fetch("/api/ipfs-upload", {
        method: "POST",
        body: formData,
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "IPFS upload failed");
    return { cid: json.cid, url: json.url };
}
