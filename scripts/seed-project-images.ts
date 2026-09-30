import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

async function run() {
  const { db } = await import("../db");
  const { projects } = await import("../db/schema");
  const { eq, and } = await import("drizzle-orm");

  const GENRE_IMAGES: Record<string, string[]> = {
    // Book Genres
    "Literary Fiction": [
      "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=800&auto=format&fit=crop",
    ],
    Thriller: [
      "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop",
    ],
    Horror: [
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1516331138075-f3adc1e149cd?q=80&w=800&auto=format&fit=crop",
    ],
    Fantasy: [
      "https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop",
    ],
    Historical: [
      "https://images.unsplash.com/photo-1461360370896-922624d12aa1?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1568667256549-094345857637?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=800&auto=format&fit=crop",
    ],
    Romance: [
      "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=800&auto=format&fit=crop",
    ],
    Poetry: [
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?q=80&w=800&auto=format&fit=crop",
    ],
    "Children's": [
      "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1569683795645-b62e50fbf103?q=80&w=800&auto=format&fit=crop",
    ],
    "Non-fiction": [
      "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=800&auto=format&fit=crop",
    ],

    // Illustration Genres
    Editorial: [
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=800&auto=format&fit=crop",
    ],
    Publishing: [
      "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=800&auto=format&fit=crop",
    ],
    Conceptual: [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=800&auto=format&fit=crop",
    ],
    "Character Design": [
      "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=800&auto=format&fit=crop",
    ],
    Personal: [
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1579783923665-35632ff40149?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?q=80&w=800&auto=format&fit=crop",
    ],

    // Fine Art
    "fine-art": [
      "https://images.unsplash.com/photo-1579783901586-d88db74b4fe4?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1582561424760-0321d75e81fa?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1579541814924-49fef17c5be5?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1580136579312-94651dfd596d?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1579783923665-35632ff40149?q=80&w=800&auto=format&fit=crop",
    ],
  };

  const allProjects = await db.select().from(projects);
  console.log(`Found ${allProjects.length} projects in database.`);

  let updatedCount = 0;
  let featuredCount = 0;

  for (const [index, p] of allProjects.entries()) {
    let chosenImage = p.coverImage;

    // Only assign if currently blank
    if (!chosenImage || chosenImage.trim() === "") {
      let pool: string[] = [];

      if (p.category === "fine-art") {
        pool = GENRE_IMAGES["fine-art"];
      } else {
        // Find matching genre in title or tags
        for (const [genre, imgs] of Object.entries(GENRE_IMAGES)) {
          if (p.title.includes(genre) || (p.tags && p.tags.includes(genre))) {
            pool = imgs;
            break;
          }
        }
      }

      if (!pool || pool.length === 0) {
        pool = p.category === "book-covers" ? GENRE_IMAGES["Literary Fiction"] : GENRE_IMAGES["Editorial"];
      }

      const hash = Math.abs(p.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0));
      chosenImage = pool[hash % pool.length];
    }

    // Mark top 18 diverse projects as featured (6 from book-covers, 6 from illustration, 6 from fine-art)
    const shouldFeature =
      (p.category === "book-covers" && index < 6) ||
      (p.category === "illustration" && index >= 100 && index < 106) ||
      (p.category === "fine-art" && index >= 120 && index < 126);

    await db
      .update(projects)
      .set({
        coverImage: chosenImage,
        isFeatured: shouldFeature ? true : p.isFeatured,
      })
      .where(eq(projects.id, p.id));

    updatedCount++;
    if (shouldFeature) featuredCount++;
  }

  console.log(`Updated ${updatedCount} projects with artwork images.`);
  console.log(`Marked ${featuredCount} projects as isFeatured.`);
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
