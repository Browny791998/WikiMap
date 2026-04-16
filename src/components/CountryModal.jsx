"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { fetchCountryData, fetchWikiData, getCountryLocalData, getFlagUrl } from "@/lib/countryApi";
import { formatPopulation, getRegionEmoji } from "@/lib/countryHelpers";

const TABS = [
  { id: "Info",    emoji: "ℹ️" },
  { id: "Culture", emoji: "🎭" },
  { id: "Places",  emoji: "🏛️" },
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-slate-700/80 ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5 p-5">
      <div className="flex gap-3 items-center">
        <Skeleton className="w-12 h-8 rounded" />
        <Skeleton className="w-44 h-5" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="w-16 h-3" />
            <Skeleton className="w-28 h-4" />
          </div>
        ))}
      </div>
      <div className="space-y-2 pt-1">
        <Skeleton className="w-full h-3" />
        <Skeleton className="w-full h-3" />
        <Skeleton className="w-5/6 h-3" />
        <Skeleton className="w-3/4 h-3" />
      </div>
    </div>
  );
}

// ─── Image card — fetches from /api/image (Wikipedia pageimages) ──────────────

function ImageCard({ query, ctx = "", label, sublabel, badge, badgeColor = "blue", fullWidth = false, href }) {
  const [src, setSrc]             = useState(null);   // null = loading, "" = no image
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setImgLoaded(false);

    async function load() {
      // Primary fetch — with context hint for better accuracy
      try {
        const r = await fetch(`/api/image?q=${encodeURIComponent(query)}&ctx=${ctx}`);
        const d = await r.json();
        if (cancelled) return;
        if (d.url) { setSrc(d.url); return; }
      } catch { /* fall through */ }

      // Retry with just the first word (e.g. "Longyi traditional..." → "Longyi")
      const firstWord = query.split(/\s+/)[0];
      if (firstWord && firstWord !== query) {
        try {
          const r2 = await fetch(`/api/image?q=${encodeURIComponent(firstWord)}&ctx=${ctx}`);
          const d2 = await r2.json();
          if (cancelled) return;
          if (d2.url) { setSrc(d2.url); return; }
        } catch { /* fall through */ }
      }

      if (!cancelled) setSrc("");
    }

    load();
    return () => { cancelled = true; };
  }, [query, ctx]);

  const badgeClasses = {
    blue:   "bg-blue-500/20 text-blue-300 border-blue-500/30",
    purple: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    amber:  "bg-amber-500/20 text-amber-300 border-amber-500/30",
  }[badgeColor] ?? "bg-slate-600/40 text-slate-300 border-slate-500/30";

  const Wrapper = href ? "a" : "div";
  const wrapperProps = href
    ? { href, target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`group relative overflow-hidden border border-slate-600/30
        bg-slate-800 hover:border-slate-500/60 transition-all shadow-md hover:shadow-xl
        ${href ? "cursor-pointer" : ""}
        ${fullWidth ? "" : "rounded-xl"}`}
    >
      {/* Image */}
      <div className="relative w-full h-32 sm:h-44 bg-slate-700/60">
        {/* Skeleton while URL is loading */}
        {src === null && (
          <div className="absolute inset-0 animate-pulse bg-slate-700" />
        )}
        {/* No image found */}
        {src === "" && (
          <div className="absolute inset-0 flex items-center justify-center text-3xl text-slate-600">
            🖼️
          </div>
        )}
        {/* Image */}
        {src && (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 animate-pulse bg-slate-700" />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={label}
              className={`w-full h-full object-cover transition-opacity duration-500
                ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setSrc("")}
            />
          </>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
        {/* Badge */}
        {badge && (
          <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium
            border ${badgeClasses}`}>
            {badge}
          </span>
        )}
        {/* External link icon overlay on hover */}
        {href && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="bg-black/60 rounded-full p-2 text-white text-lg">↗</span>
          </div>
        )}
      </div>
      {/* Label — hidden on fullWidth since parent renders its own description */}
      {!fullWidth && (
        <div className="px-3 py-2.5">
          <p className="text-sm font-medium text-slate-100 leading-snug">{label}</p>
          {sublabel && <p className="text-[11px] text-slate-500 mt-0.5">{sublabel}</p>}
        </div>
      )}
    </Wrapper>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value }) {
  return (
    <div className="bg-slate-700/40 border border-slate-600/30 rounded-xl p-3
      hover:bg-slate-700/60 transition-colors">
      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm text-slate-100 font-medium leading-snug break-words">{value ?? "N/A"}</p>
    </div>
  );
}

// ─── Info Tab ─────────────────────────────────────────────────────────────────

