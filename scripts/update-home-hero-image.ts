import "dotenv/config";
import { db } from "../db";
import { pages } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const homePage = await db.query.pages.findFirst({
    where: eq(pages.slug, "/"),
  });

  if (!homePage) {
    console.error("Home page not found!");
    process.exit(1);
  }

  console.log("Current home page found. ID:", homePage.id);

  // New hero section with an explicit, editable <img> tag
  const newHeroHtml = `<section style="position: relative; width: 100%; min-height: 85vh; overflow: hidden; display: flex; align-items: center; justify-content: center; text-align: center; padding: 4rem 1.5rem;">
    <img 
      src="https://static.wixstatic.com/media/022e51_23340f9494d34281bbfc0707b043d411~mv2.jpg/v1/fill/w_1920,h_1080,al_c,q_90,enc_avif,quality_auto/022e51_23340f9494d34281bbfc0707b043d411~mv2.jpg" 
      alt="Sourav Mitra - Hero Artwork" 
      style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0;" 
    />
    <div style="position: absolute; inset: 0; background: rgba(0, 0, 0, 0.45); pointer-events: none; z-index: 1;"></div>
    <div style="position: relative; z-index: 2; max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; align-items: center;">
      <h1 style="font-size: 4rem; font-family: serif; color: #FFFFFF; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.05em; text-shadow: 0 4px 20px rgba(0,0,0,0.8); line-height: 1.1;">
        Sourav Mitra
      </h1>
      <p style="font-size: 1.4rem; color: #E5E5E5; margin-bottom: 2.5rem; text-shadow: 0 2px 10px rgba(0,0,0,0.8); font-weight: 300;">
        550+ covers in 8+ years, and still learning.
      </p>
      <a
        href="/book-covers"
        style="display: inline-block; padding: 1rem 2.5rem; background-color: #C5A059; color: #000000; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; font-size: 0.75rem; text-decoration: none; border-radius: 2px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);"
      >
        Explore My Work
      </a>
    </div>
  </section>`;

  // Replace old hero section in htmlCache
  let updatedHtml = homePage.htmlCache || "";
  const firstSectionEnd = updatedHtml.indexOf("</section>");
  if (firstSectionEnd !== -1) {
    const firstSectionStart = updatedHtml.indexOf("<section");
    if (firstSectionStart !== -1) {
      updatedHtml =
        updatedHtml.slice(0, firstSectionStart) +
        newHeroHtml +
        updatedHtml.slice(firstSectionEnd + "</section>".length);
    }
  } else {
    // If no section found, wrap in outer div
    updatedHtml = `<div class="flex flex-col gap-16 py-12 bg-black text-white">${newHeroHtml}</div>`;
  }

  const cleanCss = `* { box-sizing: border-box; } body {margin: 0;}`;

  await db
    .update(pages)
    .set({
      htmlCache: updatedHtml,
      cssCache: cleanCss,
      gjsData: null, // Clear gjsData so GrapesJS parses fresh from htmlCache
      updatedAt: new Date(),
    })
    .where(eq(pages.id, homePage.id));

  console.log(
    "Successfully updated home page in database with editable <img> hero!",
  );
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
