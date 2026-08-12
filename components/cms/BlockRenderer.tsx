'use client';
import { Block } from '@/data/cms';
import Link from 'next/link';
import Image from 'next/image';

export default function BlockRenderer({ block }: { block: Block }) {
  const { type, content } = block;

  switch (type) {
    case 'hero':
      return (
        <section 
          className="relative h-[70vh] flex items-center justify-center text-center px-10 overflow-hidden bg-black"
          style={content.background ? { backgroundImage: `url(${content.background})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
        >
          {content.background && <div className="absolute inset-0 bg-black/60 z-0" />}
          <div className="relative z-10 max-w-4xl">
            <h1 className="text-5xl md:text-7xl font-sans font-bold text-white mb-6 uppercase tracking-tighter">{content.title}</h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">{content.subtitle}</p>
          </div>
        </section>
      );

    case 'text-content':
      return (
        <section className={`py-20 px-10 max-w-4xl mx-auto text-${content.align || 'left'}`}>
          <h2 className="text-3xl font-sans font-bold text-white mb-8">{content.title}</h2>
          <div className="text-lg text-gray-400 leading-relaxed space-y-4">
            {content.body?.split('\n').map((para, i) => <p key={i}>{para}</p>)}
          </div>
        </section>
      );

    case 'gallery':
      return (
        <section className="py-20 px-10 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {content.images?.map((url, i) => (
              <div key={i} className="relative aspect-4/5 bg-gray-900 border border-[#333333]">
                <Image src={url} alt={`Gallery item ${i}`} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover grayscale hover:grayscale-0 transition-all duration-500" />
              </div>
            ))}
          </div>
        </section>
      );

    case 'cta':
      return (
        <section className="py-24 px-10 bg-[#111111] text-center border-y border-[#333333]">
          <h2 className="text-4xl font-sans font-bold text-white mb-4">{content.title}</h2>
          <p className="text-gray-400 mb-10 max-w-2xl mx-auto">{content.subtitle}</p>
          <Link 
            href={content.buttonLink || '#'} 
            className="inline-block px-10 py-4 bg-[#C5A059] text-black font-bold uppercase tracking-widest text-xs hover:bg-white transition-colors"
          >
            {content.buttonText}
          </Link>
        </section>
      );

    default:
      return <div className="p-10 border border-dashed border-gray-800 text-center text-gray-600">Unsupported Block Type: {type}</div>;
  }
}
