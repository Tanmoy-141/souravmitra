/* eslint-disable @next/next/no-img-element */
import React from "react";

const clients = [
  { name: "talo", logo: "/clients/talo.png" },
  { name: "SOLID STATE", logo: "/clients/solid_state.png" },
  { name: "NOTED", logo: "/clients/noted.png" },
  { name: "GOAN", logo: "/clients/goan.png" },
  { name: "MOWI", logo: "/clients/mowi.png" },
];

export default function ClientsSection() {
  return (
    <section className="bg-black w-full py-20 px-4 border-t border-[#222]">
      <div className="max-w-6xl mx-auto flex flex-col items-center">
        <h2 className="text-3xl font-bold text-white tracking-tight">
          Clients
        </h2>
        <div className="w-8 h-0.5 bg-gray-400 opacity-70 mt-2 mb-14"></div>

        <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-14 md:gap-16 lg:gap-20">
          {clients.map((client) => (
            <div
              key={client.name}
              className="flex items-center justify-center transition-all duration-300 hover:scale-105 opacity-85 hover:opacity-100">
              <img
                src={client.logo}
                alt={client.name}
                className="h-10 sm:h-11 md:h-12 w-auto object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
