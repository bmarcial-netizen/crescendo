import { useState, useEffect, useMemo } from "react";
import { AlertTriangle, Play, Disc3, Clock, ExternalLink, Music, TrendingUp, TrendingDown } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import * as api from "./api";
import EarningsBand from "./EarningsBand";
import { formatNumber, formatPctChange, GENRE_MAP } from "./colors";
import { getTicker } from "./CrescendoDashboard";

// ─── Artist Detail / Invest Modal ─── glassmorphic slide-in panel ───

const C = {
    bg: "#E8EEF8",
    card: "rgba(255,255,255,0.72)",
    border: "rgba(255,255,255,0.9)",
    shadow: "0 2px 24px rgba(0,0,0,0.04), 0 0 0 1px rgba(255,255,255,0.8)",
    primary: "#1E40AF",
    accent: "#38BDF8",
    accentDark: "#0EA5E9",
    green: "#36D7B7",
    greenSoft: "rgba(54,215,183,0.1)",
    red: "#EF4444",
    redSoft: "rgba(239,68,68,0.1)",
    text: "#0F172A",
    textSec: "#475569",
    textMuted: "#94A3B8",
};

// Avatar helper
function avatarUrl(name, size = 64) {
    const colors = ["1E40AF", "38BDF8", "0EA5E9", "3B82F6", "60A5FA", "1D4ED8"];
    const idx = name.length % colors.length;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=${size}&background=${colors[idx]}&color=fff&bold=true&format=svg`;
}

// No more random generators — all data comes from backend API

// Deterministic order book from bid/ask (no Math.random)
function generateOrderBook(bid, ask) {
    const bids = [];
    const asks = [];
    const spread = Math.max(0.01, ask - bid);
    for (let i = 0; i < 5; i++) {
        const bidPrice = bid - i * (spread * 0.3);
        const askPrice = ask + i * (spread * 0.3);
        // Deterministic quantities based on level
        bids.push({ price: Math.max(0.01, bidPrice).toFixed(2), qty: 200 - i * 30 });
        asks.push({ price: askPrice.toFixed(2), qty: 150 - i * 20 });
    }
    return { bids, asks };
}

// ─── Artist images map (placeholder keys — swap with real uploaded images) ───
const artistImages = {};

// ─── Marquee items per artist (swap src with real images: drop into public/artists/) ───
const marqueeItems = {
    "2hollis": [
        { label: "Phantom Thread", type: "album" },
        { label: "2hollis Live", type: "artist" },
        { label: "Vapor Trail", type: "album" },
        { label: "Studio Session", type: "artist" },
        { label: "Early Works", type: "album" },
        { label: "2hollis Press", type: "artist" },
    ],
    "Snow Strippers": [
        { label: "Neon Vein", type: "album" },
        { label: "Snow Strippers Live", type: "artist" },
        { label: "Wired", type: "album" },
        { label: "Brooklyn Show", type: "artist" },
        { label: "Debut EP", type: "album" },
        { label: "Snow Strippers Press", type: "artist" },
    ],
    "malcolm todd": [
        { label: "Soft Focus", type: "album" },
        { label: "malcolm todd Live", type: "artist" },
        { label: "Velvet", type: "album" },
        { label: "SXSW 2026", type: "artist" },
        { label: "Early Demos", type: "album" },
        { label: "malcolm todd Press", type: "artist" },
    ],
    "Men I Trust": [
        { label: "Headroom", type: "album" },
        { label: "Men I Trust Live", type: "artist" },
        { label: "Untourable Album", type: "album" },
        { label: "Pitchfork 2026", type: "artist" },
        { label: "Oncle Jazz", type: "album" },
        { label: "Men I Trust Press", type: "artist" },
    ],
    "King Krule": [
        { label: "Concrete Garden", type: "album" },
        { label: "King Krule Live", type: "artist" },
        { label: "Space Heavy", type: "album" },
        { label: "London Show", type: "artist" },
        { label: "The OOZ", type: "album" },
        { label: "King Krule Press", type: "artist" },
    ],
    "iann dior": [
        { label: "RUNAWAY", type: "album" },
        { label: "iann dior Live", type: "artist" },
        { label: "Lo-fi Diaries", type: "album" },
        { label: "A24 Signing", type: "artist" },
        { label: "Early Works", type: "album" },
        { label: "iann dior Press", type: "artist" },
    ],
};

// ─── Top Tracks per artist (keys must match DB stageName exactly) ───
const topTracks = {
    // Original 5 (real data artists)
    "EsDeeKid": [
        { title: "Midnight Run", duration: "3:45", streams: "18.2M", album: "Neon Dreams" },
        { title: "Static", duration: "2:58", streams: "14.7M", album: "Neon Dreams" },
        { title: "Echoes", duration: "3:22", streams: "11.3M", album: "Frequency" },
        { title: "Low Key", duration: "4:01", streams: "9.8M", album: "Frequency" },
        { title: "Drift", duration: "3:15", streams: "7.4M", album: "Neon Dreams" },
    ],
    "beabadoobee": [
        { title: "Glue Song", duration: "2:37", streams: "520M", album: "Beatopia" },
        { title: "The Perfect Pair", duration: "3:04", streams: "280M", album: "This Is How Tomorrow Moves" },
        { title: "Talking", duration: "3:52", streams: "95M", album: "This Is How Tomorrow Moves" },
        { title: "Coffee", duration: "3:28", streams: "410M", album: "Patched Up" },
        { title: "Fairy Song", duration: "2:44", streams: "72M", album: "Beatopia" },
    ],
    "jane remover": [
        { title: "Cage Girl", duration: "3:18", streams: "4.2M", album: "Census Designated" },
        { title: "Lips", duration: "2:52", streams: "3.8M", album: "Census Designated" },
        { title: "Movies For Guys", duration: "4:14", streams: "2.9M", album: "Census Designated" },
        { title: "Royal Blue Walls", duration: "3:35", streams: "2.1M", album: "Frailty" },
        { title: "Video", duration: "3:01", streams: "1.8M", album: "Census Designated" },
    ],
    "malcolm todd": [
        { title: "Amber Light", duration: "3:18", streams: "2.4M", album: "Soft Focus" },
        { title: "Honey", duration: "3:52", streams: "1.8M", album: "Soft Focus" },
        { title: "Velvet", duration: "2:44", streams: "1.1M", album: "Velvet (Single)" },
        { title: "Sunday Morning", duration: "4:08", streams: "890K", album: "Soft Focus" },
        { title: "Blue Hour", duration: "3:26", streams: "720K", album: "Early Demos" },
    ],
    "2hollis": [
        { title: "Dissolve", duration: "3:22", streams: "1.2M", album: "Phantom Thread" },
        { title: "Ghost Frequency", duration: "2:48", streams: "890K", album: "Phantom Thread" },
        { title: "Vapor Trail", duration: "4:01", streams: "720K", album: "Vapor Trail (Single)" },
        { title: "Liminal", duration: "3:35", streams: "650K", album: "Early Works" },
        { title: "Static Bloom", duration: "2:56", streams: "410K", album: "Early Works" },
    ],
    // Synthetic artists
    "Doechii": [
        { title: "What It Is", duration: "3:12", streams: "180M", album: "Alligator Bites Never Heal" },
        { title: "Persuasive", duration: "2:48", streams: "95M", album: "Alligator Bites Never Heal" },
        { title: "Crazy", duration: "3:35", streams: "62M", album: "Alligator Bites Never Heal" },
        { title: "Boom Bap", duration: "2:58", streams: "48M", album: "She / Her / Black Bitch" },
        { title: "Yucky Blucky Fruitcake", duration: "3:44", streams: "35M", album: "Oh the Places You'll Go" },
    ],
    "Leon Thomas": [
        { title: "Breaking Point", duration: "3:28", streams: "12M", album: "Electric Dusk" },
        { title: "X2", duration: "3:02", streams: "8.5M", album: "Electric Dusk" },
        { title: "Slow Motion", duration: "4:16", streams: "6.2M", album: "Electric Dusk" },
        { title: "Love Jones", duration: "3:44", streams: "4.8M", album: "Genesis" },
        { title: "Paradise", duration: "3:58", streams: "3.1M", album: "Genesis" },
    ],
    "iann dior": [
        { title: "Mood", duration: "2:22", streams: "2.1B", album: "On to Better Things" },
        { title: "Sick and Tired", duration: "2:42", streams: "180M", album: "On to Better Things" },
        { title: "Shots in the Dark", duration: "3:08", streams: "95M", album: "On to Better Things" },
        { title: "V12", duration: "2:55", streams: "72M", album: "Industry Plant" },
        { title: "Prospect", duration: "3:18", streams: "58M", album: "I'm Gone" },
    ],
    "Men I Trust": [
        { title: "Oncle Jazz", duration: "3:38", streams: "8.2M", album: "Oncle Jazz" },
        { title: "Norton Commander", duration: "3:14", streams: "6.1M", album: "Oncle Jazz" },
        { title: "Say, Can You Hear", duration: "4:22", streams: "5.4M", album: "Untourable Album" },
        { title: "Tailwhip", duration: "2:56", streams: "4.8M", album: "Oncle Jazz" },
        { title: "Billie Toppy", duration: "3:44", streams: "3.2M", album: "Headroom" },
    ],
    "Teezo Touchdown": [
        { title: "Technically", duration: "3:15", streams: "28M", album: "How Do You Sleep at Night?" },
        { title: "I'm Just a Fan", duration: "2:48", streams: "18M", album: "How Do You Sleep at Night?" },
        { title: "Social Cues", duration: "3:32", streams: "12M", album: "How Do You Sleep at Night?" },
        { title: "100 Drums", duration: "2:58", streams: "8.5M", album: "How Do You Sleep at Night?" },
        { title: "Bad Company", duration: "3:44", streams: "5.2M", album: "How Do You Sleep at Night?" },
    ],
    "Snow Strippers": [
        { title: "Pulse", duration: "3:44", streams: "3.8M", album: "Neon Vein" },
        { title: "Cold Circuit", duration: "3:12", streams: "2.1M", album: "Neon Vein" },
        { title: "Wired", duration: "2:58", streams: "1.9M", album: "Wired (Single)" },
        { title: "Fracture", duration: "4:15", streams: "1.4M", album: "Neon Vein" },
        { title: "Voltage", duration: "3:30", streams: "980K", album: "Debut EP" },
    ],
    "Yves Tumor": [
        { title: "Gospel for a New Century", duration: "4:02", streams: "32M", album: "Heaven to a Tortured Mind" },
        { title: "Kerosene!", duration: "3:28", streams: "18M", album: "Heaven to a Tortured Mind" },
        { title: "Jackie", duration: "3:52", streams: "12M", album: "Praise a Lord..." },
        { title: "Secrecy Is Incredibly Important to the Both of Them", duration: "4:35", streams: "8.4M", album: "Safe in the Hands of Love" },
        { title: "Operator", duration: "3:15", streams: "6.1M", album: "Praise a Lord..." },
    ],
    "JPEGMAFIA": [
        { title: "BALD!", duration: "2:45", streams: "42M", album: "All My Heroes Are Cornballs" },
        { title: "1539 N. Calvert", duration: "3:18", streams: "28M", album: "Veteran" },
        { title: "Thot Tactics", duration: "2:52", streams: "22M", album: "All My Heroes Are Cornballs" },
        { title: "HAZARD DUTY PAY!", duration: "2:38", streams: "18M", album: "LP!" },
        { title: "Baby I'm Bleeding", duration: "3:05", streams: "15M", album: "Veteran" },
    ],
    "King Krule": [
        { title: "Easy Easy", duration: "3:28", streams: "4.5M", album: "6 Feet Beneath the Moon" },
        { title: "Dum Surfer", duration: "3:02", streams: "3.8M", album: "The OOZ" },
        { title: "Stoned Again", duration: "4:16", streams: "2.9M", album: "Man Alive!" },
        { title: "Czech One", duration: "3:44", streams: "2.1M", album: "The OOZ" },
        { title: "Seaforth", duration: "3:58", streams: "1.7M", album: "Space Heavy" },
    ],
    "Paris Texas": [
        { title: "FORCE OF HABIT", duration: "2:52", streams: "5.2M", album: "MID AIR" },
        { title: "PANIC", duration: "2:38", streams: "3.8M", album: "MID AIR" },
        { title: "HEAVY METAL", duration: "3:14", streams: "2.9M", album: "Red Hand Akimbo" },
        { title: "BULLET", duration: "2:45", streams: "1.8M", album: "MID AIR" },
        { title: "SITUATIONS", duration: "3:22", streams: "1.2M", album: "Red Hand Akimbo" },
    ],
    "Feng Suave": [
        { title: "Sink into the Floor", duration: "3:35", streams: "8.5M", album: "So Much for Gardening" },
        { title: "People Watching", duration: "3:18", streams: "6.2M", album: "So Much for Gardening" },
        { title: "Venus Flytrap", duration: "4:01", streams: "4.1M", album: "Warping Youth" },
        { title: "Toking, Dozing", duration: "3:44", streams: "3.5M", album: "Warping Youth" },
        { title: "Maybe Another Time", duration: "3:12", streams: "2.8M", album: "So Much for Gardening" },
    ],
    "Dave Blunts": [
        { title: "On My Own", duration: "3:02", streams: "48M", album: "On My Own (Single)" },
        { title: "Never Left", duration: "3:28", streams: "12M", album: "Never Left (Single)" },
        { title: "Close to Me", duration: "3:44", streams: "8.5M", album: "Early Sessions" },
        { title: "Moving On", duration: "2:58", streams: "5.2M", album: "Early Sessions" },
        { title: "Cold Nights", duration: "3:15", streams: "3.1M", album: "Early Sessions" },
    ],
    "The Twolips": [
        { title: "Bloom", duration: "3:22", streams: "45K", album: "First Light" },
        { title: "Garden State", duration: "2:58", streams: "32K", album: "First Light" },
        { title: "Petal", duration: "3:44", streams: "28K", album: "First Light" },
        { title: "Willow", duration: "4:01", streams: "18K", album: "Demos" },
        { title: "Sunrise", duration: "3:15", streams: "12K", album: "Demos" },
    ],
};

// ─── Recent Releases per artist (keys must match DB stageName exactly) ───
const recentReleases = {
    "EsDeeKid": [
        { title: "Neon Dreams", type: "Album", year: "2026", tracks: 14, cover: null },
        { title: "Frequency", type: "Album", year: "2025", tracks: 11, cover: null },
        { title: "Late Nights", type: "EP", year: "2024", tracks: 6, cover: null },
    ],
    "beabadoobee": [
        { title: "This Is How Tomorrow Moves", type: "Album", year: "2024", tracks: 14, cover: null },
        { title: "Beatopia", type: "Album", year: "2022", tracks: 14, cover: null },
        { title: "Fake It Flowers", type: "Album", year: "2020", tracks: 12, cover: null },
    ],
    "jane remover": [
        { title: "Census Designated", type: "Album", year: "2023", tracks: 16, cover: null },
        { title: "Frailty", type: "Album", year: "2021", tracks: 11, cover: null },
        { title: "Fingers Crossed", type: "EP", year: "2020", tracks: 5, cover: null },
    ],
    "malcolm todd": [
        { title: "Soft Focus", type: "Album", year: "2026", tracks: 11, cover: null },
        { title: "Velvet", type: "Single", year: "2025", tracks: 1, cover: null },
        { title: "Early Demos", type: "EP", year: "2024", tracks: 7, cover: null },
    ],
    "2hollis": [
        { title: "Phantom Thread", type: "EP", year: "2026", tracks: 5, cover: null },
        { title: "Vapor Trail", type: "Single", year: "2025", tracks: 1, cover: null },
        { title: "Early Works", type: "Album", year: "2024", tracks: 10, cover: null },
    ],
    "Doechii": [
        { title: "Alligator Bites Never Heal", type: "Album", year: "2024", tracks: 19, cover: null },
        { title: "She / Her / Black Bitch", type: "EP", year: "2022", tracks: 6, cover: null },
        { title: "Oh the Places You'll Go", type: "EP", year: "2020", tracks: 7, cover: null },
    ],
    "Leon Thomas": [
        { title: "Electric Dusk", type: "Album", year: "2024", tracks: 14, cover: null },
        { title: "Genesis", type: "Album", year: "2023", tracks: 10, cover: null },
        { title: "Metro Vibes", type: "EP", year: "2022", tracks: 5, cover: null },
    ],
    "iann dior": [
        { title: "On to Better Things", type: "Album", year: "2022", tracks: 16, cover: null },
        { title: "Industry Plant", type: "Album", year: "2020", tracks: 17, cover: null },
        { title: "I'm Gone", type: "Album", year: "2019", tracks: 11, cover: null },
    ],
    "Men I Trust": [
        { title: "Headroom", type: "Album", year: "2026", tracks: 10, cover: null },
        { title: "Untourable Album", type: "Album", year: "2021", tracks: 14, cover: null },
        { title: "Oncle Jazz", type: "Album", year: "2019", tracks: 17, cover: null },
    ],
    "Teezo Touchdown": [
        { title: "How Do You Sleep at Night?", type: "Album", year: "2023", tracks: 15, cover: null },
        { title: "First Hand", type: "EP", year: "2022", tracks: 6, cover: null },
        { title: "Did You Get the Message?", type: "EP", year: "2021", tracks: 5, cover: null },
    ],
    "Snow Strippers": [
        { title: "Neon Vein", type: "Album", year: "2026", tracks: 12, cover: null },
        { title: "Wired", type: "Single", year: "2025", tracks: 1, cover: null },
        { title: "Debut EP", type: "EP", year: "2024", tracks: 6, cover: null },
    ],
    "Yves Tumor": [
        { title: "Praise a Lord Who Chews but Which Does Not Consume", type: "Album", year: "2023", tracks: 12, cover: null },
        { title: "Heaven to a Tortured Mind", type: "Album", year: "2020", tracks: 13, cover: null },
        { title: "Safe in the Hands of Love", type: "Album", year: "2018", tracks: 13, cover: null },
    ],
    "JPEGMAFIA": [
        { title: "I LAY DOWN MY LIFE FOR YOU", type: "Album", year: "2024", tracks: 15, cover: null },
        { title: "LP!", type: "Album", year: "2021", tracks: 18, cover: null },
        { title: "All My Heroes Are Cornballs", type: "Album", year: "2019", tracks: 18, cover: null },
    ],
    "King Krule": [
        { title: "Space Heavy", type: "Album", year: "2023", tracks: 10, cover: null },
        { title: "Man Alive!", type: "Album", year: "2020", tracks: 14, cover: null },
        { title: "The OOZ", type: "Album", year: "2017", tracks: 19, cover: null },
    ],
    "Paris Texas": [
        { title: "MID AIR", type: "Album", year: "2023", tracks: 12, cover: null },
        { title: "Red Hand Akimbo", type: "EP", year: "2022", tracks: 7, cover: null },
        { title: "BOY ANONYMOUS", type: "EP", year: "2021", tracks: 6, cover: null },
    ],
    "Feng Suave": [
        { title: "So Much for Gardening", type: "Album", year: "2023", tracks: 10, cover: null },
        { title: "Warping Youth", type: "EP", year: "2019", tracks: 6, cover: null },
        { title: "Venus Flytrap", type: "Single", year: "2018", tracks: 1, cover: null },
    ],
    "Dave Blunts": [
        { title: "On My Own", type: "Single", year: "2025", tracks: 1, cover: null },
        { title: "Never Left", type: "Single", year: "2024", tracks: 1, cover: null },
        { title: "Early Sessions", type: "EP", year: "2024", tracks: 5, cover: null },
    ],
    "The Twolips": [
        { title: "First Light", type: "EP", year: "2025", tracks: 4, cover: null },
        { title: "Demos", type: "EP", year: "2024", tracks: 3, cover: null },
    ],
};

function InteractivePriceChart({ data, color, width = "100%", height = 140 }) {
    const [hover, setHover] = useState(null);
    const max = Math.max(...data.map(d => d.v));
    const min = Math.min(...data.map(d => d.v));
    const range = max - min || 0.01;
    const w = 400;
    const h = height;
    const pts = data.map((d, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = 8 + (1 - (d.v - min) / range) * (h - 16);
        return { x, y, v: d.v, d: d.d };
    });
    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const area = line + ` L${pts[pts.length - 1].x.toFixed(1)},${h} L${pts[0].x.toFixed(1)},${h} Z`;

    const handleMouseMove = (e) => {
        const svg = e.currentTarget;
        const rect = svg.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * w;
        let closest = 0;
        let closestDist = Infinity;
        pts.forEach((p, i) => {
            const dist = Math.abs(p.x - mouseX);
            if (dist < closestDist) { closestDist = dist; closest = i; }
        });
        setHover(closest);
    };

    const hp = hover !== null ? pts[hover] : null;
    const dayLabel = hp ? (typeof hp.d === "string" && hp.d.match(/^\d{4}-\d{2}-\d{2}$/)
        ? new Date(hp.d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : `Day ${(hp.d || 0) + 1}`) : "";

    return (
        <svg
            viewBox={`0 0 ${w} ${h}`}
            style={{ width, height, display: "block", cursor: "crosshair" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHover(null)}
        >
            <defs>
                <linearGradient id={`chart-fill-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={area} fill={`url(#chart-fill-${color.replace("#", "")})`} />
            <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="4" fill={color} />
            <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="8" fill={color} fillOpacity="0.2" />
            {hp && (
                <>
                    <line x1={hp.x} y1={0} x2={hp.x} y2={h} stroke={color} strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
                    <line x1={0} y1={hp.y} x2={w} y2={hp.y} stroke={color} strokeWidth="1" strokeDasharray="3,3" opacity="0.3" />
                    <circle cx={hp.x} cy={hp.y} r="5" fill={color} />
                    <circle cx={hp.x} cy={hp.y} r="9" fill={color} fillOpacity="0.2" />
                    <rect x={Math.min(hp.x + 8, w - 90)} y={Math.max(hp.y - 32, 2)} width="82" height="26" rx="6" fill="rgba(15,23,42,0.88)" />
                    <text x={Math.min(hp.x + 14, w - 84)} y={Math.max(hp.y - 14, 18)} fill="#fff" fontSize="10" fontFamily="monospace" fontWeight="600">
                        ${hp.v.toFixed(2)} · {dayLabel}
                    </text>
                </>
            )}
        </svg>
    );
}

