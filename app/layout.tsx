import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Counter } from "@/components/Counter";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sourav Mitra | Illustrator & Designer",
  description:
    "Portfolio of Sourav Mitra, Illustrator, Book Cover Designer, and Fine Artist.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
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
