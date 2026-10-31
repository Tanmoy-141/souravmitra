"use client";

/* eslint-disable @next/next/no-img-element */
import React from "react";

export interface ClientItem {
  name: string;
  logo: string;
  href?: string;
}

export type AnimationType = "marquee" | "fade" | "pulse" | "float" | "none";
export type AnimationSpeed = "slow" | "normal" | "fast";
export type AnimationDirection = "left" | "right";
export type HoverEffect = "scale" | "glow" | "brightness" | "none";

export interface ClientsSectionProps {
  heading?: string;
  headingProps?: {
    className?: string;
    style?: React.CSSProperties;
  };
  headingStyle?: React.CSSProperties;
  fontFamily?: string;
  clients?: ClientItem[];
  animationType?: AnimationType;
  animationSpeed?: AnimationSpeed;
  animationDirection?: AnimationDirection;
  pauseOnHover?: boolean;
  hoverEffect?: HoverEffect;
  logoHeight?: number | string;
  sectionHeight?: number | string;
  paddingY?: string;
  style?: React.CSSProperties;
  className?: string;
}

export const DEFAULT_CLIENTS: ClientItem[] = [
  {
    name: "Signet",
    logo: "https://nyj2ucc9ur7y9rzh.public.blob.vercel-storage.com/39179fee_signet3-T4qa3Gb9M1P98UOpZlewVnBXaPxqgP.jpg",
  },
  { name: "talo", logo: "/clients/talo.png" },
  { name: "SOLID STATE", logo: "/clients/solid_state.png" },
  { name: "NOTED", logo: "/clients/noted.png" },
  { name: "GOAN", logo: "/clients/goan.png" },
  { name: "MOWI", logo: "/clients/mowi.png" },
];

