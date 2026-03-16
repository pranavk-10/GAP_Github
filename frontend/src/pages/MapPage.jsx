import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import useTheme from "../hooks/useTheme";
import { FaArrowLeft, FaMapMarkerAlt, FaSpinner } from "react-icons/fa";

// ── Multi-specialty detection — returns ALL matching specialties ──────────────
const SPECIALTY_MAP = [
  { keywords: ["mental","psychiatr","depress","anxiety","stress","psycho","bipolar","schizo","ocd","ptsd"], label: "Mental Health", specialties: ["psychiatry","mental_health"], amenities: ["psychiatrist","psychotherapist"] },
  { keywords: ["heart","cardiac","chest pain","cardiolog","palpitation","hypertension","blood pressure"], label: "Cardiology", specialties: ["cardiology"], amenities: ["cardiologist"] },
  { keywords: ["skin","rash","eczema","dermatit","acne","psoriasis","allerg"], label: "Dermatology", specialties: ["dermatology"], amenities: ["dermatologist"] },
  { keywords: ["eye","vision","sight","ophthalmol","cataract","glaucoma"], label: "Eye Care", specialties: ["ophthalmology"], amenities: ["optometrist"] },
  { keywords: ["ear","hearing","ent","nose","throat","sinus","tonsil"], label: "ENT", specialties: ["otolaryngology"], amenities: [] },
  { keywords: ["bone","joint","fracture","orthop","knee","spine","back pain","arthritis"], label: "Orthopaedics", specialties: ["orthopaedics","orthopedics"], amenities: [] },
  { keywords: ["stomach","gut","gastro","digestive","liver","intestin","diarrhea","nausea"], label: "Gastroenterology", specialties: ["gastroenterology"], amenities: [] },
  { keywords: ["neuro","brain","headache","migraine","seizure","epilep","stroke","alzheimer"], label: "Neurology", specialties: ["neurology"], amenities: ["neurologist"] },
  { keywords: ["child","kid","infant","baby","toddler","pediatr","paediatr"], label: "Paediatrics", specialties: ["paediatrics","pediatrics"], amenities: [] },
  { keywords: ["pregnan","gynae","gynecol","uterus","period","menstrual","fertility"], label: "Gynaecology", specialties: ["gynaecology","gynecology"], amenities: [] },
  { keywords: ["teeth","dental","tooth","gum","cavity"], label: "Dental", specialties: [], amenities: ["dentist"] },
  { keywords: ["kidney","urin","bladder","urolog","prostate"], label: "Urology", specialties: ["urology"], amenities: ["urologist"] },
  { keywords: ["diabetes","thyroid","hormone","endocrin","insulin","sugar"], label: "Endocrinology", specialties: ["endocrinology"], amenities: [] },
  { keywords: ["cancer","tumor","oncolog"], label: "Oncology", specialties: ["oncology"], amenities: [] },
  { keywords: ["lung","breath","asthma","copd","respiratory","cough"], label: "Pulmonology", specialties: ["pulmonology"], amenities: [] },
];

// Returns ALL matching specialties (not just first)
function detectSpecialties(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  return SPECIALTY_MAP.filter((e) => e.keywords.some((kw) => lower.includes(kw)));
}

// ── Pin colours by facility type ─────────────────────────────────────────────
// 🟠 Orange star  = specialty match (psychiatry, neurology etc.)
// 🔴 Red          = general hospital
// 🟣 Purple       = clinic
// 🟢 Green        = GP / local doctor / health centre

function getMarkerStyle(h) {
  if (h.matchedLabel) return { bg: "#f97316", size: 18, star: true };   // specialty
  if (h.type === "hospital") return { bg: "#ef4444", size: 14, star: false };
  if (h.type === "clinic")   return { bg: "#8b5cf6", size: 13, star: false };
  return                            { bg: "#10b981", size: 13, star: false }; // doctor/GP
}

