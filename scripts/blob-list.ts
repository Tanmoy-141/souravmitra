import { config } from "dotenv";
config({ path: ".env.local", override: true });
config({ path: ".env", override: true });
import { list } from "@vercel/blob";

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const storeId = process.env.BLOB_STORE_ID;
  if (!token) {
    console.error(
      "Error: BLOB_READ_WRITE_TOKEN is missing in .env.local or .env",
    );
    process.exit(1);
  }

  const response = await list({ token });
  if (storeId) {
    console.log(`Connected Store: ${storeId}`);
  }
  console.log(`Found ${response.blobs.length} blob(s) in store:`);
  if (response.blobs.length === 0) {
    console.log("  (The Vercel Blob store is currently empty)\n");
    return;
  }

  console.table(
    response.blobs.map((b) => ({
      pathname: b.pathname,
      size: `${(b.size / 1024).toFixed(1)} KB`,
      uploadedAt: new Date(b.uploadedAt).toLocaleString(),
      url: b.url,
    })),
  );
}

main().catch((err) => {
  console.error("Failed to list blobs:", err);
  process.exit(1);
});
