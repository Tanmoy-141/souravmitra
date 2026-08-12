import { awardsAndRecognition } from "@/data/content";
import ClientsSection from "@/components/ClientsSection";

export default function AboutPage() {
  return (
    <div className="px-10 py-12 max-w-4xl mx-auto text-[#D4D4D4]">
      <h1 className="text-4xl font-serif text-white mb-8">About Myself...</h1>
      <p className="text-lg mb-8">[Biography content here...]</p>

      <section className="py-12">
        <div className="flex flex-col items-center">
          <h2 className="text-3xl font-bold text-white mb-4">Awards & Recognition</h2>
          <div className="w-10 h-1 bg-gray-600 mb-12"></div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full text-center">
            <div>
              <h3 className="font-bold text-white mb-6 text-lg">Awards</h3>
              {awardsAndRecognition.awards.map((a, i) => (
                <div key={i} className="mb-8 flex flex-col items-center">
                  <div className="w-16 h-16 border border-gray-700 flex items-center justify-center mb-3 text-gray-600 text-xs">IMG</div>
                  <p className="text-white font-medium">{a.title}</p>
                  <p className="text-gray-400 text-sm">{a.organization}</p>
                </div>
              ))}
            </div>
            <div>
              <h3 className="font-bold text-white mb-6 text-lg">Exhibitions</h3>
              {awardsAndRecognition.exhibitions.map((e, i) => (
                <div key={i} className="mb-8 flex flex-col items-center">
                  <div className="w-16 h-16 border border-gray-700 flex items-center justify-center mb-3 text-gray-600 text-xs">IMG</div>
                  <p className="text-white font-medium">{e.title}</p>
                  <p className="text-gray-400 text-sm">{e.location}</p>
                </div>
              ))}
            </div>
            <div>
              <h3 className="font-bold text-white mb-6 text-lg">Media</h3>
              {awardsAndRecognition.mediaMentions.map((m, i) => (
                <div key={i} className="mb-8 flex flex-col items-center">
                  <div className="w-16 h-16 border border-gray-700 flex items-center justify-center mb-3 text-gray-600 text-xs">IMG</div>
                  <p className="text-white font-medium">{m.title}</p>
                  <p className="text-gray-400 text-sm">{m.source}, {m.year}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <ClientsSection />
    </div>
  );
}
