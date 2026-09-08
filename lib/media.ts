import { db } from "@/db";
import { mediaAssets, NewMediaAsset } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function listMediaAssets() {
  return await db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt));
}

export async function saveMediaAsset(asset: NewMediaAsset) {
  return await db.insert(mediaAssets).values(asset).returning();
}