export default function ClientsSection({
  heading = "Clients",
  headingProps,
  headingStyle,
  fontFamily,
  clients = DEFAULT_CLIENTS,
  animationType = "marquee",
  animationSpeed = "normal",
  animationDirection = "left",
  pauseOnHover = true,
  hoverEffect = "scale",
  logoHeight = "44px",
  sectionHeight,
  paddingY,
  style,
  className = "",
}: ClientsSectionProps) {
  // Deduplicate clients by name (case-insensitive) and by logo URL
  // Latest entry wins, preventing duplicate brands (e.g. Signet) appearing multiple times
  const uniqueClients = React.useMemo(() => {
    const list = clients && clients.length > 0 ? clients : DEFAULT_CLIENTS;
    const seenByName = new Map<string, ClientItem>();
    for (const item of list) {
      if (!item?.logo || !item?.name) continue;
      const nameKey = item.name.trim().toLowerCase();
      seenByName.set(nameKey, item);
    }
    const byName = Array.from(seenByName.values());
    const seenByLogo = new Set<string>();
    const result: ClientItem[] = [];
    for (const item of byName) {
      if (!seenByLogo.has(item.logo)) {
        seenByLogo.add(item.logo);
        result.push(item);
      }
    }
    return result.length > 0 ? result : DEFAULT_CLIENTS;
  }, [clients]);

  // For the infinite marquee loop, we double the set for seamless -50% CSS translation.
  // If uniqueClients has fewer than 5 items, repeat to fill viewport width before doubling.
  const marqueeList = React.useMemo(() => {
    let base = [...uniqueClients];
    while (base.length < 5) {
      base = [...base, ...uniqueClients];
    }
    return [...base, ...base];
  }, [uniqueClients]);

  const parsedLogoHeight =
    typeof logoHeight === "number"
      ? `${logoHeight}px`
      : (logoHeight
          ? (String(logoHeight).endsWith("px") ||
             String(logoHeight).endsWith("rem") ||
             String(logoHeight).endsWith("em") ||
             String(logoHeight).endsWith("%")
              ? String(logoHeight)
              : `${logoHeight}px`)
          : "44px");

  const parsedSectionHeight =
    typeof sectionHeight === "number"
      ? `${sectionHeight}px`
      : (sectionHeight && sectionHeight !== "auto"
          ? (String(sectionHeight).endsWith("px") ||
             String(sectionHeight).endsWith("vh") ||
             String(sectionHeight).endsWith("rem") ||
             String(sectionHeight).endsWith("%")
              ? String(sectionHeight)
              : `${sectionHeight}px`)
          : undefined);

  const getSpeedDuration = () => {
    switch (animationSpeed) {
      case "slow":
        return "38s";
      case "fast":
        return "14s";
      case "normal":
      default:
        return "22s";
    }
  };

  const getHoverClass = () => {
    switch (hoverEffect) {
      case "glow":
        return "transition-all duration-300 hover:scale-105 hover:drop-shadow-[0_0_15px_rgba(197,160,89,0.65)]";
      case "brightness":
        return "transition-all duration-300 filter grayscale contrast-75 opacity-70 hover:grayscale-0 hover:contrast-100 hover:opacity-100 hover:scale-105";
      case "none":
        return "transition-opacity duration-300 opacity-85 hover:opacity-100";
      case "scale":
      default:
        return "transition-all duration-300 hover:scale-110 hover:-translate-y-1 opacity-85 hover:opacity-100";
    }
  };

  const isDefaultSystemFont = (f?: string) =>
    !f || f.includes("-apple-system") || f.includes("BlinkMacSystemFont");

  // Prioritize explicit fontFamily prop, or explicit non-default font from styles
  const resolvedFontFamily =
    fontFamily ||
    (!isDefaultSystemFont(headingStyle?.fontFamily as string) ? (headingStyle?.fontFamily as string) : undefined) ||
    (!isDefaultSystemFont(headingProps?.style?.fontFamily as string) ? (headingProps?.style?.fontFamily as string) : undefined) ||
    (!isDefaultSystemFont(style?.fontFamily as string) ? (style?.fontFamily as string) : undefined) ||
    (headingProps?.style?.fontFamily as string) ||
    (headingStyle?.fontFamily as string) ||
    (style?.fontFamily as string) ||
    undefined;

  const mergedHeadingStyle: React.CSSProperties = {
    ...(headingProps?.style || {}),
    ...(headingStyle || {}),
    ...(resolvedFontFamily ? { fontFamily: resolvedFontFamily } : {}),
  };

  const sectionInlineStyle: React.CSSProperties = {
    ...style,
    ...(resolvedFontFamily ? { fontFamily: resolvedFontFamily } : {}),
    ...(parsedSectionHeight
      ? {
          minHeight: parsedSectionHeight,
          height: parsedSectionHeight,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }
      : {}),
  };

  return (
    <section
      data-cms-block="clients-section"
      data-anim-type={animationType}
      data-anim-speed={animationSpeed}
      data-anim-direction={animationDirection}
      data-anim-pause={pauseOnHover ? "true" : "false"}
      data-hover-effect={hoverEffect}
      data-heading={heading}
      data-logo-height={parsedLogoHeight}
      data-section-height={parsedSectionHeight}
      style={sectionInlineStyle}
      className={`relative bg-black w-full ${paddingY || (parsedSectionHeight ? "py-8" : "py-16 sm:py-20")} px-4 border-t border-[#222] overflow-hidden ${className}`}
    >
      <style>{`
        @keyframes client-marquee-slide-left {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        @keyframes client-marquee-slide-right {
          0% {
            transform: translate3d(-50%, 0, 0);
          }
          100% {
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes client-fade-in-up {
          0% {
            opacity: 0;
            transform: translate3d(0, 16px, 0);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes client-pulse-subtle {
          0%, 100% {
            opacity: 0.7;
            transform: scale(0.97);
          }
          50% {
            opacity: 1;
            transform: scale(1.03);
          }
        }
        @keyframes client-float-wave {
          0%, 100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(0, -8px, 0);
          }
        }
        .client-marquee-track {
          display: flex;
          width: max-content;
          will-change: transform;
        }
        .client-marquee-track.anim-left {
          animation: client-marquee-slide-left var(--client-marquee-speed, 22s) linear infinite;
        }
        .client-marquee-track.anim-right {
          animation: client-marquee-slide-right var(--client-marquee-speed, 22s) linear infinite;
        }
        .client-marquee-wrapper:hover .client-marquee-track.pause-on-hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="max-w-6xl mx-auto flex flex-col items-center relative z-10">
        {/* Section Heading */}
        <div className="text-center mb-10 flex flex-col items-center">
          <h2
            className={`text-3xl font-bold text-white tracking-tight ${headingProps?.className || ""}`}
            style={mergedHeadingStyle}
          >
            {heading}
          </h2>
          <div className="w-8 h-0.5 bg-gray-400 opacity-70 mt-2 mb-2"></div>
        </div>

        {/* Animation Content Container */}
        <div className="w-full relative">
          {animationType === "marquee" ? (
            /* Marquee Infinite Loop Track with Gradient Fade Masks */
            <div
              className="client-marquee-wrapper relative w-full overflow-hidden py-4 cursor-default select-none"
              style={{
                maskImage:
                  "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
                WebkitMaskImage:
                  "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
              }}
            >
              <div
                className={`client-marquee-track ${
                  animationDirection === "right" ? "anim-right" : "anim-left"
                } ${pauseOnHover ? "pause-on-hover" : ""}`}
                style={
                  {
                    "--client-marquee-speed": getSpeedDuration(),
                  } as React.CSSProperties
                }
              >
                {marqueeList.map((client, idx) => (
                  <div
                    key={`${client.name}-${idx}`}
                    className={`shrink-0 flex items-center justify-center px-6 sm:px-10 md:px-12 ${getHoverClass()}`}
                    title={client.name}
                  >
                    <img
                      src={client.logo}
                      alt={client.name}
                      style={{
                        height: parsedLogoHeight,
                        maxHeight: parsedLogoHeight,
                        width: "auto",
                        maxWidth: "260px",
                        objectFit: "contain",
                      }}
                      className="w-auto object-contain filter contrast-125 transition-all duration-300"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Grid Layout for Fade, Pulse, Float, or Static */
            <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-14 md:gap-16 lg:gap-20 py-4">
              {uniqueClients.map((client, idx) => {
                let dynamicStyle: React.CSSProperties = {};
                if (animationType === "fade") {
                  dynamicStyle = {
                    animation: `client-fade-in-up 0.8s ease-out ${idx * 0.12}s both`,
                  };
                } else if (animationType === "pulse") {
                  dynamicStyle = {
                    animation: `client-pulse-subtle ${
                      animationSpeed === "fast"
                        ? "1.8s"
                        : animationSpeed === "slow"
                          ? "4.5s"
                          : "3s"
                    } ease-in-out ${idx * 0.25}s infinite`,
                  };
                } else if (animationType === "float") {
                  dynamicStyle = {
                    animation: `client-float-wave ${
                      animationSpeed === "fast"
                        ? "2s"
                        : animationSpeed === "slow"
                          ? "5s"
                          : "3.5s"
                    } ease-in-out ${idx * 0.3}s infinite`,
                  };
                }

                return (
                  <div
                    key={`${client.name}-${idx}`}
                    style={dynamicStyle}
                    className={`flex items-center justify-center p-2 ${getHoverClass()}`}
                    title={client.name}
                  >
                    <img
                      src={client.logo}
                      alt={client.name}
                      style={{
                        height: parsedLogoHeight,
                        maxHeight: parsedLogoHeight,
                        width: "auto",
                        maxWidth: "260px",
                        objectFit: "contain",
                      }}
                      className="w-auto object-contain transition-all duration-300"
                      loading="lazy"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
