'use client';
import { useState } from 'react';
import { artworks } from '@/data/projects';
import PortfolioControls from '@/components/PortfolioControls';
import BehanceCard from '@/components/BehanceCard';

const availabilityOptions = ['Available', 'Sold', 'Private Collection'];

export default function FineArtPage() {
  const [filter, setFilter] = useState('All');
  const [sort, setSort] = useState('newest');

  const filteredArtworks = filter === 'All' ? [...artworks] : artworks.filter(a => a.availability === filter);
  
  // Apply sorting
  filteredArtworks.sort((a, b) => sort === 'newest' ? b.year - a.year : a.year - b.year);

  return (
    <div className="px-6 md:px-10 py-12 max-w-7xl mx-auto text-[#D4D4D4]">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-xs uppercase tracking-[0.3em] text-[#C5A059] font-bold block mb-3">Portfolio</span>
        <h1 className="text-4xl md:text-5xl font-serif text-white font-black leading-tight">Fine Art Gallery</h1>
        <p className="text-sm text-gray-400 mt-4 leading-relaxed">
          A curatorial collection of physical oils, acrylics, and mixed media works. Click on any piece to view it mounted in our virtual exhibition room under gallery lighting.
        </p>
      </div>
      
      <PortfolioControls 
        filterOptions={availabilityOptions} 
        currentFilter={filter} 
        onFilterChange={setFilter} 
        onSortChange={setSort}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredArtworks.map((art) => (
          <BehanceCard
            key={art.id}
            id={art.id}
            title={art.title}
            type="fine-art"
            genreOrMedium={art.medium}
            year={art.year}
            likes={art.likes}
            views={art.views}
            detailUrl={`/fine-art/${art.id}`}
          />
        ))}
      </div>
    </div>
  );
}