// Interactive dual-axis traction chart
function InteractiveTractionChart({ data, width = "100%", height = 120 }) {
    const [hover, setHover] = useState(null);
    const w = 400;
    const h = height;
    const scoreMax = Math.max(...data.map(d => d.score));
    const scoreMin = Math.min(...data.map(d => d.score));
    const priceMax = Math.max(...data.map(d => d.price));
    const priceMin = Math.min(...data.map(d => d.price));
    const scoreRange = scoreMax - scoreMin || 1;
    const priceRange = priceMax - priceMin || 0.01;

    const scorePtsArr = data.map((d, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = 8 + (1 - (d.score - scoreMin) / scoreRange) * (h - 16);
        return { x, y, score: d.score, price: d.price };
    });
    const pricePtsArr = data.map((d, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = 8 + (1 - (d.price - priceMin) / priceRange) * (h - 16);
        return { x, y };
    });

    const scorePtsStr = scorePtsArr.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const pricePtsStr = pricePtsArr.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

    const handleMouseMove = (e) => {
        const svg = e.currentTarget;
        const rect = svg.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * w;
        let closest = 0;
        let closestDist = Infinity;
        scorePtsArr.forEach((p, i) => {
            const dist = Math.abs(p.x - mouseX);
            if (dist < closestDist) { closestDist = dist; closest = i; }
        });
        setHover(closest);
    };

    const hp = hover !== null ? scorePtsArr[hover] : null;
    const hpPrice = hover !== null ? pricePtsArr[hover] : null;

    return (
        <svg
            viewBox={`0 0 ${w} ${h}`}
            style={{ width, height, display: "block", cursor: "crosshair" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHover(null)}
        >
            <polyline fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={scorePtsStr} opacity="0.8" />
            <polyline fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pricePtsStr} opacity="0.8" />
            {hp && hpPrice && (
                <>
                    <line x1={hp.x} y1={0} x2={hp.x} y2={h} stroke={C.textMuted} strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
                    <circle cx={hp.x} cy={hp.y} r="4" fill={C.primary} />
                    <circle cx={hp.x} cy={hpPrice.y} r="4" fill={C.accent} />
                    <rect x={Math.min(hp.x + 8, w - 120)} y={Math.max(Math.min(hp.y, hpPrice.y) - 38, 2)} width="112" height="34" rx="6" fill="rgba(15,23,42,0.88)" />
                    <text x={Math.min(hp.x + 14, w - 114)} y={Math.max(Math.min(hp.y, hpPrice.y) - 20, 16)} fill={C.accent} fontSize="9" fontFamily="monospace" fontWeight="600">
                        Score: {hp.score}
                    </text>
                    <text x={Math.min(hp.x + 14, w - 114)} y={Math.max(Math.min(hp.y, hpPrice.y) - 8, 28)} fill="#60A5FA" fontSize="9" fontFamily="monospace" fontWeight="600">
                        Price: ${hp.price.toFixed(2)}
                    </text>
                </>
            )}
        </svg>
    );
}