function makeDivIcon({ bg, size, star }) {
  return L.divIcon({
    html: star
      ? `<div style="width:${size}px;height:${size}px;background:${bg};border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px ${bg}99;font-size:9px;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900">★</div>`
      : `<div style="width:${size}px;height:${size}px;background:${bg};border:2px solid #fff;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,.3)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
    className: "",
  });
}

// ── Overpass query — hospitals + clinics + doctors + health centres ───────────
async function fetchFacilities(lat, lon, specialties) {
  const r = 7000;

  // Collect all specialty tags across all matched specialties
  const allSpecialtyTags = [...new Set(specialties.flatMap((s) => s.specialties))];
  const allSpecialtyAmenities = [...new Set(specialties.flatMap((s) => s.amenities))];

  const spLines = [
    ...allSpecialtyTags.flatMap((s) => [
      `node["healthcare:speciality"="${s}"](around:${r},${lat},${lon});`,
      `way["healthcare:speciality"="${s}"](around:${r},${lat},${lon});`,
    ]),
    ...allSpecialtyAmenities.map((a) => `node["amenity"="${a}"](around:${r},${lat},${lon});`),
  ].join("\n");

  const query = `
    [out:json][timeout:20];
    (
      ${spLines}
      node["amenity"="hospital"](around:${r},${lat},${lon});
      way["amenity"="hospital"](around:${r},${lat},${lon});
      node["amenity"="clinic"](around:${r},${lat},${lon});
      way["amenity"="clinic"](around:${r},${lat},${lon});
      node["amenity"="doctors"](around:${r},${lat},${lon});
      node["amenity"="health_post"](around:${r},${lat},${lon});
      node["healthcare"="doctor"](around:${r},${lat},${lon});
      node["healthcare"="centre"](around:${r},${lat},${lon});
      node["healthcare"="clinic"](around:${r},${lat},${lon});
    );
    out center 50;
  `;

  const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
  const data = await res.json();

  const seen = new Set();
  return data.elements
    .map((el) => {
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      if (!elLat || !elLon) return null;
      const key = `${elLat.toFixed(4)},${elLon.toFixed(4)}`;
      if (seen.has(key)) return null;
      seen.add(key);

      const amenity = el.tags?.amenity || "";
      const hc = el.tags?.healthcare || "";
      const hcSpec = el.tags?.["healthcare:speciality"] || "";

      // Determine facility type
      let type = "gp";
      if (amenity === "hospital") type = "hospital";
      else if (amenity === "clinic" || hc === "clinic" || hc === "centre") type = "clinic";

      // Check if this element matches any of the detected specialties
      const matchedSpec = specialties.find(
        (s) =>
          s.specialties.some((sp) => hcSpec === sp) ||
          s.amenities.some((a) => amenity === a)
      );

      // Fallback name
      const defaultName =
        type === "hospital" ? "Hospital" : type === "clinic" ? "Clinic" : "Health Centre / GP";

      return {
        name: el.tags?.name || defaultName,
        lat: elLat,
        lon: elLon,
        phone: el.tags?.phone || el.tags?.["contact:phone"] || "",
        type,
        matchedLabel: matchedSpec?.label || null,
        key,
      };
    })
    .filter(Boolean)
    // Sort: specialty first, then hospital, then clinic, then GP
    .sort((a, b) => {
      const rank = (h) => (h.matchedLabel ? 0 : h.type === "hospital" ? 1 : h.type === "clinic" ? 2 : 3);
      return rank(a) - rank(b);
    });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MapPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const [mapStatus, setMapStatus] = useState("locating");
  const [pinStatus, setPinStatus] = useState("loading");
  const [counts, setCounts] = useState({ specialty: 0, hospital: 0, clinic: 0, gp: 0 });
  const [errMsg, setErrMsg] = useState("");

  const assessment = state?.assessment || "";
  const specialties = detectSpecialties(assessment);
  const specialtyLabel = specialties.map((s) => s.label).join(" + ") || null;

  useEffect(() => {
    if (!navigator.geolocation) {
      setErrMsg("Geolocation not supported by your browser.");
      setMapStatus("error");
      return;
    }

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        if (cancelled) return;
        const { latitude: lat, longitude: lon } = coords;

        // Step 1: show map immediately
        const tileUrl = isDark
          ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

        const map = L.map(mapDivRef.current, { zoomControl: true }).setView([lat, lon], 14);
        mapRef.current = map;

        L.tileLayer(tileUrl, {
          attribution: '&copy; <a href="https://openstreetmap.org">OSM</a> &copy; <a href="https://carto.com">CARTO</a>',
          subdomains: "abcd", maxZoom: 19, keepBuffer: 4, updateWhenIdle: false,
        }).addTo(map);

        // User dot
        L.circleMarker([lat, lon], {
          radius: 9, fillColor: "#06b6d4", color: "#fff",
          weight: 3, opacity: 1, fillOpacity: 1,
        }).addTo(map).bindPopup("📍 You are here").openPopup();

        setMapStatus("done");

        // Step 2: load facilities in background
        try {
          const facilities = await fetchFacilities(lat, lon, specialties);
          if (cancelled) return;

          const bounds = [[lat, lon]];
          let sc = 0, hc = 0, cc = 0, gc = 0;

          facilities.forEach((h) => {
            bounds.push([h.lat, h.lon]);
            if (h.matchedLabel) sc++;
            else if (h.type === "hospital") hc++;
            else if (h.type === "clinic") cc++;
            else gc++;

            const style = getMarkerStyle(h);
            const icon = makeDivIcon(style);

            const typeLabel =
              h.matchedLabel
                ? `<span style="font-size:10px;background:#f97316;color:#fff;border-radius:4px;padding:1px 6px;display:inline-block;margin-bottom:4px">${h.matchedLabel}</span>`
              : h.type === "hospital"
                ? `<span style="font-size:10px;background:#ef4444;color:#fff;border-radius:4px;padding:1px 6px;display:inline-block;margin-bottom:4px">Hospital</span>`
              : h.type === "clinic"
                ? `<span style="font-size:10px;background:#8b5cf6;color:#fff;border-radius:4px;padding:1px 6px;display:inline-block;margin-bottom:4px">Clinic</span>`
                : `<span style="font-size:10px;background:#10b981;color:#fff;border-radius:4px;padding:1px 6px;display:inline-block;margin-bottom:4px">GP / Health Centre</span>`;

            const popup = `
              <div style="min-width:170px;font-family:sans-serif">
                ${typeLabel}
                <p style="font-weight:700;font-size:13px;margin:4px 0">🏥 ${h.name}</p>
                ${h.phone ? `<p style="font-size:11px;margin:0 0 6px;color:#555">📞 ${h.phone}</p>` : ""}
                <a href="https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lon}"
                   target="_blank" rel="noopener noreferrer"
                   style="display:inline-flex;align-items:center;gap:4px;padding:5px 12px;background:#0891b2;color:#fff;border-radius:8px;font-size:11px;font-weight:600;text-decoration:none">
                  ➤ Get Directions
                </a>
              </div>`;

            L.marker([h.lat, h.lon], { icon }).addTo(map).bindPopup(popup);
          });

          if (bounds.length > 1) {
            map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
          }

          setCounts({ specialty: sc, hospital: hc, clinic: cc, gp: gc });
          setPinStatus("done");
        } catch {
          if (!cancelled) setPinStatus("error");
        }
      },
      () => {
        if (!cancelled) {
          setErrMsg("Location permission denied. Please allow location access.");
          setMapStatus("error");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  const total = counts.specialty + counts.hospital + counts.clinic + counts.gp;

  return (
    <div className={`flex h-screen flex-col ${isDark ? "bg-black text-zinc-100" : "bg-slate-50 text-slate-900"}`}>
      {/* Header */}
      <header className={`flex shrink-0 items-center gap-3 border-b px-4 py-3 ${isDark ? "border-zinc-800 bg-zinc-950" : "border-slate-200 bg-white shadow-sm"}`}>
        <button onClick={() => navigate(-1)} className={`rounded-full p-2 transition hover:opacity-70 ${isDark ? "text-zinc-300" : "text-slate-600"}`}>
          <FaArrowLeft size={16} />
        </button>

        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-2">
            <FaMapMarkerAlt className="text-red-500" size={13} />
            <h1 className="text-sm font-bold">Nearby Hospitals &amp; Clinics</h1>
          </div>
          {specialtyLabel && (
            <p className={`text-[10px] font-medium ${isDark ? "text-orange-400" : "text-orange-500"}`}>
              🎯 Prioritising <strong>{specialtyLabel}</strong>
            </p>
          )}
        </div>

        {/* Loading / count badge */}
        {pinStatus === "loading" && mapStatus === "done" && (
          <div className={`flex items-center gap-1.5 text-xs ${isDark ? "text-zinc-500" : "text-slate-400"}`}>
            <FaSpinner className="animate-spin" size={11} /> Finding…
          </div>
        )}
        {pinStatus === "done" && (
          <div className={`text-right text-[10px] ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
            {counts.specialty > 0 && <div><span style={{ color: "#f97316" }}>●</span> {counts.specialty} specialist</div>}
            {counts.hospital > 0 && <div><span style={{ color: "#ef4444" }}>●</span> {counts.hospital} hospital</div>}
            {counts.clinic > 0 && <div><span style={{ color: "#8b5cf6" }}>●</span> {counts.clinic} clinic</div>}
            {counts.gp > 0 && <div><span style={{ color: "#10b981" }}>●</span> {counts.gp} GP/centre</div>}
          </div>
        )}
      </header>

      {/* Legend */}
      {pinStatus === "done" && total > 0 && (
        <div className={`flex shrink-0 items-center gap-4 border-b px-4 py-2 text-[11px] ${isDark ? "border-zinc-800 bg-zinc-900" : "border-slate-100 bg-slate-50"}`}>
          {counts.specialty > 0 && <span><span style={{ color: "#f97316" }}>★</span> Specialist</span>}
          {counts.hospital > 0 && <span><span style={{ color: "#ef4444" }}>●</span> Hospital</span>}
          {counts.clinic > 0 && <span><span style={{ color: "#8b5cf6" }}>●</span> Clinic</span>}
          {counts.gp > 0 && <span><span style={{ color: "#10b981" }}>●</span> GP / Centre</span>}
          <span><span style={{ color: "#06b6d4" }}>●</span> You</span>
        </div>
      )}

      {/* Map area */}
      <div className="relative flex-1 overflow-hidden">
        {mapStatus === "locating" && (
          <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 ${isDark ? "bg-black" : "bg-slate-50"}`}>
            <FaSpinner size={28} className="animate-spin text-cyan-500" />
            <p className={`text-sm ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Getting your location…</p>
          </div>
        )}
        {mapStatus === "error" && (
          <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-8 text-center ${isDark ? "bg-black" : "bg-slate-50"}`}>
            <FaMapMarkerAlt size={32} className="text-red-400" />
            <p className={`text-sm ${isDark ? "text-zinc-400" : "text-slate-500"}`}>{errMsg}</p>
            <button onClick={() => navigate(-1)} className="rounded-xl bg-cyan-600 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-700">
              Go Back
            </button>
          </div>
        )}
        <div ref={mapDivRef} style={{ height: "100%", width: "100%" }} />
      </div>
    </div>
  );
}
