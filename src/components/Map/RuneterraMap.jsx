import React, { useState, useEffect, useRef } from "react";
import styles from "./RuneterraMap.module.css";

const VIEW_W = 680;
const VIEW_H = 440;
const MOBILE_ZOOM = 1.85;

const REGIONS_DATA = [
  {
    id: "freljord",
    name: "Freljord",
    color: "#5BB8E0",
    lore: "A harsh, unforgiving land locked in endless winter. Ancient gods sleep beneath the ice.",
    fill: "M 52 18 L 195 8 L 358 24 L 396 62 L 362 114 L 248 130 L 148 98 L 72 58 Z",
  },
  {
    id: "demacia",
    name: "Demacia",
    color: "#4878C8",
    lore: "A mighty kingdom whose devotion to justice is only rivaled by its disdain for magic.",
    fill: "M 108 140 L 250 128 L 282 164 L 260 220 L 195 250 L 132 228 L 110 178 Z",
  },
  {
    id: "noxus",
    name: "Noxus",
    color: "#C83030",
    lore: "In Noxus, strength is the only currency that matters. The weak exist to serve.",
    fill: "M 284 136 L 438 146 L 444 206 L 398 246 L 328 256 L 276 194 Z",
  },
  {
    id: "piltover",
    name: "Piltover",
    color: "#D4A020",
    lore: "Gleaming towers hide a vast undercity. Hextech crystals power both wonders and weapons.",
    fill: "M 448 150 L 572 162 L 568 220 L 512 250 L 454 234 L 440 190 Z",
  },
  {
    id: "shadow_isles",
    name: "Shadow Isles",
    color: "#8B4FD4",
    lore: "The Black Mist flows from these cursed islands, binding souls to eternal torment.",
    fill: "M 564 298 L 648 290 L 658 354 L 616 384 L 560 366 Z",
  },
  {
    id: "void",
    name: "The Void",
    color: "#8020D8",
    lore: "The Void is not a place. It is an absence — consuming everything it touches.",
    fill: "M 328 415 L 480 418 L 478 440 L 404 440 L 328 438 Z",
  },
];

const PIN_POSITIONS = {
  freljord:     { x: 224, y: 72  },
  demacia:      { x: 196, y: 194 },
  noxus:        { x: 361, y: 198 },
  piltover:     { x: 507, y: 202 },
  shadow_isles: { x: 611, y: 338 },
  void:         { x: 403, y: 428 },
};

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function calcTargetVb(regionId, mobile) {
  if (!mobile || !regionId) return [0, 0, VIEW_W, VIEW_H];
  const pin = PIN_POSITIONS[regionId];
  if (!pin) return [0, 0, VIEW_W, VIEW_H];
  const w = VIEW_W / MOBILE_ZOOM;
  const h = VIEW_H / MOBILE_ZOOM;
  return [
    clamp(pin.x - w / 2, 0, VIEW_W - w),
    clamp(pin.y - h / 2, 0, VIEW_H - h),
    w,
    h,
  ];
}

