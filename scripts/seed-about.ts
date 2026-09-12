import { db } from "@/db";
import { pages } from "@/db/schema";
import { awardsAndRecognition } from "@/data/content";

async function seedAboutPage() {
  console.log("Seeding About page...");
  
  // Construct HTML content based on the original structure
  const htmlContent = `
    <div class="px-10 py-12 max-w-4xl mx-auto text-[#D4D4D4]">
      <h1 class="text-4xl font-serif text-white mb-8">About Myself...</h1>
      <p class="text-lg mb-8">[Biography content here...]</p>
      <section class="py-12">
        <div class="flex flex-col items-center">
          <h2 class="text-3xl font-bold text-white mb-4">Awards & Recognition</h2>
          <div class="w-10 h-1 bg-gray-600 mb-12"></div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8 w-full text-center">
            <div>
              <h3 class="font-bold text-white mb-6 text-lg">Awards</h3>
              ${awardsAndRecognition.awards.map(a => `
                <div class="mb-8 flex flex-col items-center">
                  <p class="text-white font-medium">${a.title}</p>
                  <p class="text-gray-400 text-sm">${a.organization}</p>
                </div>
              `).join('')}
            </div>
            <div>
              <h3 class="font-bold text-white mb-6 text-lg">Exhibitions</h3>
              ${awardsAndRecognition.exhibitions.map(e => `
                <div class="mb-8 flex flex-col items-center">
                  <p class="text-white font-medium">${e.title}</p>
                  <p class="text-gray-400 text-sm">${e.location}</p>
                </div>
              `).join('')}
            </div>
            <div>
              <h3 class="font-bold text-white mb-6 text-lg">Media</h3>
              ${awardsAndRecognition.mediaMentions.map(m => `
                <div class="mb-8 flex flex-col items-center">
                  <p class="text-white font-medium">${m.title}</p>
                  <p class="text-gray-400 text-sm">${m.source}, ${m.year}</p>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </section>
    </div>
  `;

  await db.insert(pages).values({
    slug: "about",
    title: "About",
    status: "published",
    htmlCache: htmlContent,
    cssCache: "", // Assuming no custom CSS needed initially
  });
  
  console.log("About page seeded successfully.");
}

seedAboutPage().catch(console.error);
