import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { FaTimes, FaMapMarkerAlt, FaDirections, FaSpinner } from "react-icons/fa";

// ── Specialty detection ───────────────────────────────────────────────────────
const SPECIALTY_MAP = [
  { keywords: ["mental", "psychiatr", "depress", "anxiety", "stress", "psycho", "bipolar", "schizo", "ocd", "ptsd"], label: "Mental Health", specialties: ["psychiatry", "mental_health"], amenities: ["psychiatrist", "psychotherapist"] },
  { keywords: ["heart", "cardiac", "chest pain", "cardiolog", "palpitation", "hypertension", "blood pressure"], label: "Cardiology", specialties: ["cardiology"], amenities: ["cardiologist"] },
  { keywords: ["skin", "rash", "eczema", "dermatit", "acne", "psoriasis", "allerg"], label: "Dermatology", specialties: ["dermatology"], amenities: ["dermatologist"] },
  { keywords: ["eye", "vision", "sight", "ophthalmol", "cataract", "glaucoma"], label: "Eye Care", specialties: ["ophthalmology"], amenities: ["optometrist"] },
  { keywords: ["ear", "hearing", "ent", "nose", "throat", "sinus", "tonsil"], label: "ENT", specialties: ["otolaryngology"], amenities: [] },
  { keywords: ["bone", "joint", "fracture", "orthop", "knee", "spine", "back pain", "arthritis"], label: "Orthopaedics", specialties: ["orthopaedics", "orthopedics"], amenities: [] },
  { keywords: ["stomach", "gut", "gastro", "digestive", "liver", "intestin", "diarrhea", "nausea"], label: "Gastroenterology", specialties: ["gastroenterology"], amenities: [] },
  { keywords: ["neuro", "brain", "headache", "migraine", "seizure", "epilep", "stroke", "alzheimer"], label: "Neurology", specialties: ["neurology"], amenities: ["neurologist"] },
  { keywords: ["child", "kid", "infant", "baby", "toddler", "pediatr", "paediatr"], label: "Paediatrics", specialties: ["paediatrics", "pediatrics"], amenities: [] },
  { keywords: ["pregnan", "gynae", "gynecol", "uterus", "period", "menstrual", "fertility"], label: "Gynaecology", specialties: ["gynaecology", "gynecology"], amenities: [] },
  { keywords: ["teeth", "dental", "tooth", "gum", "cavity"], label: "Dental", specialties: [], amenities: ["dentist"] },
  { keywords: ["kidney", "urin", "bladder", "urolog", "prostate"], label: "Urology", specialties: ["urology"], amenities: ["urologist"] },
  { keywords: ["diabetes", "thyroid", "hormone", "endocrin", "insulin", "sugar"], label: "Endocrinology", specialties: ["endocrinology"], amenities: [] },
  { keywords: ["cancer", "tumor", "oncolog"], label: "Oncology", specialties: ["oncology"], amenities: [] },
  { keywords: ["lung", "breath", "asthma", "copd", "respiratory", "cough"], label: "Pulmonology", specialties: ["pulmonology"], amenities: [] },
];

function detectSpecialty(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  return SPECIALTY_MAP.find((e) => e.keywords.some((kw) => lower.includes(kw))) ?? null;
}

