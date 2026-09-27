import { db } from "@/db";
import { mediaAssets, NewMediaAsset } from "@/db/schema";
import { desc, eq, or } from "drizzle-orm";

export async function listMediaAssets() {
  return await db
    .select()
    .from(mediaAssets)
    .orderBy(desc(mediaAssets.createdAt));
}

export async function saveMediaAsset(asset: NewMediaAsset) {
  return await db.insert(mediaAssets).values(asset).returning();
}

export async function deleteMediaAsset(srcOrId: string) {
  return await db
    .delete(mediaAssets)
    .where(or(eq(mediaAssets.blobUrl, srcOrId), eq(mediaAssets.id, srcOrId)))
    .returning();
}