// ─── Marquee Component ───
function ArtistMarquee({ artistName }) {
    const items = marqueeItems[artistName] || marqueeItems["Steve Lacy"] || [];
    if (!items.length) return null;
    // Gradient colors for placeholder album/artist art
    const gradients = [
        "linear-gradient(135deg, #1E40AF, #38BDF8)",
        "linear-gradient(135deg, #0F172A, #1E40AF)",
        "linear-gradient(135deg, #38BDF8, #0EA5E9)",
        "linear-gradient(135deg, #1D4ED8, #60A5FA)",
        "linear-gradient(135deg, #0F172A, #38BDF8)",
        "linear-gradient(135deg, #3B82F6, #1E40AF)",
    ];
    // Duplicate items for seamless loop
    const duped = [...items, ...items];
    return (
        <div style={{ overflow: "hidden", marginBottom: 20, marginLeft: -32, marginRight: -32, position: "relative" }}>
            <style>{`
                @keyframes marqueeScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
            `}</style>
            {/* Fade edges */}
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 40, zIndex: 2, background: "linear-gradient(90deg, rgba(240,243,250,0.97), transparent)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 40, zIndex: 2, background: "linear-gradient(270deg, rgba(240,243,250,0.97), transparent)", pointerEvents: "none" }} />
            <div style={{
                display: "flex", gap: 12,
                animation: "marqueeScroll 20s linear infinite",
                width: "max-content",
            }}>
                {duped.map((item, i) => (
                    <div key={i} style={{
                        width: 120, height: 120, borderRadius: item.type === "artist" ? 60 : 14,
                        background: gradients[i % gradients.length],
                        display: "flex", alignItems: "flex-end", justifyContent: "center",
                        overflow: "hidden", flexShrink: 0, position: "relative",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
                        border: "1px solid rgba(255,255,255,0.3)",
                    }}>
                        <span style={{
                            fontSize: 10, fontWeight: 600, color: "#fff",
                            padding: "4px 8px 6px", textAlign: "center",
                            width: "100%",
                            background: "linear-gradient(transparent, rgba(0,0,0,0.5))",
                            letterSpacing: "0.02em",
                        }}>{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function ArtistDetailModal({ artist, onClose, allNews, trendingSounds, isLoggedIn, auth, onTradeComplete }) {
    const [orderType, setOrderType] = useState(artist?._defaultSell ? "sell" : "buy");
    const [orderMode, setOrderMode] = useState("market");
    const [qty, setQty] = useState("");
    const [limitPrice, setLimitPrice] = useState(artist?.price?.toFixed(2) || "");
    const [showConfirm, setShowConfirm] = useState(false);
    const [orderPlaced, setOrderPlaced] = useState(false);
    const [visible, setVisible] = useState(false);
    const [chartPeriod, setChartPeriod] = useState("1M");
    const [showTraction, setShowTraction] = useState(false);
    const [tradeError, setTradeError] = useState("");
    const [tradeLoading, setTradeLoading] = useState(false);
    const [liveQuote, setLiveQuote] = useState(null);
    const [metricsData, setMetricsData] = useState([]);
    const [metricsLoading, setMetricsLoading] = useState(false);
    const [activeMetric, setActiveMetric] = useState("spotifyMonthlyListeners");
    const [apiCandles, setApiCandles] = useState([]);
    const [analysisData, setAnalysisData] = useState(null);

    useEffect(() => {
        if (artist) {
            requestAnimationFrame(() => setVisible(true));
            setOrderType(artist._defaultSell ? "sell" : "buy");
            setQty("");
            setShowConfirm(false);
            setOrderPlaced(false);
            setTradeError("");
            setLimitPrice(artist.price?.toFixed(2) || "0.00");
            setShowTraction(false);
            setLiveQuote(null);
            setMetricsData([]);
            setApiCandles([]);
            setAnalysisData(null);
            api.getQuote(artist.id).then(q => setLiveQuote(q)).catch(() => {});
            // Fetch real metrics if artist has a symbol — get all available data
            if (artist.symbol) {
                setMetricsLoading(true);
                api.getMetrics(artist.symbol)
                    .then(data => { setMetricsData(data || []); })
                    .catch(() => {})
                    .finally(() => setMetricsLoading(false));
            }
            // Fetch daily candles from API (deterministic, no randomness)
            api.getDailyCandles(artist.id).then(candles => {
                setApiCandles(candles || []);
            }).catch(() => setApiCandles([]));
            // Fetch financial analysis
            api.getFinancialAnalysis(artist.id).then(data => {
                setAnalysisData(data);
            }).catch(() => setAnalysisData(null));
        } else {
            setVisible(false);
        }
    }, [artist]);

    // Time period filter for metrics
    const filteredMetrics = useMemo(() => {
        if (!metricsData.length) return [];
        const now = new Date();
        const periodDays = { "1M": 30, "2W": 14, "1W": 7, "5D": 5, "1D": 1 };
        const days = periodDays[chartPeriod] || 30;
        const cutoff = new Date(now.getTime() - days * 86400000);
        return metricsData.filter(m => {
            const d = new Date(m.capturedAt || m.snapshotDate || m.createdAt);
            return d >= cutoff;
        }).map(m => ({
            ...m,
            date: new Date(m.capturedAt || m.snapshotDate || m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        }));
    }, [metricsData, chartPeriod]);

    // Growth analytics: compare first and last metric snapshot
    const growthAnalytics = useMemo(() => {
        if (metricsData.length < 2) return null;
        const first = metricsData[0];
        const last = metricsData[metricsData.length - 1];
        const metrics = [
            { key: "spotifyMonthlyListeners", label: "Monthly Listeners" },
            { key: "spotifyFollowers", label: "Spotify Followers" },
            { key: "playlistReach", label: "Playlist Reach" },
            { key: "tiktokFollowers", label: "TikTok Followers" },
            { key: "instagramFollowers", label: "Instagram Followers" },
            { key: "youtubeSubscribers", label: "YouTube Subs" },
        ];
        return metrics.map(m => {
            const oldVal = first[m.key];
            const newVal = last[m.key];
            if (oldVal == null || newVal == null) return null;
            const change = formatPctChange(newVal, oldVal);
            return { ...m, current: newVal, previous: oldVal, change };
        }).filter(Boolean);
    }, [metricsData]);

    // Compute volatility from metrics
    const volatilityEstimate = useMemo(() => {
        if (metricsData.length < 3) return null;
        const listeners = metricsData.map(m => m.spotifyMonthlyListeners).filter(v => v != null && v > 0);
        if (listeners.length < 3) return null;
        const pctChanges = [];
        for (let i = 1; i < listeners.length; i++) {
            pctChanges.push((listeners[i] - listeners[i-1]) / listeners[i-1]);
        }
        const mean = pctChanges.reduce((a, b) => a + b, 0) / pctChanges.length;
        const variance = pctChanges.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / pctChanges.length;
        return (Math.sqrt(variance) * 100).toFixed(1);
    }, [metricsData]);

    if (!artist) return null;

    const displayPrice = liveQuote?.mid || artist.price || 0;
    const displayBid = liveQuote?.bid || artist.price || 0;
    const displayAsk = liveQuote?.ask || artist.price || 0;

    // Convert API candles to chart data format (deterministic, no randomness)
    const priceHistory = apiCandles.length > 0
        ? apiCandles.map(c => ({ d: c.t, v: c.c }))
        : [{ d: "now", v: displayPrice }];
    const tractionHistory = apiCandles.length > 0
        ? apiCandles.map((c, i) => ({ d: c.t, score: 50, price: c.c }))
        : [{ d: 0, score: 50, price: displayPrice }];
    const orderBook = generateOrderBook(displayBid, displayAsk);
    const artistChange = artist.change || 0;
    const artistPrice = displayPrice;
    const isUp = artistChange >= 0;
    const changeColor = isUp ? C.green : C.red;
    const chartColor = isUp ? C.green : C.red;
    const isTripped = artist.circuitBreakerStatus === "tripped";

    const quantity = parseInt(qty) || 0;
    const unitPrice = orderMode === "limit" ? parseFloat(limitPrice) || artistPrice : (orderType === "buy" ? displayAsk : displayBid);
    const totalCost = quantity * unitPrice;
    const artistNews = (allNews || []).filter(n => n.artist === artist.name);
    const artistSounds = (trendingSounds || []).filter(s => s.artist === artist.name);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 350);
    };

    const handlePlaceOrder = async () => {
        setTradeError("");
        if (!isLoggedIn) {
            setTradeError("Please log in to trade.");
            return;
        }
        setTradeLoading(true);
        try {
            if (orderType === "buy") {
                await api.buyShares(artist.id, quantity);
            } else {
                await api.sellShares(artist.id, quantity);
            }
            setOrderPlaced(true);
            if (onTradeComplete) onTradeComplete();
            setTimeout(() => {
                setOrderPlaced(false);
                setShowConfirm(false);
                setQty("");
            }, 2500);
        } catch (err) {
            setTradeError(err.message || "Trade failed. Please try again.");
            setShowConfirm(false);
        } finally {
            setTradeLoading(false);
        }
    };

    // Simulated extra data
    const marketCap = (artistPrice * (120000 + artist.id * 35000)).toLocaleString();
    const weekHigh = (artistPrice * (1 + Math.abs(artistChange) / 200 + 0.05)).toFixed(2);
    const weekLow = (artistPrice * (1 - Math.abs(artistChange) / 300 - 0.03)).toFixed(2);
    const avgVol = parseFloat(artist.volume || "0").toFixed(1) + "K";

    // Supply data
    const supplyPct = artist.sharesOutstanding && artist.maxShares
        ? Math.min(artist.sharesOutstanding / artist.maxShares * 100, 100)
        : 0;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={handleClose}
                style={{
                    position: "fixed", inset: 0, zIndex: 200,
                    background: "rgba(15,23,42,0.35)",
                    backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
                    opacity: visible ? 1 : 0,
                    transition: "opacity 0.35s cubic-bezier(0.22,1,0.36,1)",
                }}
            />

            {/* Slide-in Panel */}
            <div style={{
                position: "fixed", top: 0, right: 0, bottom: 0,
                width: "min(680px, 90vw)",
                zIndex: 201,
                background: "rgba(240,243,250,0.97)",
                backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
                borderLeft: "1px solid rgba(255,255,255,0.6)",
                boxShadow: "-8px 0 40px rgba(0,0,0,0.08)",
                transform: visible ? "translateX(0)" : "translateX(100%)",
                transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1)",
                overflowY: "auto",
                overflowX: "hidden",
                fontFamily: "'Inter', sans-serif",
                letterSpacing: "-0.02em",
                lineHeight: 1.35,
            }}>

                {/* Close button */}
                <button
                    onClick={handleClose}
                    style={{
                        position: "sticky", top: 16, right: 16, float: "right",
                        width: 36, height: 36, borderRadius: 10,
                        background: "rgba(255,255,255,0.7)",
                        border: "1px solid rgba(255,255,255,0.9)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 18, cursor: "pointer", zIndex: 10,
                        color: C.textSec,
                        marginRight: 20, marginTop: 16,
                        boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
                    }}
                >✕</button>

                <div style={{ padding: "28px 32px 40px" }}>

                    {/* ─── CIRCUIT BREAKER WARNING (info only, doesn't block) ─── */}
                    {isTripped && (
                        <div style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                            borderRadius: 14, marginBottom: 16,
                            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                            color: C.red, fontSize: 13, fontWeight: 600
                        }}>
                            <AlertTriangle size={18} /> Trading paused — circuit breaker active. Prices may be volatile.
                        </div>
                    )}

                    {/* ─── HEADER ─── */}
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
                        <img
                            src={artistImages[artist.name] || avatarUrl(artist.name, 200)}
                            alt={artist.name}
                            style={{
                                width: 80, height: 80, borderRadius: 22,
                                border: "1px solid rgba(255,255,255,0.9)",
                                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                                objectFit: "cover",
                            }}
                        />
                        <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2, flexWrap: "wrap" }}>
                                {artist.symbol && (
                                    <span style={{
                                        padding: "3px 10px", borderRadius: 6, fontSize: 13, fontWeight: 800,
                                        background: C.primary + "12", color: C.primary,
                                        fontFamily: "monospace", letterSpacing: "0.08em",
                                    }}>{artist.symbol}</span>
                                )}
                                <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", margin: 0 }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: isUp ? "#38BDF8" : "#EF4444", fontFamily: "monospace", marginRight: 8 }}>{artist.ticker || getTicker(artist.name)}</span>{artist.name}
                                </h1>
                                <span style={{
                                    padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                                    background: isUp ? C.greenSoft : C.redSoft,
                                    color: changeColor,
                                }}>
                                    {isUp ? "▲" : "▼"} {isUp ? "+" : ""}{artistChange}%
                                </span>
                                {/* Revenue Share Badge */}
                                {artist.revenueSharePct && (
                                    <span style={{
                                        padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                                        background: "rgba(67,56,202,0.08)",
                                        color: C.primary,
                                        border: `1px solid ${C.primary}18`,
                                    }}>
                                        {artist.revenueSharePct}% Revenue Share
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: 13, color: C.textSec }}>{artist.genre} · {artist.streams} streams</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em" }}>
                                ${artistPrice.toFixed(2)}
                            </div>
                            {liveQuote && (
                                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                                    Bid: ${displayBid.toFixed(2)} · Ask: ${displayAsk.toFixed(2)}
                                </div>
                            )}
                            <div style={{ fontSize: 12, color: C.textMuted }}>per share</div>
                        </div>
                    </div>

                    {/* ─── BIO ─── */}
                    {artist.bio && (
                        <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5, marginBottom: 20, fontStyle: "italic" }}>
                            {artist.bio}
                        </div>
                    )}

                    {/* ─── MARQUEE ─── */}
                    <ArtistMarquee artistName={artist.name} />

                    {/* ─── PRICE CHART ─── */}
                    <div style={{
                        background: C.card,
                        backdropFilter: "blur(20px)",
                        borderRadius: 18,
                        border: `1px solid ${C.border}`,
                        boxShadow: C.shadow,
                        padding: "20px 20px 16px",
                        marginBottom: 16,
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                            <div style={{ display: "flex", gap: 12 }}>
                                <span
                                    onClick={() => setShowTraction(false)}
                                    style={{
                                        fontSize: 14, fontWeight: 600, cursor: "pointer",
                                        color: !showTraction ? C.text : C.textMuted,
                                        borderBottom: !showTraction ? `2px solid ${C.primary}` : "2px solid transparent",
                                        paddingBottom: 2,
                                    }}>Price History</span>
                                <span
                                    onClick={() => setShowTraction(true)}
                                    style={{
                                        fontSize: 14, fontWeight: 600, cursor: "pointer",
                                        color: showTraction ? C.text : C.textMuted,
                                        borderBottom: showTraction ? `2px solid ${C.primary}` : "2px solid transparent",
                                        paddingBottom: 2,
                                    }}>Traction Score</span>
                            </div>
                            {!showTraction && (
                                <div style={{
                                    display: "inline-flex", gap: 1, background: "rgba(0,0,0,0.04)",
                                    borderRadius: 8, padding: 2,
                                }}>
                                    {["1M", "2W", "1W", "5D", "1D"].map(p => (
                                        <button key={p} onClick={() => setChartPeriod(p)} style={{
                                            padding: "4px 10px", borderRadius: 6, border: "none",
                                            fontSize: 11, fontWeight: 500, cursor: "pointer",
                                            fontFamily: "'Inter', sans-serif",
                                            background: chartPeriod === p ? "#fff" : "transparent",
                                            color: chartPeriod === p ? C.text : C.textMuted,
                                            boxShadow: chartPeriod === p ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
                                            transition: "all 0.15s",
                                        }}>{p}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {!showTraction ? (
                            <>
                                {filteredMetrics.length > 0 ? (
                                    <>
                                        {/* Metric selector */}
                                        <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
                                            {[
                                                { key: "spotifyMonthlyListeners", label: "Listeners" },
                                                { key: "spotifyFollowers", label: "Followers" },
                                                { key: "tiktokFollowers", label: "TikTok" },
                                                { key: "instagramFollowers", label: "Instagram" },
                                            ].map(m => (
                                                <button key={m.key} onClick={() => setActiveMetric(m.key)} style={{
                                                    padding: "3px 10px", borderRadius: 6, border: "none",
                                                    fontSize: 10, fontWeight: 600, cursor: "pointer",
                                                    fontFamily: "'Inter', sans-serif",
                                                    background: activeMetric === m.key ? C.primarySoft : "rgba(0,0,0,0.03)",
                                                    color: activeMetric === m.key ? C.primary : C.textMuted,
                                                    transition: "all 0.15s",
                                                }}>{m.label}</button>
                                            ))}
                                        </div>
                                        <ResponsiveContainer width="100%" height={130}>
                                            <AreaChart data={filteredMetrics} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
                                                <defs>
                                                    <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={C.primary} stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor={C.primary} stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.textMuted }} tickLine={false} axisLine={false} />
                                                <YAxis tick={{ fontSize: 10, fill: C.textMuted }} tickLine={false} axisLine={false} tickFormatter={v => formatNumber(v)} width={50} />
                                                <Tooltip
                                                    contentStyle={{ background: "rgba(17,24,39,0.92)", border: "none", borderRadius: 10, fontSize: 12 }}
                                                    labelStyle={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}
                                                    formatter={(v) => [formatNumber(v), activeMetric.replace(/([A-Z])/g, ' $1').trim()]}
                                                />
                                                <Area type="monotone" dataKey={activeMetric} stroke={C.primary} fill="url(#metricGrad)" strokeWidth={2} dot={false} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                        {volatilityEstimate && (
                                            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6, textAlign: "right" }}>
                                                Est. Daily Volatility: ±{volatilityEstimate}%
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <InteractivePriceChart data={priceHistory} color={chartColor} height={130} />
                                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: C.textMuted }}>
                                            <span>30 days ago</span>
                                            <span>Today</span>
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <InteractiveTractionChart data={tractionHistory} height={130} />
                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: C.textMuted }}>
                                    <span>30 days ago</span>
                                    <span>Today</span>
                                </div>
                                <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                        <div style={{ width: 12, height: 3, borderRadius: 2, background: C.primary }} />
                                        <span style={{ fontSize: 10, color: C.textMuted }}>Traction Score</span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                        <div style={{ width: 12, height: 3, borderRadius: 2, background: C.accent }} />
                                        <span style={{ fontSize: 10, color: C.textMuted }}>Price</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* ─── STATS GRID — real metrics when available ─── */}
                    <div style={{
                        display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr",
                        gap: 10, marginBottom: 16,
                    }}>
                        {(() => {
                            const latestMetric = metricsData.length > 0 ? metricsData[metricsData.length - 1] : null;
                            const stats = latestMetric ? [
                                { label: "Listeners", value: formatNumber(latestMetric.spotifyMonthlyListeners) },
                                { label: "Playlist Reach", value: formatNumber(latestMetric.playlistReach) },
                                { label: "Followers", value: formatNumber(latestMetric.spotifyFollowers) },
                                { label: "TikTok", value: formatNumber(latestMetric.tiktokFollowers) },
                            ] : [
                                { label: "Market Cap", value: `$${marketCap}` },
                                { label: "24h Volume", value: artist.volume },
                                { label: "52w High", value: `$${weekHigh}` },
                                { label: "52w Low", value: `$${weekLow}` },
                            ];
                            return stats.map(s => (
                                <div key={s.label} style={{
                                    background: C.card, backdropFilter: "blur(20px)",
                                    borderRadius: 14, border: `1px solid ${C.border}`,
                                    boxShadow: C.shadow, padding: "14px 14px",
                                    textAlign: "center",
                                }}>
                                    <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, fontFamily: "monospace" }}>{s.label}</div>
                                    <div style={{ fontSize: 14, fontWeight: 700 }}>{s.value}</div>
                                </div>
                            ));
                        })()}
                    </div>

                    {/* ─── SUPPLY METER ─── */}
                    {artist.sharesOutstanding && artist.maxShares && (
                        <div style={{
                            background: C.card, backdropFilter: "blur(20px)",
                            borderRadius: 18, border: `1px solid ${C.border}`,
                            boxShadow: C.shadow, padding: 20, marginBottom: 16,
                        }}>
                            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Shares Outstanding</div>
                            <div style={{ height: 8, borderRadius: 99, background: "rgba(0,0,0,0.06)", overflow: "hidden", marginBottom: 8 }}>
                                <div style={{
                                    height: "100%", borderRadius: 99, width: `${supplyPct}%`,
                                    background: supplyPct > 80
                                        ? `linear-gradient(90deg, #F59E0B, #EF4444)`
                                        : `linear-gradient(90deg, ${C.accent}, ${C.primary})`,
                                    transition: "width 0.8s ease"
                                }} />
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.textSec }}>
                                <span>{artist.sharesOutstanding.toLocaleString()} issued</span>
                                <span>{artist.maxShares.toLocaleString()} max supply</span>
                            </div>
                            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                                {(100 - supplyPct).toFixed(1)}% remaining
                            </div>
                        </div>
                    )}

                    {/* ─── YOUR POSITION ─── */}
                    {artist.shares > 0 && (
                        <div style={{
                            background: C.card, backdropFilter: "blur(20px)",
                            borderRadius: 18, border: `1px solid ${C.border}`,
                            boxShadow: C.shadow, padding: 20, marginBottom: 16,
                        }}>
                            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Your Position</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                                {[
                                    { label: "Shares", value: artist.shares },
                                    { label: "Avg Cost", value: `$${(artist.avgCost || 0).toFixed(2)}` },
                                    { label: "Value", value: `$${((artist.shares || 0) * artistPrice).toFixed(2)}` },
                                    {
                                        label: "P&L",
                                        value: `${((artistPrice - (artist.avgCost || 0)) * (artist.shares || 0)) >= 0 ? "+" : ""}$${((artistPrice - (artist.avgCost || 0)) * (artist.shares || 0)).toFixed(2)}`,
                                        color: (artistPrice - (artist.avgCost || 0)) >= 0 ? C.green : C.red,
                                    },
                                ].map(s => (
                                    <div key={s.label}>
                                        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 3 }}>{s.label}</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: s.color || C.text }}>{s.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ─── ORDER BOOK ─── */}
                    <div style={{
                        background: C.card, backdropFilter: "blur(20px)",
                        borderRadius: 18, border: `1px solid ${C.border}`,
                        boxShadow: C.shadow, padding: 20, marginBottom: 16,
                    }}>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Order Book</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace", marginBottom: 8 }}>
                                    <span>Bid Price</span><span>Qty</span>
                                </div>
                                {orderBook.bids.map((b, i) => (
                                    <div key={i} style={{
                                        display: "flex", justifyContent: "space-between", padding: "5px 0",
                                        fontSize: 13, position: "relative",
                                    }}>
                                        <div style={{
                                            position: "absolute", right: 0, top: 0, bottom: 0,
                                            width: `${(b.qty / 500) * 100}%`,
                                            background: `${C.green}12`, borderRadius: 4,
                                        }} />
                                        <span style={{ fontWeight: 600, color: C.green, position: "relative" }}>${b.price}</span>
                                        <span style={{ color: C.textSec, position: "relative" }}>{b.qty}</span>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace", marginBottom: 8 }}>
                                    <span>Ask Price</span><span>Qty</span>
                                </div>
                                {orderBook.asks.map((a, i) => (
                                    <div key={i} style={{
                                        display: "flex", justifyContent: "space-between", padding: "5px 0",
                                        fontSize: 13, position: "relative",
                                    }}>
                                        <div style={{
                                            position: "absolute", right: 0, top: 0, bottom: 0,
                                            width: `${(a.qty / 500) * 100}%`,
                                            background: `${C.red}12`, borderRadius: 4,
                                        }} />
                                        <span style={{ fontWeight: 600, color: C.red, position: "relative" }}>${a.price}</span>
                                        <span style={{ color: C.textSec, position: "relative" }}>{a.qty}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ─── RELATED NEWS ─── */}
                    {artistNews.length > 0 && (
                        <div style={{
                            background: C.card, backdropFilter: "blur(20px)",
                            borderRadius: 18, border: `1px solid ${C.border}`,
                            boxShadow: C.shadow, padding: 20, marginBottom: 16,
                        }}>
                            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Latest News</div>
                            {artistNews.map((n, i) => (
                                <div key={i} style={{
                                    display: "flex", gap: 10, padding: "10px 0",
                                    borderBottom: i < artistNews.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                                }}>
                                    <div style={{
                                        width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                                        background: n.up ? C.green : C.red,
                                        boxShadow: `0 0 6px ${n.up ? C.green : C.red}50`,
                                    }} />
                                    <div>
                                        <div style={{ fontSize: 13, lineHeight: 1.3, color: C.textSec }}>{n.text}</div>
                                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{n.time} ago</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ─── TRENDING SOUNDS ─── */}
                    {artistSounds.length > 0 && (
                        <div style={{
                            background: C.card, backdropFilter: "blur(20px)",
                            borderRadius: 18, border: `1px solid ${C.border}`,
                            boxShadow: C.shadow, padding: 20, marginBottom: 16,
                        }}>
                            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Trending Sounds</div>
                            {artistSounds.map((s) => {
                                const waveMax = Math.max(...s.wave);
                                return (
                                    <div key={s.id} style={{
                                        display: "flex", gap: 14, alignItems: "center", padding: "10px 0",
                                    }}>
                                        <div style={{ display: "flex", alignItems: "flex-end", gap: 1.5, height: 24, width: 50, flexShrink: 0 }}>
                                            {s.wave.map((v, wi) => (
                                                <div key={wi} style={{
                                                    flex: 1, borderRadius: 1.5,
                                                    height: `${(v / waveMax) * 100}%`,
                                                    background: `${C.primary}50`,
                                                }} />
                                            ))}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>{s.title}</div>
                                            <div style={{ fontSize: 11, color: C.textMuted }}>{s.platform} · {s.uses} uses</div>
                                        </div>
                                        <div style={{
                                            fontSize: 12, fontWeight: 700, color: C.green,
                                            padding: "3px 8px", borderRadius: 6,
                                            background: C.greenSoft,
                                        }}>{s.growth}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ─── TOP TRACKS ─── */}
                    {(topTracks[artist.name] || []).length > 0 && (
                        <div style={{
                            background: C.card, backdropFilter: "blur(20px)",
                            borderRadius: 18, border: `1px solid ${C.border}`,
                            boxShadow: C.shadow, padding: 20, marginBottom: 16,
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                                <Music size={16} style={{ color: C.primary }} />
                                <span style={{ fontSize: 14, fontWeight: 700 }}>Top Tracks</span>
                            </div>
                            {(topTracks[artist.name] || []).map((track, i) => (
                                <div key={i} style={{
                                    display: "grid", gridTemplateColumns: "24px 1fr auto auto",
                                    alignItems: "center", gap: 12, padding: "10px 4px",
                                    borderBottom: i < (topTracks[artist.name] || []).length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none",
                                    cursor: "pointer",
                                    borderRadius: 8,
                                    transition: "background 0.15s",
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.02)"}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                >
                                    <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, textAlign: "center", fontFamily: "monospace" }}>{i + 1}</span>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{track.title}</div>
                                        <div style={{ fontSize: 11, color: C.textMuted }}>{track.album}</div>
                                    </div>
                                    <span style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}>{track.streams}</span>
                                    <span style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 3 }}>
                                        <Clock size={10} /> {track.duration}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ─── RECENT RELEASES ─── */}
                    {(recentReleases[artist.name] || []).length > 0 && (
                        <div style={{
                            background: C.card, backdropFilter: "blur(20px)",
                            borderRadius: 18, border: `1px solid ${C.border}`,
                            boxShadow: C.shadow, padding: 20, marginBottom: 16,
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                                <Disc3 size={16} style={{ color: C.primary }} />
                                <span style={{ fontSize: 14, fontWeight: 700 }}>Discography</span>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                                {(recentReleases[artist.name] || []).map((release, i) => (
                                    <div key={i} style={{
                                        borderRadius: 14, padding: 16, textAlign: "center",
                                        background: "rgba(0,0,0,0.02)",
                                        border: "1px solid rgba(0,0,0,0.04)",
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,0,0,0.04)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,0,0,0.02)"; e.currentTarget.style.transform = "translateY(0)"; }}
                                    >
                                        {release.cover ? (
                                            <img src={release.cover} alt={release.title} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", marginBottom: 8 }} />
                                        ) : (
                                            <div style={{ width: 48, height: 48, borderRadius: 8, background: `${C.primary}12`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
                                                <Disc3 size={22} style={{ color: C.primary, opacity: 0.5 }} />
                                            </div>
                                        )}
                                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2, lineHeight: 1.2 }}>{release.title}</div>
                                        <div style={{ fontSize: 11, color: C.textMuted }}>{release.type} · {release.year}</div>
                                        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{release.tracks} track{release.tracks !== 1 ? "s" : ""}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ─── EARNINGS BAND ─── */}
                    <EarningsBand artistId={artist.id} />

                    {/* ─── GROWTH SUMMARY — LAST 30 DAYS ─── */}
                    {growthAnalytics && growthAnalytics.length > 0 && (
                        <div style={{
                            background: C.card, backdropFilter: "blur(20px)",
                            borderRadius: 18, border: `1px solid ${C.border}`,
                            boxShadow: C.shadow, padding: 20, marginBottom: 16,
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                                <TrendingUp size={16} style={{ color: C.primary }} />
                                <span style={{ fontSize: 14, fontWeight: 700 }}>Growth Summary — Last 30 Days</span>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                                {growthAnalytics.map(m => (
                                    <div key={m.key} style={{
                                        padding: 14, borderRadius: 14,
                                        background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.04)",
                                    }}>
                                        <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, fontFamily: "monospace" }}>
                                            {m.label}
                                        </div>
                                        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>
                                            {formatNumber(m.current)}
                                        </div>
                                        {m.change && (
                                            <div style={{
                                                display: "flex", alignItems: "center", gap: 4,
                                                fontSize: 12, fontWeight: 600,
                                                color: m.change.isUp ? C.green : C.red,
                                            }}>
                                                {m.change.isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                {m.change.label}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ─── TRADE ERROR ─── */}
                    {tradeError && (
                        <div style={{
                            padding: "12px 16px", borderRadius: 14, marginBottom: 16,
                            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                            color: C.red, fontSize: 13, fontWeight: 600
                        }}>
                            {tradeError}
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════
              INVEST / TRADE FORM
             ═══════════════════════════════════════════ */}
                    <div style={{
                        background: "rgba(255,255,255,0.85)",
                        backdropFilter: "blur(24px)",
                        borderRadius: 20,
                        border: `1px solid ${C.border}`,
                        boxShadow: "0 4px 32px rgba(0,0,0,0.06), 0 0 0 1px rgba(255,255,255,0.8)",
                        padding: 24,
                        position: "relative",
                        overflow: "hidden",
                        opacity: 1,
                        pointerEvents: "auto",
                    }}>
                        {/* Decorative blob */}
                        <div style={{
                            position: "absolute", top: -30, right: -30, width: 100, height: 100,
                            borderRadius: "50%",
                            background: orderType === "buy"
                                ? "radial-gradient(circle, rgba(80,227,194,0.2) 0%, transparent 70%)"
                                : "radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)",
                            filter: "blur(12px)", pointerEvents: "none",
                        }} />

                        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 18, letterSpacing: "-0.02em" }}>
                            Trade <span style={{ fontSize: 13, fontWeight: 700, color: isUp ? "#38BDF8" : "#EF4444", fontFamily: "monospace" }}>{artist.ticker || getTicker(artist.name)}</span> {artist.name}
                        </div>

                        {/* Buy / Sell Toggle */}
                        <div style={{
                            display: "flex", gap: 2, borderRadius: 12, padding: 3,
                            background: "rgba(0,0,0,0.04)", marginBottom: 18,
                        }}>
                            {["buy", "sell"].map(t => (
                                <button key={t} onClick={() => setOrderType(t)} style={{
                                    flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
                                    fontSize: 14, fontWeight: 600, cursor: "pointer",
                                    fontFamily: "'Inter', sans-serif",
                                    textTransform: "capitalize",
                                    background: orderType === t
                                        ? (t === "buy" ? C.green : C.red)
                                        : "transparent",
                                    color: orderType === t ? "#fff" : C.textSec,
                                    boxShadow: orderType === t ? `0 2px 8px ${t === "buy" ? C.green : C.red}30` : "none",
                                    transition: "all 0.25s",
                                }}>{t}</button>
                            ))}
                        </div>

                        {/* Order Mode */}
                        <div style={{
                            display: "flex", gap: 2, borderRadius: 10, padding: 2,
                            background: "rgba(0,0,0,0.03)", marginBottom: 18,
                        }}>
                            {[{ key: "market", label: "Market Order" }, { key: "limit", label: "Limit Order" }].map(m => (
                                <button key={m.key} onClick={() => setOrderMode(m.key)} style={{
                                    flex: 1, padding: "7px 0", borderRadius: 8, border: "none",
                                    fontSize: 12, fontWeight: 500, cursor: "pointer",
                                    fontFamily: "'Inter', sans-serif",
                                    background: orderMode === m.key ? "#fff" : "transparent",
                                    color: orderMode === m.key ? C.text : C.textMuted,
                                    boxShadow: orderMode === m.key ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
                                    transition: "all 0.15s",
                                }}>{m.label}</button>
                            ))}
                        </div>

                        {/* Limit Price */}
                        {orderMode === "limit" && (
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: C.textSec, display: "block", marginBottom: 6 }}>
                                    Limit Price
                                </label>
                                <div style={{
                                    display: "flex", alignItems: "center",
                                    borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)",
                                    background: "#fff", overflow: "hidden",
                                }}>
                                    <span style={{ padding: "0 12px", fontSize: 16, fontWeight: 600, color: C.textSec }}>$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={limitPrice}
                                        onChange={e => setLimitPrice(e.target.value)}
                                        style={{
                                            flex: 1, padding: "12px 12px 12px 0",
                                            border: "none", outline: "none",
                                            fontSize: 16, fontWeight: 600,
                                            fontFamily: "'Instrument Sans', sans-serif",
                                            background: "transparent", color: C.text,
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Quantity Input */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: C.textSec, display: "block", marginBottom: 6 }}>
                                Number of Shares
                            </label>
                            <div style={{
                                display: "flex", alignItems: "center",
                                borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)",
                                background: "#fff", overflow: "hidden",
                            }}>
                                <button
                                    onClick={() => setQty(String(Math.max(0, (parseInt(qty) || 0) - 1)))}
                                    style={{
                                        width: 44, height: 44, border: "none", background: "transparent",
                                        fontSize: 20, cursor: "pointer", color: C.textSec,
                                        fontFamily: "'Instrument Sans', sans-serif",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}
                                >−</button>
                                <input
                                    type="number"
                                    min="0"
                                    value={qty}
                                    onChange={e => setQty(e.target.value)}
                                    placeholder="0"
                                    style={{
                                        flex: 1, padding: "12px 8px",
                                        border: "none", outline: "none",
                                        fontSize: 18, fontWeight: 600,
                                        fontFamily: "'Instrument Sans', sans-serif",
                                        textAlign: "center",
                                        background: "transparent", color: C.text,
                                    }}
                                />
                                <button
                                    onClick={() => setQty(String((parseInt(qty) || 0) + 1))}
                                    style={{
                                        width: 44, height: 44, border: "none", background: "transparent",
                                        fontSize: 20, cursor: "pointer", color: C.textSec,
                                        fontFamily: "'Instrument Sans', sans-serif",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}
                                >+</button>
                            </div>

                            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                                {[1, 5, 10, 25, 50, 100].map(n => (
                                    <button key={n} onClick={() => setQty(String(n))} style={{
                                        flex: 1, padding: "6px 0", borderRadius: 8,
                                        border: "1px solid rgba(0,0,0,0.06)",
                                        background: parseInt(qty) === n ? `${C.primary}12` : "rgba(0,0,0,0.02)",
                                        color: parseInt(qty) === n ? C.primary : C.textMuted,
                                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                                        fontFamily: "'Instrument Sans', sans-serif",
                                        transition: "all 0.15s",
                                    }}>{n}</button>
                                ))}
                            </div>
                        </div>

                        {/* Order Summary */}
                        {quantity > 0 && (
                            <div style={{
                                borderRadius: 14, padding: 16, marginBottom: 18,
                                background: "rgba(0,0,0,0.02)",
                                border: "1px solid rgba(0,0,0,0.04)",
                            }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: C.textSec, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace" }}>
                                    Order Summary
                                </div>
                                {[
                                    { label: `${quantity} share${quantity !== 1 ? "s" : ""} × $${unitPrice.toFixed(2)}`, value: "" },
                                    { label: "Estimated Total", value: `$${totalCost.toFixed(2)}`, bold: true },
                                    { label: "Order Type", value: `${orderMode === "market" ? "Market" : "Limit"} · ${orderType === "buy" ? "Buy" : "Sell"}` },
                                ].map((row, i) => (
                                    <div key={i} style={{
                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                        padding: "6px 0",
                                        borderTop: i > 0 ? "1px solid rgba(0,0,0,0.04)" : "none",
                                    }}>
                                        <span style={{ fontSize: 13, color: row.bold ? C.text : C.textSec, fontWeight: row.bold ? 700 : 400 }}>{row.label}</span>
                                        <span style={{ fontSize: row.bold ? 18 : 13, fontWeight: row.bold ? 700 : 500, color: C.text }}>{row.value}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Submit Button */}
                        {!showConfirm ? (
                            <button
                                onClick={() => quantity > 0 && setShowConfirm(true)}
                                disabled={quantity <= 0}
                                style={{
                                    width: "100%", padding: "14px 0",
                                    borderRadius: 14, border: "none",
                                    fontSize: 15, fontWeight: 700, cursor: quantity > 0 ? "pointer" : "not-allowed",
                                    fontFamily: "'Instrument Sans', sans-serif",
                                    background: quantity > 0
                                        ? (orderType === "buy"
                                            ? `linear-gradient(135deg, ${C.green}, ${C.accentDark})`
                                            : `linear-gradient(135deg, ${C.red}, #DC2626)`)
                                        : "rgba(0,0,0,0.06)",
                                    color: quantity > 0 ? "#fff" : C.textMuted,
                                    boxShadow: quantity > 0 ? `0 4px 16px ${orderType === "buy" ? C.green : C.red}30` : "none",
                                    transition: "all 0.3s",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                }}
                            >
                                {quantity > 0
                                    ? `Review ${orderType === "buy" ? "Buy" : "Sell"} Order`
                                    : "Enter Quantity"}
                            </button>
                        ) : (
                            <div>
                                {orderPlaced ? (
                                    <div style={{
                                        padding: "18px 0", textAlign: "center",
                                        borderRadius: 14,
                                        background: `linear-gradient(135deg, ${orderType === "buy" ? C.green : C.red}15, ${orderType === "buy" ? C.accent : "#DC2626"}10)`,
                                        border: `1px solid ${orderType === "buy" ? C.green : C.red}30`,
                                    }}>
                                        <div style={{ fontSize: 24, marginBottom: 4 }}>✓</div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: orderType === "buy" ? C.green : C.red }}>
                                            Order Placed!
                                        </div>
                                        <div style={{ fontSize: 13, color: C.textSec, marginTop: 4 }}>
                                            {orderType === "buy" ? "Bought" : "Sold"} {quantity} share{quantity !== 1 ? "s" : ""} of <span style={{ fontWeight: 700, color: orderType === "buy" ? "#38BDF8" : "#EF4444", fontFamily: "monospace" }}>{artist.ticker || getTicker(artist.name)}</span> {artist.name}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{
                                            padding: 14, borderRadius: 14, marginBottom: 10,
                                            background: `${orderType === "buy" ? C.green : C.red}08`,
                                            border: `1px solid ${orderType === "buy" ? C.green : C.red}20`,
                                            fontSize: 13, color: C.textSec, textAlign: "center", lineHeight: 1.3,
                                        }}>
                                            Confirm: {orderType === "buy" ? "Buy" : "Sell"} <strong>{quantity}</strong> share{quantity !== 1 ? "s" : ""} of <strong><span style={{ color: orderType === "buy" ? "#38BDF8" : "#EF4444", fontFamily: "monospace" }}>{artist.ticker || getTicker(artist.name)}</span> {artist.name}</strong> for <strong>${totalCost.toFixed(2)}</strong>
                                        </div>
                                        <div style={{ display: "flex", gap: 10 }}>
                                            <button
                                                onClick={() => setShowConfirm(false)}
                                                style={{
                                                    flex: 1, padding: "12px 0", borderRadius: 12,
                                                    border: "1px solid rgba(0,0,0,0.08)",
                                                    background: "#fff", color: C.textSec,
                                                    fontSize: 14, fontWeight: 600, cursor: "pointer",
                                                    fontFamily: "'Instrument Sans', sans-serif",
                                                }}
                                            >Cancel</button>
                                            <button
                                                onClick={handlePlaceOrder}
                                                style={{
                                                    flex: 2, padding: "12px 0", borderRadius: 12,
                                                    border: "none",
                                                    background: orderType === "buy"
                                                        ? `linear-gradient(135deg, ${C.green}, ${C.accentDark})`
                                                        : `linear-gradient(135deg, ${C.red}, #DC2626)`,
                                                    color: "#fff",
                                                    fontSize: 14, fontWeight: 700, cursor: "pointer",
                                                    fontFamily: "'Instrument Sans', sans-serif",
                                                    boxShadow: `0 4px 16px ${orderType === "buy" ? C.green : C.red}30`,
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.06em",
                                                }}
                                            >Confirm {orderType === "buy" ? "Purchase" : "Sale"}</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </>
    );
}