// ── Overpass fetch ────────────────────────────────────────────────────────────
async function fetchHospitals(lat, lon, specialty) {
  const r = 7000;
  let extra = "";
  if (specialty) {
    const parts = [
      ...specialty.specialties.map((s) => `node["healthcare:speciality"="${s}"](around:${r},${lat},${lon}); way["healthcare:speciality"="${s}"](around:${r},${lat},${lon});`),
      ...specialty.amenities.map((a) => `node["amenity"="${a}"](around:${r},${lat},${lon});`),
    ];
    extra = parts.join("\n");
  }
  const query = `[out:json][timeout:15];(${extra} node["amenity"="hospital"](around:${r},${lat},${lon}); way["amenity"="hospital"](around:${r},${lat},${lon}); node["amenity"="clinic"](around:${r},${lat},${lon});); out center 30;`;
  const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
  const data = await res.json();
  const seen = new Set();
  return data.elements
    .map((el) => {
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      const key = `${(elLat ?? 0).toFixed(4)},${(elLon ?? 0).toFixed(4)}`;
      const isSpecialty = !!specialty && (
        specialty.specialties.some((s) => el.tags?.["healthcare:speciality"] === s) ||
        specialty.amenities.some((a) => el.tags?.amenity === a)
      );
      return { name: el.tags?.name || (isSpecialty ? specialty.label + " Clinic" : "Hospital"), lat: elLat, lon: elLon, phone: el.tags?.phone || "", isSpecialty, key };
    })
    .filter((h) => { if (!h.lat || !h.lon || seen.has(h.key)) return false; seen.add(h.key); return true; })
    .sort((a, b) => b.isSpecialty - a.isSpecialty);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function HospitalMap({ onClose, isDark, assessment }) {
  const mapDivRef = useRef(null);
  const mapRef = useRef(null); // raw Leaflet map instance
  const [phase, setPhase] = useState("locating");
  const [errMsg, setErrMsg] = useState("");
  const [count, setCount] = useState({ total: 0, specialty: 0 });
  const specialty = detectSpecialty(assessment);

  useEffect(() => {
    if (!navigator.geolocation) {
      setErrMsg("Geolocation is not supported by your browser.");
      setPhase("error");
      return;
    }

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        if (cancelled) return;
        const { latitude: lat, longitude: lon } = coords;

        setPhase("loading");

        try {
          const hospitals = await fetchHospitals(lat, lon, specialty);
          if (cancelled) return;

          // CartoDB tiles — fast CDN, free, no API key needed
          const tileUrl = isDark
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

          const map = L.map(mapDivRef.current, { zoomControl: true }).setView([lat, lon], 13);
          mapRef.current = map;

          L.tileLayer(tileUrl, {
            attribution: '&copy; <a href="https://openstreetmap.org">OSM</a> &copy; <a href="https://carto.com">CARTO</a>',
            subdomains: "abcd",
            maxZoom: 19,
            keepBuffer: 4,           // preload extra tiles around viewport
            updateWhenIdle: false,    // load tiles while panning, not after
          }).addTo(map);

          // User position — blue circle
          L.circleMarker([lat, lon], {
            radius: 8,
            fillColor: "#06b6d4",
            color: "#fff",
            weight: 3,
            opacity: 1,
            fillOpacity: 1,
          }).addTo(map).bindPopup("📍 You are here");

          // Hospital markers
          const markerBounds = [[lat, lon]];
          hospitals.forEach((h) => {
            markerBounds.push([h.lat, h.lon]);

            const icon = L.divIcon({
              html: h.isSpecialty
                ? `<div style="width:18px;height:18px;background:#f97316;border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px rgba(249,115,22,.7);font-size:9px;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700">★</div>`
                : `<div style="width:14px;height:14px;background:#ef4444;border:2px solid #fff;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,.4)"></div>`,
              iconSize: h.isSpecialty ? [18, 18] : [14, 14],
              iconAnchor: h.isSpecialty ? [9, 9] : [7, 7],
              popupAnchor: [0, -10],
              className: "",
            });

            const popup = `
              <div style="min-width:165px;font-family:sans-serif">
                ${h.isSpecialty ? `<span style="font-size:10px;background:#f97316;color:#fff;border-radius:4px;padding:1px 6px;margin-bottom:4px;display:inline-block">${specialty.label}</span>` : ""}
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

          // Fit bounds
          if (markerBounds.length > 1) {
            map.fitBounds(markerBounds, { padding: [40, 40], maxZoom: 14 });
          }

          setCount({ total: hospitals.length, specialty: hospitals.filter((h) => h.isSpecialty).length });
          setPhase("done");
        } catch {
          if (!cancelled) {
            setErrMsg("Could not load hospital data. Please try again.");
            setPhase("error");
          }
        }
      },
      () => {
        if (!cancelled) {
          setErrMsg("Location permission denied. Please allow location access and try again.");
          setPhase("error");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // Cleanup: destroy map on unmount — no react-leaflet race condition
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // run once on mount

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border shadow-2xl ${isDark ? "border-zinc-700 bg-zinc-900" : "border-slate-200 bg-white"}`}
        style={{ height: "75vh", maxHeight: 600 }}
      >
        {/* Header */}
        <div className={`flex shrink-0 items-center justify-between border-b px-5 py-3 ${isDark ? "border-zinc-800" : "border-slate-100"}`}>
          <div>
            <div className="flex items-center gap-2">
              <FaMapMarkerAlt className="text-red-500" size={14} />
              <h3 className={`text-sm font-bold ${isDark ? "text-zinc-100" : "text-slate-800"}`}>
                Nearby Hospitals &amp; Clinics
              </h3>
            </div>
            {specialty && (
              <p className={`mt-0.5 text-[10px] font-medium ${isDark ? "text-orange-400" : "text-orange-500"}`}>
                🎯 Prioritising <strong>{specialty.label}</strong> facilities near you
              </p>
            )}
          </div>
          <button onClick={onClose} className={`rounded-full p-1.5 transition hover:opacity-70 ${isDark ? "text-zinc-400" : "text-slate-400"}`}>
            <FaTimes size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="relative flex-1 overflow-hidden">
          {/* Loading */}
          {(phase === "locating" || phase === "loading") && (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <FaSpinner size={26} className="animate-spin text-cyan-500" />
              <p className={`text-sm ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                {phase === "locating" ? "Getting your location…" : specialty ? `Finding ${specialty.label} facilities…` : "Finding nearby hospitals…"}
              </p>
            </div>
          )}

          {/* Error */}
          {phase === "error" && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
              <FaMapMarkerAlt size={28} className="text-red-400" />
              <p className={`text-sm ${isDark ? "text-zinc-400" : "text-slate-500"}`}>{errMsg}</p>
            </div>
          )}

          {/* Map container — always rendered so the div ref is available */}
          <div
            ref={mapDivRef}
            style={{ height: "100%", width: "100%", display: phase === "done" ? "block" : "none" }}
          />

          {/* Badge */}
          {phase === "done" && (
            <div className={`absolute bottom-3 left-3 z-[1000] rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-lg ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-white text-slate-600"}`}>
              {count.total === 0
                ? "No facilities found within 7 km"
                : count.specialty > 0
                  ? `⭐ ${count.specialty} ${specialty.label} + ${count.total - count.specialty} general`
                  : `${count.total} hospital${count.total !== 1 ? "s" : ""} found`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