export default function RuneterraMap({ currentRegionId, nextRegionId }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 600
  );
  const [vb, setVb] = useState([0, 0, VIEW_W, VIEW_H]);
  const animVb = useRef([0, 0, VIEW_W, VIEW_H]);
  const rafRef = useRef(null);

  // Detect mobile / resize
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Smooth pan/zoom to current region on mobile
  useEffect(() => {
    const target = calcTargetVb(currentRegionId, isMobile);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const step = () => {
      const cur = animVb.current;
      const next = cur.map((v, i) => {
        const d = target[i] - v;
        return Math.abs(d) < 0.25 ? target[i] : v + d * 0.16;
      });
      animVb.current = next;
      setVb([...next]);
      if (next.some((v, i) => Math.abs(v - target[i]) >= 0.25)) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [currentRegionId, isMobile]);

  const [vbX, vbY, vbW, vbH] = vb;
  const pin = currentRegionId ? PIN_POSITIONS[currentRegionId] : null;

  // Compass position anchored to visible area bottom-right
  const compassX = vbX + vbW - 44;
  const compassY = vbY + vbH - 44;

  return (
    <div className={styles.wrap}>
      <svg
        viewBox={vb.map(v => v.toFixed(1)).join(" ")}
        preserveAspectRatio="xMidYMid slice"
        className={styles.svg}
      >
        {/* ── Background ── */}
        <defs>
          <radialGradient id="ocean" cx="50%" cy="50%" r="80%">
            <stop offset="0%"   stopColor="#0d2a3a" />
            <stop offset="60%"  stopColor="#091e2c" />
            <stop offset="100%" stopColor="#050e16" />
          </radialGradient>
          <radialGradient id="landGlow" cx="50%" cy="45%" r="60%">
            <stop offset="0%"   stopColor="#1a3820" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#0d2a3a" stopOpacity="0" />
          </radialGradient>
          <filter id="mapBlur">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>
        <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="url(#ocean)" />
        <ellipse cx="320" cy="190" rx="320" ry="210" fill="url(#landGlow)" />
        <path d="M 80 80 L 600 70 L 620 260 L 560 310 L 480 260 L 440 300 L 380 290 L 300 310 L 220 280 L 160 250 L 60 220 Z"
          fill="#1a3820" opacity="0.55" filter="url(#mapBlur)" />
        <path d="M 60 0 L 580 0 L 560 80 L 80 90 Z"
          fill="#1e2e38" opacity="0.5" filter="url(#mapBlur)" />
        <path d="M 200 380 L 520 385 L 510 440 L 680 440 L 680 420 L 200 415 Z"
          fill="#130a1a" opacity="0.6" filter="url(#mapBlur)" />
        <ellipse cx="72" cy="205" rx="65" ry="45" fill="#1a1228" opacity="0.7" filter="url(#mapBlur)" />
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={`gh${i}`} x1="0" y1={i * 75} x2={VIEW_W} y2={i * 75}
            stroke="rgba(100,160,200,0.05)" strokeWidth="1" />
        ))}
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={`gv${i}`} x1={i * 68} y1="0" x2={i * 68} y2={VIEW_H}
            stroke="rgba(100,160,200,0.05)" strokeWidth="1" />
        ))}
        <image
          href="/assets/map/runeterra.jpg"
          x="0" y="0"
          width={VIEW_W}
          height={VIEW_H}
          preserveAspectRatio="xMidYMid slice"
          className={styles.mapImage}
        />

        {/* ── Region overlays ── */}
        {REGIONS_DATA.map(region => {
          const isCurrent = region.id === currentRegionId;
          const isNext    = region.id === nextRegionId;
          const isHovered = region.id === hoveredId;
          return (
            <g
              key={region.id}
              className={styles.region}
              onMouseEnter={() => setHoveredId(region.id)}
              onMouseLeave={() => setHoveredId(null)}
              onTouchStart={() => setHoveredId(p => p === region.id ? null : region.id)}
            >
              {/* Fill */}
              <path
                d={region.fill}
                fill={region.color}
                className={[
                  styles.regionFill,
                  isCurrent && styles.regionFillCurrent,
                  isHovered && styles.regionFillHover,
                ].filter(Boolean).join(" ")}
              />
              {/* Border */}
              <path
                d={region.fill}
                fill="none"
                stroke={region.color}
                strokeWidth="2"
                strokeLinejoin="round"
                className={[
                  styles.regionBorder,
                  isCurrent && styles.regionBorderCurrent,
                  isNext    && styles.regionBorderNext,
                  isHovered && styles.regionBorderHover,
                ].filter(Boolean).join(" ")}
              />
              {/* Animated glow ring for current */}
              {isCurrent && (
                <path
                  d={region.fill}
                  fill="none"
                  stroke={region.color}
                  strokeWidth="4"
                  strokeLinejoin="round"
                  className={styles.regionGlow}
                />
              )}
            </g>
          );
        })}

        {/* ── Region labels ── */}
        {REGIONS_DATA.map(region => {
          const pos       = PIN_POSITIONS[region.id];
          if (!pos) return null;
          const isCurrent = region.id === currentRegionId;
          const isNext    = region.id === nextRegionId;
          const isHovered = region.id === hoveredId;
          if (!isCurrent && !isNext && !isHovered) return null;
          const labelY = region.id === "void" ? pos.y - 20 : pos.y + 22;
          return (
            <text
              key={`lbl-${region.id}`}
              x={pos.x}
              y={labelY}
              textAnchor="middle"
              fontSize="11"
              fontFamily="'Palatino Linotype', Palatino, Georgia, serif"
              fontWeight="bold"
              letterSpacing="0.05em"
              style={{ paintOrder: "stroke" }}
              stroke="rgba(0,0,0,0.9)"
              strokeWidth="3"
              fill={region.color}
              className={[
                styles.regionLabel,
                isCurrent && styles.regionLabelCurrent,
                isNext    && styles.regionLabelNext,
                isHovered && styles.regionLabelHover,
              ].filter(Boolean).join(" ")}
            >
              {region.name}
            </text>
          );
        })}

        {/* ── Current region pin (static, no YOU ARE HERE) ── */}
        {pin && (
          <g className={styles.pinGroup}>
            {/* Expanding sonar ring — SMIL animation, no movement */}
            <circle cx={pin.x} cy={pin.y} r="5" fill="none" stroke="#C89B3C" strokeWidth="2">
              <animate attributeName="r"      from="5"   to="22"  dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.9" to="0"   dur="1.6s" repeatCount="indefinite" />
            </circle>
            {/* Static gold dot */}
            <circle
              cx={pin.x}
              cy={pin.y}
              r="5"
              className={styles.pinDot}
            />
          </g>
        )}

        {/* ── Compass (follows visible area) ── */}
        <g transform={`translate(${compassX}, ${compassY})`} className={styles.compass}>
          <circle cx="0" cy="0" r="22" fill="rgba(0,0,0,0.55)" stroke="rgba(200,155,60,0.5)" strokeWidth="1" />
          <line x1="0" y1="-18" x2="0" y2="18" stroke="rgba(200,155,60,0.7)" strokeWidth="1" />
          <line x1="-18" y1="0" x2="18" y2="0" stroke="rgba(200,155,60,0.7)" strokeWidth="1" />
          <polygon points="0,-18 -4,-10 4,-10" fill="#C89B3C" />
          <polygon points="0,18 -4,10 4,10" fill="rgba(200,155,60,0.3)" />
          <text x="0" y="-20" textAnchor="middle" fontSize="7" fill="#C89B3C" fontFamily="serif" fontWeight="bold">N</text>
        </g>

      </svg>
    </div>
  );
}
