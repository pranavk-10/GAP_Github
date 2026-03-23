import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaClipboardList, FaListUl, FaExclamationTriangle,
  FaInfoCircle, FaRedo, FaHospital, FaVolumeUp, FaStop
} from "react-icons/fa";

export default function DiagnosisCard({ diagnosis, answeredQA, symptomSummary, onReset, isDark, cardClass }) {
  const navigate = useNavigate();
  const [speakingSection, setSpeakingSection] = useState(null);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeak = (section, textparts) => {
    if (!window.speechSynthesis) return;

    if (speakingSection === section) {
      window.speechSynthesis.cancel();
      setSpeakingSection(null);
      return;
    }

    window.speechSynthesis.cancel();

    const plainText = Array.isArray(textparts) ? textparts.filter(Boolean).join(". ") : textparts;
    const utterance = new SpeechSynthesisUtterance(plainText);

    if (/[\u0900-\u097F]/.test(plainText)) {
      utterance.lang = "hi-IN";
    } else {
      utterance.lang = "en-IN";
    }

    utterance.onend = () => setSpeakingSection(null);
    utterance.onerror = () => setSpeakingSection(null);

    setSpeakingSection(section);
    window.speechSynthesis.speak(utterance);
  };

  if (!diagnosis) return null;
  const { assessment, advice = [], red_flags = [], disclaimer } = diagnosis;

  return (
    <div className="fade-in flex flex-1 flex-col gap-5 pb-8">
      {/* ── Consultation complete badge ── */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/15 px-4 py-1.5 text-xs font-semibold text-teal-500">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-500" /> Consultation complete
        </span>
      </div>

      {/* ── Session summary ── */}
      {answeredQA.length > 0 && (
        <div className={`rounded-2xl border p-4 ${isDark ? "border-zinc-800 bg-zinc-900/60" : "border-slate-100 bg-slate-50"}`}>
          <p className={`mb-3 text-xs font-semibold uppercase tracking-widest ${isDark ? "text-zinc-500" : "text-slate-400"}`}>
            Your session summary
          </p>
          <p className={`mb-2 text-xs ${isDark ? "text-zinc-400" : "text-slate-600"}`}>
            <span className="font-semibold">Chief complaint:</span> {symptomSummary}
          </p>
          {answeredQA.map((qa, i) => (
            <div key={i} className={`mt-2 text-xs ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
              <span className="font-semibold">Q{i + 1}:</span> {qa.question} —{" "}
              <span className="italic">{qa.answer}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Assessment ── */}
      <div className={`rounded-3xl p-6 ${cardClass}`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/15">
              <FaClipboardList size={14} className="text-cyan-500" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-500">Assessment</h3>
          </div>
          
          <button
            onClick={() => handleSpeak('assessment', assessment)}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
              speakingSection === 'assessment'
                ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
                : "bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20"
            }`}
            title={speakingSection === 'assessment' ? "Stop Voice" : "Read Aloud"}
          >
            {speakingSection === 'assessment' ? <FaStop size={12} /> : <FaVolumeUp size={14} />}
          </button>
        </div>
        <p className={`text-sm leading-relaxed ${isDark ? "text-zinc-200" : "text-slate-700"}`}>
          {assessment}
        </p>
      </div>

      {/* ── Advice ── */}
      {advice.length > 0 && (
        <div className={`rounded-3xl p-6 ${cardClass}`}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/15">
                <FaListUl size={14} className="text-teal-500" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-500">What to do now</h3>
            </div>
            
            <button
              onClick={() => handleSpeak('advice', advice)}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                speakingSection === 'advice'
                  ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
                  : "bg-teal-500/10 text-teal-500 hover:bg-teal-500/20"
              }`}
              title={speakingSection === 'advice' ? "Stop Voice" : "Read Aloud"}
            >
              {speakingSection === 'advice' ? <FaStop size={12} /> : <FaVolumeUp size={14} />}
            </button>
          </div>
          <ul className="flex flex-col gap-2">
            {advice.map((item, i) => (
              <li key={i} className={`flex items-start gap-3 text-sm ${isDark ? "text-zinc-300" : "text-slate-700"}`}>
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-[10px] font-bold text-teal-500">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Red flags ── */}
      {red_flags.length > 0 && (
        <div className={`rounded-3xl border p-6 ${isDark ? "border-red-900/50 bg-red-950/30" : "border-red-100 bg-red-50"}`}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/15">
                <FaExclamationTriangle size={14} className="text-red-500" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-red-500">Seek urgent care if…</h3>
            </div>
            
            <button
              onClick={() => handleSpeak('red_flags', red_flags)}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                speakingSection === 'red_flags'
                  ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
                  : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
              }`}
              title={speakingSection === 'red_flags' ? "Stop Voice" : "Read Aloud"}
            >
              {speakingSection === 'red_flags' ? <FaStop size={12} /> : <FaVolumeUp size={14} />}
            </button>
          </div>
          <ul className="flex flex-col gap-2">
            {red_flags.map((flag, i) => (
              <li key={i} className={`flex items-start gap-2 text-sm ${isDark ? "text-red-300" : "text-red-700"}`}>
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Disclaimer ── */}
      {disclaimer && (
        <div className={`flex items-start gap-3 rounded-2xl p-4 text-xs ${isDark ? "bg-zinc-900 text-zinc-500" : "bg-slate-50 text-slate-500"}`}>
          <FaInfoCircle size={12} className="mt-0.5 shrink-0 text-slate-400" />
          <p>{disclaimer}</p>
        </div>
      )}

      {/* ── Find Nearby Hospitals ── */}
      <button
        onClick={() => navigate("/map", { state: { assessment } })}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-500 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:opacity-90 active:scale-[0.98]"
      >
        <FaHospital size={13} /> Find Nearby Hospitals
      </button>

      {/* ── New consultation ── */}
      <button
        onClick={onReset}
        className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition hover:border-cyan-500 hover:text-cyan-500 ${
          isDark ? "border-zinc-700 text-zinc-400" : "border-slate-200 text-slate-600"
        }`}
      >
        <FaRedo size={12} /> Start New Consultation
      </button>
    </div>
  );
}
