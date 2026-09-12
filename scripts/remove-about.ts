import { db } from "@/db";
import { pages } from "@/db/schema";
import { eq } from "drizzle-orm";

async function checkAndRemoveAbout() {
  const result = await db.select().from(pages).where(eq(pages.slug, "about"));
  if (result.length > 0) {
    console.log("Found about page in CMS, removing it...");
    await db.delete(pages).where(eq(pages.slug, "about"));
    console.log("Removed about page from CMS.");
  } else {
    console.log("No about page found in CMS.");
  }
}

checkAndRemoveAbout().catch(console.error);
