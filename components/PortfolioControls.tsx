'use client';

interface PortfolioControlsProps {
  filterOptions: string[];
  currentFilter: string;
  onFilterChange: (filter: string) => void;
  onSortChange: (sort: string) => void;
  wrap?: boolean;
}

export default function PortfolioControls({ filterOptions, currentFilter, onFilterChange, onSortChange, wrap = false }: PortfolioControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-8 sm:mb-12 py-4 sm:py-6 border-y border-[#1a1a1a]">
      <div className={`flex items-center gap-2.5 sm:gap-4 pb-2 sm:pb-0 w-full sm:w-auto ${wrap ? 'flex-wrap' : 'overflow-x-auto no-scrollbar'}`}>
        <button
          onClick={() => onFilterChange('All')}
          className={`px-4 py-2 sm:py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap min-h-[36px] flex items-center ${
            currentFilter === 'All' 
              ? 'bg-[#C5A059] text-white' 
              : 'text-gray-500 hover:text-white hover:bg-[#111]'
          }`}
        >
          All
        </button>
        {filterOptions.map(option => (
          <button
            key={option}
            onClick={() => onFilterChange(option)}
            className={`px-4 py-2 sm:py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap min-h-[36px] flex items-center ${
              currentFilter === option 
                ? 'bg-[#C5A059] text-white' 
                : 'text-gray-500 hover:text-white hover:bg-[#111]'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t border-[#1a1a1a] sm:border-t-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Sort By</span>
          <select 
            onChange={(e) => onSortChange(e.target.value)}
            className="bg-black text-white text-[11px] font-bold uppercase tracking-widest border-b border-gray-800 pb-1 pt-0.5 focus:border-[#C5A059] focus:outline-none cursor-pointer hover:border-gray-600 transition-colors"
          >
            <option value="newest" className="bg-black text-white">Newest</option>
            <option value="oldest" className="bg-black text-white">Oldest</option>
          </select>
        </div>
      </div>
    </div>
  );
}
