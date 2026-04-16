"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Graticule,
  Sphere,
  ZoomableGroup,
} from "react-simple-maps";
import { numericToAlpha2 } from "@/lib/countryHelpers";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const COLOR_DEFAULT   = "#1e3a5f";
const COLOR_HOVER     = "#3b82f6";
const COLOR_SELECTED  = "#f59e0b";
const COLOR_VISITED   = "#92400e";
const COLOR_HIGHLIGHT = "#60a5fa";
const COLOR_BG        = "#0f172a";
const COLOR_STROKE    = "#0c1a2e";

export default function WorldMap({ onCountryClick, highlightCode = null, visitedCodes = new Set() }) {
  const [selectedAlpha2, setSelectedAlpha2] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, name: "", x: 0, y: 0 });
  const [zoom, setZoom]       = useState(1);
  const [center, setCenter]   = useState([0, 0]);

  // Track mouse-down position to distinguish click from drag
  const mouseDownPos = useRef(null);
  const mapRef       = useRef(null);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (mapRef.current && !mapRef.current.contains(e.target)) {
        setTooltip((t) => ({ ...t, visible: false }));
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleCountryClick = useCallback(
    (geo) => {
      // geo.id is the numeric ISO 3166-1 code from world-atlas
      const alpha2 = numericToAlpha2(geo.id);
      const name   = geo.properties?.name ?? "Unknown";

      if (!alpha2) return; // unrecognised territory — ignore

      if (alpha2 === selectedAlpha2) {
        setSelectedAlpha2(null);
        onCountryClick?.(null, null);
      } else {
        setSelectedAlpha2(alpha2);
        onCountryClick?.(alpha2, name);
      }
    },
    [selectedAlpha2, onCountryClick]
  );

  const handleMouseMove = useCallback((geo, e) => {
    setTooltip({ visible: true, name: geo.properties?.name ?? "Unknown", x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip((t) => ({ ...t, visible: false }));
  }, []);

  const handleMoveEnd = useCallback(({ zoom: z, coordinates }) => {
    setZoom(z);
    setCenter(coordinates);
  }, []);

  return (
    <div className="relative w-full h-full" ref={mapRef}>

      {/* Zoom controls */}
      <div className="absolute bottom-20 sm:bottom-14 right-4 z-10 flex flex-col gap-1">
        {[
          { label: "Zoom in",    icon: "+", action: () => setZoom((z) => Math.min(z * 1.5, 16)) },
          { label: "Zoom out",   icon: "−", action: () => setZoom((z) => Math.max(z / 1.5, 1)) },
          { label: "Reset view", icon: "⊙", action: () => { setZoom(1); setCenter([0, 0]); } },
        ].map(({ label, icon, action }) => (
          <button
            key={label}
            onClick={action}
            aria-label={label}
            className="w-8 h-8 rounded bg-slate-700/80 hover:bg-slate-600 text-white text-base font-bold
              flex items-center justify-center select-none transition-colors
              border border-slate-600/50 shadow backdrop-blur-sm"
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Map */}
      <ComposableMap
        style={{ width: "100%", height: "100%", background: COLOR_BG }}
        projectionConfig={{ scale: 147 }}
      >
        <ZoomableGroup
          zoom={zoom}
          center={center}
          onMoveEnd={handleMoveEnd}
          maxZoom={16}
          minZoom={1}
          onMoveStart={() => {
            mouseDownPos.current = { x: 0, y: 0 };
          }}
        >
          <Sphere id="rsm-sphere" fill="#071428" stroke="#1e3a5f" strokeWidth={0.4} />
          <Graticule stroke="#1e3a5f" strokeWidth={0.3} strokeOpacity={0.5} />

          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const alpha2      = numericToAlpha2(geo.id);
                const isSelected  = alpha2 !== null && alpha2 === selectedAlpha2;
                const isVisited   = alpha2 !== null && visitedCodes.has(alpha2) && !isSelected;
                const isHighlight = alpha2 !== null && alpha2 === highlightCode && !isSelected;

                const defaultFill = isSelected  ? COLOR_SELECTED
                  : isHighlight ? COLOR_HIGHLIGHT
                  : isVisited   ? COLOR_VISITED
                  : COLOR_DEFAULT;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => handleCountryClick(geo)}
                    onMouseMove={(e) => handleMouseMove(geo, e)}
                    onMouseLeave={handleMouseLeave}
                    style={{
                      default: {
                        fill: defaultFill,
                        stroke: COLOR_STROKE,
                        strokeWidth: 0.5,
                        outline: "none",
                        transition: "fill 180ms ease",
                      },
                      hover: {
                        fill: isSelected ? COLOR_SELECTED : COLOR_HOVER,
                        stroke: COLOR_STROKE,
                        strokeWidth: 0.5,
                        outline: "none",
                        cursor: "pointer",
                        transition: "fill 180ms ease",
                      },
                      pressed: {
                        fill: COLOR_SELECTED,
                        stroke: COLOR_STROKE,
                        strokeWidth: 0.5,
                        outline: "none",
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="fixed z-50 pointer-events-none px-2.5 py-1 rounded-md text-xs font-medium
            text-white bg-slate-900/95 shadow-xl border border-slate-600/60 whitespace-nowrap backdrop-blur-sm"
          style={{ left: tooltip.x + 14, top: tooltip.y - 34 }}
        >
          {tooltip.name}
        </div>
      )}
    </div>
  );
}