function InfoTab({ country, wiki }) {
  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard label="Capital"    value={country.capital} />
        <StatCard label="Population" value={formatPopulation(country.population)} />
        <StatCard label="Currency"   value={country.currency} />
        <StatCard label="Language"   value={country.language} />
        <StatCard
          label="Region"
          value={country.region
            ? `${getRegionEmoji(country.region)} ${country.region}${country.subregion ? ` · ${country.subregion}` : ""}`
            : null}
        />
        <StatCard
          label="Area"
          value={country.area != null ? `${country.area.toLocaleString()} km²` : null}
        />
      </div>
      {wiki?.extract && (
        <div className="bg-slate-700/20 border border-slate-600/20 rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Wikipedia</p>
          <p className="text-sm text-slate-300 leading-relaxed line-clamp-6">{wiki.extract}</p>
          {wiki.title && (
            <a
              href={`https://en.wikipedia.org/wiki/${encodeURIComponent(wiki.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-[11px] font-medium
                text-blue-400 hover:text-blue-300 transition-colors"
            >
              See more on Wikipedia
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Culture Tab ──────────────────────────────────────────────────────────────

function CultureTab({ local, countryName }) {
  if (!local) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
        <span className="text-5xl">🚧</span>
        <p className="text-sm">Cultural data coming soon</p>
      </div>
    );
  }

  // Extract the first keyword from the dress string for the image query
  // e.g. "Longyi with Eingyi blouse..." → "Longyi traditional clothing"
  const dressKeyword = local.dress.split(/[\s,]/)[0];

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* Traditional Food — image cards */}
      <section>
        <h3 className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-widest mb-3">
          🍜 Traditional Food
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          {local.food.map((item) => (
            <ImageCard
              key={item}
              query={item}
              ctx="food"
              label={item}
              sublabel={`${countryName} cuisine`}
              badge="🍽️ Food"
              badgeColor="blue"
              href={`https://www.google.com/search?q=${encodeURIComponent(item)}`}
            />
          ))}
        </div>
      </section>

      {/* Traditional Dress — image + description */}
      <section>
        <h3 className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-widest mb-3">
          👘 Traditional Dress
        </h3>
        <div className="rounded-xl overflow-hidden border border-slate-600/30 bg-slate-800">
          <ImageCard
            query={dressKeyword}
            ctx="dress"
            label={dressKeyword}
            sublabel={`${countryName} traditional dress`}
            badge="👘 Dress"
            badgeColor="purple"
            fullWidth
          />
          <p className="text-sm text-slate-300 leading-relaxed p-4 border-t border-slate-700/50">
            {local.dress}
          </p>
        </div>
      </section>

      {/* Festivals — purple pill badges */}
      <section>
        <h3 className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-widest mb-3">
          🎉 Famous Festivals
        </h3>
        <div className="flex flex-wrap gap-2">
          {local.festivals.map((fest) => (
            <a
              key={fest}
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(fest)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 rounded-full text-xs font-medium
                bg-purple-500/15 text-purple-300 border border-purple-500/25
                hover:bg-purple-500/25 hover:border-purple-400/50 transition-colors
                flex items-center gap-1"
            >
              <span>▶</span>{fest}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Places Tab ───────────────────────────────────────────────────────────────

function PlacesTab({ local, countryName }) {
  if (!local) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
        <span className="text-5xl">🚧</span>
        <p className="text-sm">Places data coming soon</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in-up">

      {/* Famous Places — image cards */}
      <section>
        <h3 className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-widest mb-3">
          📍 Famous Places
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          {local.famousPlaces.map((place) => (
            <ImageCard
              key={place}
              query={place}
              ctx="place"
              label={place}
              sublabel={countryName}
              badge="🏛️ Place"
              badgeColor="amber"
              href={`https://www.google.com/search?q=${encodeURIComponent(place)}`}
            />
          ))}
        </div>
      </section>

      {/* Fun Fact */}
      <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5
        border border-amber-500/20 rounded-xl p-4">
        <p className="flex items-center gap-1.5 text-[10px] text-amber-400 uppercase tracking-widest mb-2">
          💡 Fun Fact
        </p>
        <p className="text-sm text-slate-200 leading-relaxed">{local.funFact}</p>
      </div>
    </div>
  );
}

// ─── Flag Lightbox ────────────────────────────────────────────────────────────

function FlagLightbox({ flagUrl, countryName, onClose }) {
  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm px-6"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center gap-3 w-full max-w-sm sm:max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button — anchored to top-right of the flag card */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600
            text-slate-300 hover:text-white transition-colors flex items-center justify-center shadow-lg"
          aria-label="Close flag view"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Flag with wave animation */}
        <div className="w-full rounded-xl overflow-hidden shadow-[0_8px_48px_rgba(0,0,0,0.8)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={flagUrl}
            alt={`Flag of ${countryName}`}
            className="animate-flag-wave block w-full"
            style={{ aspectRatio: "3/2", objectFit: "cover" }}
          />
        </div>
        <p className="text-white text-sm font-medium tracking-wide opacity-80">
          {countryName}
        </p>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function CountryModal({ countryCode, countryName, onClose }) {
  const [activeTab, setActiveTab] = useState("Info");
  const [country, setCountry]     = useState(null);
  const [wiki, setWiki]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [visible, setVisible]     = useState(false);
  const [flagOpen, setFlagOpen]   = useState(false);

  const tabsRef                         = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const local   = getCountryLocalData(countryCode);
  const flagUrl = getFlagUrl(countryCode);
  const overlayRef = useRef(null);

  // Slide-in on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Animate the tab underline indicator
  useEffect(() => {
    if (!tabsRef.current) return;
    const btn = tabsRef.current.querySelector(`[data-tab="${activeTab}"]`);
    if (btn) setIndicatorStyle({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [activeTab]);

  const doFetch = useCallback(() => {
    if (!countryCode || !countryName) return;
    setLoading(true);
    setError(null);
    Promise.all([fetchCountryData(countryCode), fetchWikiData(countryName)])
      .then(([c, w]) => { setCountry(c); setWiki(w); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [countryCode, countryName]);

  useEffect(() => {
    setActiveTab("Info");
    doFetch();
  }, [doFetch]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !flagOpen) handleClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handleClose, flagOpen]);

  const handleOverlayClick = useCallback(
    (e) => { if (e.target === overlayRef.current) handleClose(); },
    [handleClose]
  );

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-40 flex flex-col justify-end sm:flex-row sm:justify-end"
      aria-modal="true"
      role="dialog"
      aria-label={`${countryName} details`}
    >
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-black/50 transition-opacity duration-300
        ${visible ? "opacity-100" : "opacity-0"}`} />

      {/* Panel — slides up from bottom on mobile, slides in from right on sm+ */}
      <div className={`relative z-50 flex flex-col bg-slate-900 shadow-2xl
        transition-transform duration-300 ease-out
        w-full h-[92dvh] rounded-t-2xl self-end
        sm:w-full sm:max-w-md sm:h-full sm:rounded-none sm:border-l sm:border-slate-700/60
        ${visible
          ? "translate-y-0 sm:translate-y-0 sm:translate-x-0"
          : "translate-y-full sm:translate-y-0 sm:translate-x-full"
        }`}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-600" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-700/60 shrink-0
          bg-slate-800/80 backdrop-blur-sm">
          <button
            onClick={() => setFlagOpen(true)}
            className="shrink-0 rounded-md overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.7)]
              ring-0 hover:ring-2 hover:ring-blue-400/60 transition-all focus:outline-none"
            aria-label={`View flag of ${countryName}`}
            title="Click to enlarge flag"
          >
            <Image
              src={flagUrl}
              alt={`Flag of ${countryName}`}
              width={48}
              height={30}
              className="object-cover block"
              unoptimized
            />
          </button>
          <h2 className="flex-1 text-base font-semibold text-white truncate tracking-wide">
            {countryName}
          </h2>
          <button
            onClick={handleClose}
            aria-label="Close panel"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div ref={tabsRef} className="relative flex border-b border-slate-700/60 shrink-0 bg-slate-800/50">
          {TABS.map(({ id, emoji }) => (
            <button
              key={id}
              data-tab={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors
                flex items-center justify-center gap-1.5
                ${activeTab === id ? "text-blue-400" : "text-slate-500 hover:text-slate-300"}`}
            >
              <span>{emoji}</span><span>{id}</span>
            </button>
          ))}
          {/* Sliding underline */}
          <div
            className="tab-indicator"
            style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && <LoadingSkeleton />}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
              <div className="w-full max-w-xs bg-red-500/10 border border-red-500/25 rounded-xl p-5 space-y-3">
                <p className="text-red-400 text-sm font-medium">⚠️ Failed to load</p>
                <p className="text-xs text-red-300/70 leading-relaxed">{error}</p>
                <button
                  onClick={doFetch}
                  className="px-4 py-1.5 rounded-lg text-sm bg-red-500/20 hover:bg-red-500/30
                    text-red-300 border border-red-500/30 transition-colors"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {!loading && !error && country && (
            <div className="p-4 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {activeTab === "Info"    && <InfoTab    country={country} wiki={wiki} />}
              {activeTab === "Culture" && <CultureTab local={local} countryName={countryName} />}
              {activeTab === "Places"  && <PlacesTab  local={local} countryName={countryName} />}
            </div>
          )}
        </div>
      </div>

      {/* Flag lightbox */}
      {flagOpen && (
        <FlagLightbox
          flagUrl={flagUrl}
          countryName={countryName}
          onClose={() => setFlagOpen(false)}
        />
      )}
    </div>
  );
}
