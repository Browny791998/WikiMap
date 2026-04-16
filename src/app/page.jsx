"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import CountryModal from "@/components/CountryModal";

const WorldMap = dynamic(() => import("@/components/WorldMap"), { ssr: false });

// ─── Star field — client-only to avoid SSR/client Math.random() mismatch ──────

const STAR_COUNT = 120;

function generateStars() {
  return Array.from({ length: STAR_COUNT }, (_, i) => ({
    id:       i,
    top:      `${Math.random() * 100}%`,
    left:     `${Math.random() * 100}%`,
    size:     Math.random() < 0.6 ? 1 : Math.random() < 0.85 ? 1.5 : 2,
    duration: `${2.5 + Math.random() * 4}s`,
    delay:    `${Math.random() * 5}s`,
  }));
}

function StarField() {
  const [stars, setStars] = useState([]);

  // Generate only on the client — Math.random() must never run on the server
  // for values that are rendered to the DOM, or hydration will mismatch.
  useEffect(() => {
    setStars(generateStars());
  }, []);

  if (stars.length === 0) return null;

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white animate-star"
          style={{
            top:          star.top,
            left:         star.left,
            width:        star.size,
            height:       star.size,
            "--duration": star.duration,
            "--delay":    star.delay,
          }}
        />
      ))}
    </div>
  );
}

// ─── Country name → alpha-2 overrides (for search bar) ───────────────────────

const NAME_TO_ALPHA2_OVERRIDES = {
  "united states of america": "US",
  "united states": "US",
  "usa": "US",
  "united kingdom": "GB",
  "uk": "GB",
  "south korea": "KR",
  "north korea": "KP",
  "czech republic": "CZ",
  "czechia": "CZ",
  "russia": "RU",
  "iran": "IR",
  "syria": "SY",
  "myanmar": "MM",
  "burma": "MM",
  "vietnam": "VN",
  "laos": "LA",
};

function resolveSearchToCode(query, visitedNames) {
  if (!query.trim()) return null;
  const lower = query.trim().toLowerCase();
  if (NAME_TO_ALPHA2_OVERRIDES[lower]) return NAME_TO_ALPHA2_OVERRIDES[lower];
  for (const [name, code] of visitedNames.entries()) {
    if (name.toLowerCase().includes(lower)) return code;
  }
  return null;
}

// ─── Animated counter ────────────────────────────────────────────────────────

function AnimatedCount({ value }) {
  const [pop, setPop]       = useState(false);
  const prevRef             = useRef(value);

  useEffect(() => {
    if (value !== prevRef.current) {
      prevRef.current = value;
      setPop(true);
      const id = setTimeout(() => setPop(false), 400);
      return () => clearTimeout(id);
    }
  }, [value]);

  return (
    <span
      key={value}
      className={`font-bold text-white inline-block transition-all ${pop ? "animate-count-pop" : ""}`}
    >
      {value}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [visitedCodes, setVisitedCodes]       = useState(new Set());
  const visitedNamesRef                       = useRef(new Map());

  const [searchQuery, setSearchQuery]   = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [highlightCode, setHighlightCode] = useState(null);
  const searchRef = useRef(null);

  // Resolve highlight code from search query
  useEffect(() => {
    if (!searchQuery.trim()) { setHighlightCode(null); return; }
    setHighlightCode(resolveSearchToCode(searchQuery, visitedNamesRef.current));
  }, [searchQuery]);

  const handleCountryClick = useCallback((alpha2, name) => {
    if (!alpha2) { setSelectedCountry(null); return; }
    setSelectedCountry({ code: alpha2, name });
    visitedNamesRef.current.set(name, alpha2);
    setVisitedCodes((prev) => {
      if (prev.has(alpha2)) return prev;
      const next = new Set(prev);
      next.add(alpha2);
      return next;
    });
  }, []);

  const handleModalClose = useCallback(() => setSelectedCountry(null), []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const code = resolveSearchToCode(searchQuery, visitedNamesRef.current);
    if (code) {
      let name = searchQuery.trim();
      for (const [n, c] of visitedNamesRef.current.entries()) {
        if (c === code) { name = n; break; }
      }
      setSelectedCountry({ code, name });
    }
    searchRef.current?.blur();
  };

  const visitedCount = visitedCodes.size;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0f172a]">

      {/* ── Star / particle background ── */}
      <StarField />

      {/* ── Map (full screen) ── */}
      <div className="absolute inset-0 z-10">
        <WorldMap
          onCountryClick={handleCountryClick}
          highlightCode={highlightCode}
          visitedCodes={visitedCodes}
        />
      </div>

      {/* ── Top bar: title left + search right ── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between
        px-4 py-3 gap-2 pointer-events-none">

        {/* Title */}
        <div className="pointer-events-none select-none shrink-0">
          <h1 className="text-white text-sm sm:text-base font-semibold tracking-wide drop-shadow-lg
            flex items-center gap-1.5">
            <span>🌍</span>
            <span className="bg-gradient-to-r from-blue-300 to-sky-400 bg-clip-text text-transparent">
              World Explorer
            </span>
          </h1>
        </div>

        {/* Search bar */}
        <div className="pointer-events-auto shrink-0">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search country…"
              aria-label="Search country"
              className={`pl-3 pr-8 py-1.5 rounded-lg text-sm bg-slate-800/90 text-white
                placeholder-slate-500 border outline-none backdrop-blur-sm
                transition-all duration-200
                ${searchFocused || searchQuery
                  ? "w-40 sm:w-56 md:w-64 border-blue-500 ring-1 ring-blue-500/30"
                  : "w-32 sm:w-44 md:w-52 border-slate-600/70"
                }`}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => { setSearchQuery(""); setHighlightCode(null); }}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            )}
          </form>
          {searchQuery.trim() && !highlightCode && (
            <p className="mt-1 text-[11px] text-slate-500 text-right pr-1">No match found</p>
          )}
        </div>
      </div>

      {/* ── Credit bottom-left ── */}
      <div className="absolute bottom-5 left-4 z-20 flex items-center gap-1.5
        pointer-events-none select-none drop-shadow-lg">
        <span className="text-[10px] sm:text-xs text-slate-500/80 tracking-wide font-medium flex items-center gap-1">
          Crafted with <span className="text-red-500/80 animate-pulse">❤️</span> by <span className="text-slate-400">Ye Htet Aung</span>
        </span>
      </div>

      {/* ── Hint bottom-center ── */}
      {!selectedCountry && (
        <p className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 text-xs text-slate-500/80
          pointer-events-none select-none tracking-wide text-center px-4">
          Tap any country to explore
        </p>
      )}

      {/* ── Visited counter bottom-right ── */}
      <div className="absolute bottom-5 right-4 z-20 flex items-center gap-2
        bg-slate-800/70 backdrop-blur-sm border border-slate-700/50 rounded-lg px-3 py-1.5
        pointer-events-none select-none shadow">
        <span className="text-base leading-none">🗺️</span>
        <span className="text-xs text-slate-400">
          <AnimatedCount value={visitedCount} />
          <span className="text-slate-500"> / 195 explored</span>
        </span>
      </div>

      {/* ── Modal ── */}
      {selectedCountry && (
        <CountryModal
          countryCode={selectedCountry.code}
          countryName={selectedCountry.name}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
