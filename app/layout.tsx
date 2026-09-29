import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Counter } from "@/components/Counter";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CustomFont, formatFontFaceCss } from "@/lib/fonts";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  let faviconUrl = "/favicon.svg";
  try {
    const [themeSetting] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, "theme"))
      .limit(1);

    const data = (themeSetting?.gjsData as { faviconUrl?: string }) || {};
    if (data.faviconUrl) {
      faviconUrl = data.faviconUrl;
    }
  } catch {
    // fallback to default
  }

  return {
    title: "Sourav Mitra | Illustrator & Designer",
    description:
      "Portfolio of Sourav Mitra, Illustrator, Book Cover Designer, and Fine Artist.",
    icons: {
      icon: faviconUrl,
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let customFonts: CustomFont[] = [];
  try {
    const [themeSetting] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, "theme"))
      .limit(1);

    const data =
      (themeSetting?.gjsData as { customFonts?: CustomFont[] }) || {};
    if (Array.isArray(data.customFonts)) {
      customFonts = data.customFonts;
    }
  } catch {
    // fallback to empty
  }

  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Almendra:ital,wght@0,400;0,700;1,400&family=Bellefair&family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Cardo:ital,wght@0,400;0,700;1,400&family=Castoro+Titling&family=Cinzel+Decorative:wght@400;700;900&family=Cinzel:wght@400..900&family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700&family=Crimson+Pro:ital,wght@0,300..900;1,300..900&family=EB+Garamond:ital,wght@0,400..800;1,400..800&family=Faustina:ital,wght@0,300..800;1,300..800&family=Forum&family=Frank+Ruhl+Libre:wght@300..900&family=Italiana&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400..700;1,400..700&family=Marcellus&family=MedievalSharp&family=Merriweather:ital,wght@0,300..900;1,300..900&family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&family=Playfair+Display+SC:ital,wght@0,400;0,700;0,900;1,400&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Prata&family=Spectral:ital,wght@0,200..800;1,200..800&family=Unna:ital,wght@0,400;0,700;1,400&family=Vollkorn:ital,wght@0,400..900;1,400..900&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,300..900;1,300..900&family=Be+Vietnam+Pro:ital,wght@0,300..900;1,300..900&family=Cabin:ital,wght@0,400..700;1,400..700&family=DM+Sans:ital,opsz,wght@0,9..40,300..900;1,9..40,300..900&family=Epilogue:ital,wght@0,300..900;1,300..900&family=Inter:wght@300..900&family=Jost:ital,wght@0,300..900;1,300..900&family=Lexend:wght@300..900&family=Manrope:wght@300..800&family=Montserrat:ital,wght@0,300..900;1,300..900&family=Outfit:wght@300..900&family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&family=Poppins:ital,wght@0,300..900;1,300..900&family=Raleway:ital,wght@0,300..900;1,300..900&family=Sora:wght@300..800&family=Space+Grotesk:wght@300..700&family=Syne:wght@400..800&family=Urbanist:ital,wght@0,300..900;1,300..900&family=Work+Sans:ital,wght@0,300..900;1,300..900&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Anton&family=Audiowide&family=Bebas+Neue&family=Bungee&family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&family=Creepster&family=Dancing+Script:wght@400..700&family=Fira+Code:wght@400..700&family=Great+Vibes&family=JetBrains+Mono:ital,wght@0,300..800;1,300..800&family=Nosifer&family=Orbitron:wght@400..900&family=Oswald:wght@300..700&family=Parisienne&family=Pirata+One&family=Righteous&family=Russo+One&family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&family=Special+Elite&family=Teko:wght@400..700&family=Uncial+Antiqua&display=swap"
        />

        {/* Dynamically Injected Custom Fonts (Google Fonts, Web Font URLs, Uploaded @font-face) */}
        {customFonts.map((font) => {
          if (font.type === "upload") {
            const fontCss = formatFontFaceCss(font);
            return (
              <style
                key={font.id}
                data-custom-font={font.id}
                dangerouslySetInnerHTML={{ __html: fontCss }}
              />
            );
          }
          return (
            <link
              key={font.id}
              rel="stylesheet"
              href={font.url}
              data-custom-font={font.id}
            />
          );
        })}
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <Header />
        <main className="grow">{children}</main>

        {/* Animated Counters Section */}
        <section className="bg-[#111111] py-12 border-t border-[#333333]">
          <div className="container mx-auto px-10 grid grid-cols-2 md:grid-cols-3 gap-8">
            <Counter target={150} label="Projects Completed" />
            <Counter target={50} label="Happy Clients" />
            <Counter target={10} label="Years Experience" />
          </div>
        </section>

        <Footer />
      </body>
    </html>
  );
}
