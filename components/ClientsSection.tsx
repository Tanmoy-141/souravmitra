import React from 'react';

const clients = [
  { name: 'talo', icon: <div className="w-10 h-10 border border-gray-500 flex items-center justify-center text-gray-500 font-bold">+</div> },
  { name: 'SOLID STATE', icon: <div className="w-10 h-10 border border-gray-500 rotate-45 flex items-center justify-center text-gray-500">S</div> },
  { name: 'NOTED', icon: <div className="w-10 h-10 border-t-2 border-l-2 border-gray-500 rounded-tl-full"></div> },
  { name: 'GOAN', icon: <div className="w-10 h-10 border-2 border-gray-500 rounded-full"></div> },
  { name: 'MOWI', icon: <div className="w-10 h-10 border-l-20 border-l-transparent border-r-20 border-r-transparent border-b-35 border-b-gray-500"></div> },
];

export default function ClientsSection() {
  return (
    <section className="bg-black w-full py-20 px-4">
      <div className="max-w-6xl mx-auto flex flex-col items-center">
        <h2 className="text-3xl font-bold text-white mb-4">Clients</h2>
        <div className="w-10 h-1 bg-gray-600 mb-12"></div>
        
        <div className="flex flex-wrap justify-center gap-10 md:gap-20">
          {clients.map((client) => (
            <div key={client.name} className="flex flex-col items-center w-28 md:w-36 grayscale opacity-70 hover:opacity-100 transition-opacity">
              <div className="mb-2">{client.icon}</div>
              <span className="text-gray-400 text-xs tracking-widest uppercase">{client.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
