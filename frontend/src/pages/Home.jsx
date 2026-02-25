import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaRobot, FaSun, FaMoon, FaBookOpen } from "react-icons/fa";
import useTheme from "../hooks/useTheme";

const LOGO_PATH = "/Beast-logo.webp";

export default function Home() {
  const navigate = useNavigate();
  const { theme, setTheme, isDark } = useTheme();
  const [showInfo, setShowInfo] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const pageClass = isDark
    ? "min-h-screen w-full bg-black text-zinc-100"
    : "min-h-screen w-full bg-[radial-gradient(circle_at_top,_#ecfeff,_#f8fafc_45%,_#eef2ff_100%)] text-slate-900";

  const cardClass = isDark
    ? "border border-zinc-800 bg-zinc-950 shadow-[0_10px_30px_rgba(0,0,0,0.55)]"
    : "border border-cyan-100 bg-white/90 shadow-[0_10px_30px_rgba(2,132,199,0.12)]";

  return (
    <div className={pageClass}>
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className={`rounded-2xl px-5 py-4 ${cardClass}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-cyan-600 text-white">
                {!logoFailed ? (
                  <img src={LOGO_PATH} alt="Logo" className="h-full w-full object-cover" onError={() => setLogoFailed(true)} />
                ) : (
                  <FaRobot size={17} />
                )}
              </div>
              <p className="text-xl font-semibold tracking-wide">BEAST Health</p>
            </div>

            <div className="hidden items-center gap-8 text-sm md:flex">
              <span className={isDark ? "text-zinc-300" : "text-slate-600"}>Who We Serve</span>
              <span className={isDark ? "text-zinc-300" : "text-slate-600"}>Research</span>
              <span className={isDark ? "text-zinc-300" : "text-slate-600"}>Safety</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className={isDark ? "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-100" : "rounded-lg border border-cyan-200 bg-white px-3 py-2 text-xs font-semibold text-cyan-700"}
              >
                {isDark ? <FaSun className="inline-block" /> : <FaMoon className="inline-block" />} {isDark ? "Light" : "Dark"}
              </button>
              <button onClick={() => navigate("/chat")} className="rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700">
                Start Chat
              </button>
            </div>
          </div>
        </header>

        <main className="mt-7 grid flex-1 items-center gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className={`rounded-3xl p-7 ${cardClass}`}>
            <p className={isDark ? "text-sm uppercase tracking-[0.2em] text-cyan-300" : "text-sm uppercase tracking-[0.2em] text-cyan-700"}>Clinical AI Companion</p>
            <h1 className="mt-4 text-5xl leading-[1.1] sm:text-6xl" style={{ fontFamily: "Georgia, serif" }}>Calm medical guidance, any hour.</h1>
            <p className={isDark ? "mt-5 max-w-xl text-lg text-zinc-300" : "mt-5 max-w-xl text-lg text-slate-700"}>
              Designed for structured triage. BEAST asks logical follow-ups, tracks context across sessions.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => navigate("/chat")} className="rounded-full bg-cyan-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700">Chat with BEAST</button>
              <button onClick={() => setShowInfo(!showInfo)} className={isDark ? "rounded-full border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-semibold text-zinc-100" : "rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700"}>
                <FaBookOpen className="mr-2 inline-block" /> How BEAST works
              </button>
            </div>

            {showInfo && (
              <div className={isDark ? "mt-6 rounded-2xl border border-zinc-700 bg-zinc-900/80 p-4 text-sm text-zinc-300" : "mt-6 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm text-slate-700"}>
                BEAST does not diagnose disease. It provides educational guidance.
              </div>
            )}
          </section>

          <section className={`relative overflow-hidden rounded-3xl p-6 ${cardClass}`}>
            {/* Progress bar mock */}
            <div className="mb-4">
              <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                <span className={isDark ? "text-zinc-500" : "text-slate-400"}>Consultation</span>
                <span className={isDark ? "text-cyan-400" : "text-cyan-600"}>Question 2 of 5</span>
              </div>
              <div className={`h-1.5 w-full overflow-hidden rounded-full ${isDark ? "bg-zinc-800" : "bg-slate-200"}`}>
                <div className="h-1.5 w-2/5 rounded-full bg-gradient-to-r from-cyan-500 to-teal-400" />
              </div>
            </div>

            {/* Answered Q1 */}
            <div className={`mb-3 rounded-xl p-3 text-xs ${isDark ? "bg-zinc-900/80 text-zinc-500" : "bg-slate-50 text-slate-500"}`}>
              <span className="font-semibold text-teal-500">✓ Q1:</span> When did the headache start? — <em>Last night around 10 PM</em>
            </div>

            {/* Current question */}
            <div className="relative space-y-3">
              <div className={isDark ? "ml-auto max-w-[80%] rounded-2xl bg-cyan-700/30 p-3 text-xs leading-5 text-zinc-100" : "ml-auto max-w-[80%] rounded-2xl bg-cyan-100 p-3 text-xs leading-5 text-slate-800"}>
                It's throbbing, about a 7/10.
              </div>
              <div className={isDark ? "max-w-[90%] rounded-2xl border border-zinc-700 bg-zinc-900 p-4 text-sm leading-6 text-zinc-200" : "max-w-[90%] rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700"}>
                <p className={`text-xs font-semibold mb-1 ${isDark ? "text-cyan-400" : "text-cyan-600"}`}>Dr. BEAST · Question 2</p>
                <p className="font-medium">Do you have any associated symptoms like nausea, light or sound sensitivity?</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}