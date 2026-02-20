import { useState, useRef } from "react";

// ─── Interactive Chart ─── scrubber, zoom, candlestick, comparison, dynamic fill ───

const C = {
  green: "#36D7B7",
  greenSoft: "rgba(54,215,183,0.15)",
  red: "#EF4444",
  redSoft: "rgba(239,68,68,0.15)",
  primary: "#4338CA",
  accent: "#50E3C2",
  text: "#0F172A",
  textSec: "#64748B",
  textMuted: "#94A3B8",
  card: "rgba(255,255,255,0.72)",
  border: "rgba(255,255,255,0.9)",
};

function generateOHLC(data, id = 1) {
  const seed = id * 13;
  return data.map((pt, i) => {
    const noise1 = Math.sin(seed + i * 1.1) * 0.04;
    const noise2 = Math.cos(seed + i * 0.9) * 0.03;
    const open = i === 0 ? pt.v * (1 + noise1) : data[i - 1].v;
    const close = pt.v;
    const high = Math.max(open, close) * (1 + Math.abs(noise1) + 0.01);
    const low = Math.min(open, close) * (1 - Math.abs(noise2) - 0.01);
    return { d: pt.d, open, high, low, close, vol: pt.vol };
  });
}

export default function InteractiveChart({
  data = [],
  color = C.green,
  height = 160,
  buyInPrice = null,
  comparisonData = null,
  comparisonColor = "#5B6AE8",
  comparisonLabel = "",
  label = "",
  artistId = 1,
}) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(400);
  const [hoverIdx, setHoverIdx] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [mode, setMode] = useState("line"); // line | candlestick
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [zoomRange, setZoomRange] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const pinchRef = useRef(null);

  const viewData = zoomRange ? data.slice(zoomRange[0], zoomRange[1] + 1) : data;
  const ohlcData = generateOHLC(viewData, artistId);

  const W = 400;
  const H = height;
  const PAD = { top: 12, bottom: 20, left: 0, right: 0 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const vals = viewData.map((d) => d.v);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const range = max - min || 0.01;

  const toX = (i, len) => PAD.left + (i / Math.max(len - 1, 1)) * chartW;
  const toY = (v) => PAD.top + (1 - (v - min) / range) * chartH;

  // Normalize for comparison mode
  const compMin = comparisonData ? Math.min(...comparisonData.map((d) => d.v)) : 0;
  const compMax = comparisonData ? Math.max(...comparisonData.map((d) => d.v)) : 1;
  const compRange = compMax - compMin || 0.01;
  const toYComp = (v) => PAD.top + (1 - (v - compMin) / compRange) * chartH;

  // Build line path
  const pts = viewData.map((d, i) => ({
    x: toX(i, viewData.length),
    y: toY(d.v),
  }));
  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  // Area path with dynamic fill split at buyInPrice
  const buyInY = buyInPrice != null ? toY(buyInPrice) : null;

  const areaPathFull =
    linePath +
    ` L${pts[pts.length - 1].x.toFixed(1)},${H} L${pts[0].x.toFixed(1)},${H} Z`;

  // Comparison line
  const compPts = comparisonData
    ? comparisonData.map((d, i) => ({
        x: toX(i, comparisonData.length),
        y: toYComp(d.v),
      }))
    : [];
  const compLinePath = compPts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  // Scrubber logic
  const getIdxFromX = (clientX) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = clientX - rect.left;
    const svgX = (relX / rect.width) * W;
    const idx = Math.round(
      ((svgX - PAD.left) / chartW) * (viewData.length - 1)
    );
    return Math.max(0, Math.min(viewData.length - 1, idx));
  };

  const handlePointerMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    setContainerWidth(rect.width);

    if (isDragging && !isScrubbing) {
      const idx = getIdxFromX(e.clientX);
      setDragEnd(idx);
    } else {
      const idx = getIdxFromX(e.clientX);
      setHoverIdx(idx);
      setTooltipPos({ x: relX, y: relY });
    }
  };

  const handlePointerDown = (e) => {
    if (e.pointerType === "touch") return;
    const idx = getIdxFromX(e.clientX);
    setDragStart(idx);
    setDragEnd(idx);
    setIsDragging(true);
    setIsScrubbing(false);
  };

  const handlePointerUp = () => {
    if (isDragging && dragStart != null && dragEnd != null) {
      const lo = Math.min(dragStart, dragEnd);
      const hi = Math.max(dragStart, dragEnd);
      if (hi - lo >= 3) {
        const baseOffset = zoomRange ? zoomRange[0] : 0;
        setZoomRange([baseOffset + lo, baseOffset + hi]);
      }
    }
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const handlePointerLeave = () => {
    setHoverIdx(null);
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
    }
  };

  // Pinch to zoom (mobile)
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { dist: Math.sqrt(dx * dx + dy * dy) };
    } else if (e.touches.length === 1) {
      const idx = getIdxFromX(e.touches[0].clientX);
      setHoverIdx(idx);
      setIsScrubbing(true);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);
      const scale = newDist / pinchRef.current.dist;
      if (scale > 1.3 && !zoomRange) {
        const quarter = Math.floor(data.length / 4);
        setZoomRange([quarter, data.length - quarter]);
      } else if (scale < 0.7 && zoomRange) {
        setZoomRange(null);
      }
      pinchRef.current.dist = newDist;
    } else if (e.touches.length === 1 && isScrubbing) {
      const idx = getIdxFromX(e.touches[0].clientX);
      setHoverIdx(idx);
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setTooltipPos({
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        });
      }
    }
  };

  const handleTouchEnd = () => {
    pinchRef.current = null;
    if (isScrubbing) {
      setTimeout(() => {
        setHoverIdx(null);
        setIsScrubbing(false);
      }, 1500);
    }
  };

  const hoverPt = hoverIdx != null ? viewData[hoverIdx] : null;
  const hoverX = hoverIdx != null ? toX(hoverIdx, viewData.length) : 0;
  const hoverY = hoverIdx != null ? toY(hoverPt.v) : 0;

  // Determine area fill color based on buy-in
  const lastPrice = viewData.length > 0 ? viewData[viewData.length - 1].v : 0;
  const isAboveBuyIn = buyInPrice != null ? lastPrice >= buyInPrice : true;

  // Zoom selection overlay
  const selectionLeft =
    isDragging && dragStart != null && dragEnd != null
      ? toX(Math.min(dragStart, dragEnd), viewData.length)
      : 0;
  const selectionRight =
    isDragging && dragStart != null && dragEnd != null
      ? toX(Math.max(dragStart, dragEnd), viewData.length)
      : 0;

  const uniqueId = `chart-${artistId}-${mode}`;

  return (
    <div style={{ position: "relative", userSelect: "none" }}>
      {/* Controls row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        {/* Mode toggle */}
        <div
          style={{
            display: "inline-flex",
            gap: 1,
            background: "rgba(0,0,0,0.04)",
            borderRadius: 8,
            padding: 2,
          }}
        >
          {[
            { key: "line", label: "Line" },
            { key: "candlestick", label: "Candles" },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: "none",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                background: mode === m.key ? "#fff" : "transparent",
                color: mode === m.key ? C.text : C.textMuted,
                boxShadow:
                  mode === m.key ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.15s",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Zoom reset */}
        {zoomRange && (
          <button
            onClick={() => setZoomRange(null)}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: `1px solid ${C.primary}30`,
              background: `${C.primary}10`,
              color: C.primary,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              transition: "all 0.15s",
            }}
          >
            Reset Zoom
          </button>
        )}

        {/* Legend for comparison */}
        {comparisonData && (
          <div style={{ display: "flex", gap: 12, fontSize: 11, fontWeight: 600 }}>
            {label && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span
                  style={{
                    width: 10,
                    height: 3,
                    borderRadius: 2,
                    background: color,
                    display: "inline-block",
                  }}
                />
                {label}
              </span>
            )}
            {comparisonLabel && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span
                  style={{
                    width: 10,
                    height: 3,
                    borderRadius: 2,
                    background: comparisonColor,
                    display: "inline-block",
                  }}
                />
                {comparisonLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Chart container */}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: "100%",
          cursor: isDragging ? "col-resize" : "crosshair",
          touchAction: "none",
        }}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", height: H, display: "block" }}
        >
          <defs>
            {/* Area gradient - dynamic color */}
            <linearGradient
              id={`${uniqueId}-area-green`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={C.green} stopOpacity="0.25" />
              <stop offset="100%" stopColor={C.green} stopOpacity="0" />
            </linearGradient>
            <linearGradient
              id={`${uniqueId}-area-red`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={C.red} stopOpacity="0.25" />
              <stop offset="100%" stopColor={C.red} stopOpacity="0" />
            </linearGradient>
            <linearGradient
              id={`${uniqueId}-area-default`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
            {/* Clip paths for buy-in split */}
            {buyInY != null && (
              <>
                <clipPath id={`${uniqueId}-clip-above`}>
                  <rect x="0" y="0" width={W} height={buyInY} />
                </clipPath>
                <clipPath id={`${uniqueId}-clip-below`}>
                  <rect x="0" y={buyInY} width={W} height={H - buyInY} />
                </clipPath>
              </>
            )}
          </defs>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((frac) => (
            <line
              key={frac}
              x1={PAD.left}
              y1={PAD.top + frac * chartH}
              x2={W - PAD.right}
              y2={PAD.top + frac * chartH}
              stroke="rgba(0,0,0,0.04)"
              strokeWidth="1"
            />
          ))}

          {/* Buy-in price line */}
          {buyInY != null && buyInY >= PAD.top && buyInY <= PAD.top + chartH && (
            <line
              x1={PAD.left}
              y1={buyInY}
              x2={W - PAD.right}
              y2={buyInY}
              stroke={C.textMuted}
              strokeWidth="1"
              strokeDasharray="4 3"
              opacity="0.5"
            />
          )}

          {mode === "line" ? (
            <>
              {/* Area fill */}
              {buyInPrice != null ? (
                <>
                  <path
                    d={areaPathFull}
                    fill={`url(#${uniqueId}-area-green)`}
                    clipPath={`url(#${uniqueId}-clip-above)`}
                  />
                  <path
                    d={areaPathFull}
                    fill={`url(#${uniqueId}-area-red)`}
                    clipPath={`url(#${uniqueId}-clip-below)`}
                  />
                </>
              ) : (
                <path
                  d={areaPathFull}
                  fill={`url(#${uniqueId}-area-${isAboveBuyIn ? "green" : "red"})`}
                />
              )}

              {/* Main line */}
              <path
                d={linePath}
                fill="none"
                stroke={buyInPrice != null ? (isAboveBuyIn ? C.green : C.red) : color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* End dot */}
              <circle
                cx={pts[pts.length - 1]?.x}
                cy={pts[pts.length - 1]?.y}
                r="4"
                fill={buyInPrice != null ? (isAboveBuyIn ? C.green : C.red) : color}
              />
              <circle
                cx={pts[pts.length - 1]?.x}
                cy={pts[pts.length - 1]?.y}
                r="8"
                fill={buyInPrice != null ? (isAboveBuyIn ? C.green : C.red) : color}
                fillOpacity="0.2"
              />

              {/* Comparison line */}
              {comparisonData && compPts.length > 0 && (
                <>
                  <path
                    d={compLinePath}
                    fill="none"
                    stroke={comparisonColor}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="6 3"
                    opacity="0.8"
                  />
                  <circle
                    cx={compPts[compPts.length - 1]?.x}
                    cy={compPts[compPts.length - 1]?.y}
                    r="3"
                    fill={comparisonColor}
                  />
                </>
              )}
            </>
          ) : (
            /* Candlestick mode */
            ohlcData.map((candle, i) => {
              const x = toX(i, ohlcData.length);
              const barW = Math.max(6, chartW / ohlcData.length * 0.65);
              const isGreen = candle.close >= candle.open;
              const bodyTop = toY(Math.max(candle.open, candle.close));
              const bodyBottom = toY(Math.min(candle.open, candle.close));
              const bodyH = Math.max(2, bodyBottom - bodyTop);
              const wickTop = toY(candle.high);
              const wickBottom = toY(candle.low);
              const candleColor = isGreen ? C.green : C.red;
              const isHovered = hoverIdx === i;

              return (
                <g key={i} opacity={isHovered ? 1 : 0.85} style={{ transition: "opacity 0.1s" }}>
                  {/* Hover glow */}
                  {isHovered && (
                    <rect
                      x={x - barW / 2 - 3}
                      y={wickTop - 3}
                      width={barW + 6}
                      height={wickBottom - wickTop + 6}
                      rx={4}
                      fill={`${candleColor}10`}
                      stroke={candleColor}
                      strokeWidth={0.5}
                      strokeOpacity={0.4}
                    />
                  )}
                  {/* Wick */}
                  <line
                    x1={x}
                    y1={wickTop}
                    x2={x}
                    y2={wickBottom}
                    stroke={candleColor}
                    strokeWidth={isHovered ? 2 : 1.5}
                  />
                  {/* Body */}
                  <rect
                    x={x - barW / 2}
                    y={bodyTop}
                    width={barW}
                    height={bodyH}
                    rx={2}
                    fill={isGreen ? `${candleColor}40` : candleColor}
                    stroke={candleColor}
                    strokeWidth={isHovered ? 1.5 : 1}
                  />
                </g>
              );
            })
          )}

          {/* Zoom selection overlay */}
          {isDragging &&
            dragStart != null &&
            dragEnd != null &&
            Math.abs(dragEnd - dragStart) > 1 && (
              <rect
                x={selectionLeft}
                y={PAD.top}
                width={selectionRight - selectionLeft}
                height={chartH}
                fill={`${C.primary}15`}
                stroke={C.primary}
                strokeWidth="1"
                strokeDasharray="4 2"
                rx="4"
              />
            )}

          {/* Scrubber line */}
          {hoverIdx != null && hoverPt && (
            <>
              <line
                x1={hoverX}
                y1={PAD.top}
                x2={hoverX}
                y2={PAD.top + chartH}
                stroke={C.textMuted}
                strokeWidth="1"
                strokeDasharray="3 2"
                opacity="0.6"
              />
              <circle cx={hoverX} cy={hoverY} r="5" fill={color} />
              <circle
                cx={hoverX}
                cy={hoverY}
                r="9"
                fill={color}
                fillOpacity="0.15"
              />
              {/* Comparison scrubber dot */}
              {comparisonData && compPts[hoverIdx] && (
                <circle
                  cx={compPts[hoverIdx].x}
                  cy={compPts[hoverIdx].y}
                  r="4"
                  fill={comparisonColor}
                />
              )}
            </>
          )}
        </svg>

        {/* Tooltip */}
        {hoverIdx != null && hoverPt && (
          <div
            style={{
              position: "absolute",
              left: Math.min(
                tooltipPos.x - 60,
                containerWidth - 140
              ),
              top: -8,
              transform: "translateY(-100%)",
              background: "rgba(17,24,39,0.92)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderRadius: 10,
              padding: "8px 12px",
              pointerEvents: "none",
              zIndex: 10,
              minWidth: 120,
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.5)",
                marginBottom: 3,
                fontFamily: "monospace",
              }}
            >
              {typeof hoverPt.d === "string"
                ? hoverPt.d
                : `Day ${hoverPt.d + 1}`}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#fff",
                letterSpacing: "-0.02em",
              }}
            >
              ${hoverPt.v.toFixed(2)}
            </div>
            {mode === "candlestick" && ohlcData[hoverIdx] && (
              <div style={{
                display: "flex", gap: 8, fontSize: 10, marginTop: 4,
                borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 4,
              }}>
                <span style={{ color: C.green }}>O: ${ohlcData[hoverIdx].open.toFixed(2)}</span>
                <span style={{ color: "rgba(255,255,255,0.6)" }}>H: ${ohlcData[hoverIdx].high.toFixed(2)}</span>
                <span style={{ color: "rgba(255,255,255,0.6)" }}>L: ${ohlcData[hoverIdx].low.toFixed(2)}</span>
                <span style={{ color: ohlcData[hoverIdx].close >= ohlcData[hoverIdx].open ? C.green : C.red }}>C: ${ohlcData[hoverIdx].close.toFixed(2)}</span>
              </div>
            )}
            {hoverPt.vol && (
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.5)",
                  marginTop: 2,
                }}
              >
                Vol: {hoverPt.vol}
              </div>
            )}
            {comparisonData && comparisonData[hoverIdx] && (
              <div
                style={{
                  fontSize: 11,
                  color: comparisonColor,
                  marginTop: 4,
                  fontWeight: 600,
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                  paddingTop: 4,
                }}
              >
                {comparisonLabel}: ${comparisonData[hoverIdx].v.toFixed(2)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zoom hint text */}
      {!zoomRange && (
        <div
          style={{
            fontSize: 10,
            color: C.textMuted,
            textAlign: "center",
            marginTop: 6,
            opacity: 0.6,
          }}
        >
          Drag to select range · Hover to scrub
        </div>
      )}
    </div>
  );
}
