"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";

/* ================================================================
   Scroll-reveal hook + FadeIn wrapper
   ================================================================ */
function useFadeIn(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, visible } = useFadeIn();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `all 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ================================================================
   Chain data
   ================================================================ */
const sourceChains = [
  { initial: "E", color: "#627EEA" },
  { initial: "A", color: "#28A0F0" },
  { initial: "B", color: "#0052FF" },
  { initial: "O", color: "#FF0420" },
];

const destChains = [
  { name: "Arbitrum", slug: "arbitrum", color: "#28A0F0", initial: "A" },
  { name: "Optimism", slug: "optimism", color: "#FF0420", initial: "O" },
  { name: "Base", slug: "base", color: "#0052FF", initial: "B" },
  { name: "Ethereum", slug: "ethereum", color: "#627EEA", initial: "E" },
];

/* ================================================================
   Content data
   ================================================================ */
const steps = [
  {
    num: "01",
    title: "Configure your ENS",
    desc: "Create chain-specific subdomains like arbitrum.yourname.eth. Pick your receiving address and preferred token. One-time setup — takes a minute.",
  },
  {
    num: "02",
    title: "Send to a name",
    desc: "From any chain, send crypto to your subdomain. No bridge to visit, no routes to compare, no tokens to approve. Just send.",
  },
  {
    num: "03",
    title: "Automatically delivered",
    desc: "Our relayer detects deposits and finds the best bridge route via Li.Fi. Funds arrive on your destination chain — no action needed.",
  },
];

const values = [
  {
    title: "Zero friction after setup",
    desc: "Configure your ENS once. Every future cross-chain transfer is completely automatic — no popups, no signing, no waiting.",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    title: "No bridge UI, ever",
    desc: "Forget about bridge dApps. No route comparisons, no slippage worries, no multi-step approvals. Just a name and an amount.",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    ),
  },
  {
    title: "ENS-native & on-chain",
    desc: "Your preferences live as ENS text records. Decentralized, composable, and portable — you own your cross-chain identity.",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
];

/* ================================================================
   Landing Page
   ================================================================ */
export default function LandingPage() {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((i) => (i + 1) % destChains.length);
    }, 10_000);
    return () => clearInterval(timer);
  }, []);

  const activeDest = destChains[activeIdx];

  return (
    <div
      className="w-full overflow-x-hidden select-none"
      style={{
        background:
          "linear-gradient(160deg, #fffbf5 0%, #fef7ed 25%, #f5fdf9 60%, #ecfdf5 100%)",
      }}
    >
      {/* ── Fixed nav ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 px-6 sm:px-10 py-4 flex justify-between items-center bg-gradient-to-b from-[#fffbf5]/90 via-[#fffbf5]/60 to-transparent backdrop-blur-sm"
        style={{ animation: "fade-in-up 0.8s ease-out both" }}
      >
        <span className="text-lg font-bold text-stone-700 tracking-tight">
          Takeaway
        </span>
        <Link
          href="/setup"
          className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors px-4 py-2 rounded-full border border-teal-200/70 hover:border-teal-300 hover:bg-teal-50/50"
        >
          Launch App →
        </Link>
      </nav>

      {/* ================================================================
          HERO — full-screen visual story
          ================================================================ */}
      <section className="h-screen relative overflow-hidden">
        {/* Ambient blobs — slow drift */}
        <div
          className="absolute top-[15%] left-[10%] w-[500px] h-[500px] rounded-full bg-amber-100/30 blur-[120px] pointer-events-none"
          style={{ animation: "blob-drift-1 18s ease-in-out infinite" }}
          aria-hidden="true"
        />
        <div
          className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] rounded-full bg-teal-100/30 blur-[120px] pointer-events-none"
          style={{ animation: "blob-drift-2 22s ease-in-out infinite" }}
          aria-hidden="true"
        />
        <div
          className="absolute top-[50%] left-[45%] w-[400px] h-[400px] rounded-full bg-sky-50/40 blur-[100px] pointer-events-none"
          style={{ animation: "blob-drift-3 15s ease-in-out infinite" }}
          aria-hidden="true"
        />

        {/* Floating particles */}
        {[
          { left: "12%", top: "30%", size: 6, dur: 8, delay: 0, color: "#d97706" },
          { left: "28%", top: "60%", size: 5, dur: 10, delay: 2, color: "#0d9488" },
          { left: "55%", top: "25%", size: 5, dur: 9, delay: 4, color: "#78716c" },
          { left: "72%", top: "55%", size: 6, dur: 11, delay: 1, color: "#0d9488" },
          { left: "40%", top: "70%", size: 5, dur: 8, delay: 6, color: "#d97706" },
          { left: "85%", top: "35%", size: 5, dur: 10, delay: 3, color: "#78716c" },
          { left: "20%", top: "80%", size: 6, dur: 9, delay: 5, color: "#0d9488" },
          { left: "65%", top: "75%", size: 5, dur: 12, delay: 7, color: "#d97706" },
          { left: "48%", top: "40%", size: 4, dur: 10, delay: 1.5, color: "#0d9488" },
          { left: "8%", top: "55%", size: 5, dur: 9, delay: 3.5, color: "#d97706" },
          { left: "90%", top: "65%", size: 5, dur: 11, delay: 5.5, color: "#78716c" },
        ].map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: 0,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
              animation: `particle-rise ${p.dur}s ease-in-out ${p.delay}s infinite`,
            }}
            aria-hidden="true"
          />
        ))}

        {/* Route path — flowing dashes */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M -50 440 C 200 390 400 480 720 430 C 1040 380 1200 460 1490 420"
            fill="none"
            stroke="#a8a29e"
            strokeWidth="1.5"
            strokeDasharray="8 14"
            opacity="0.55"
            style={{ animation: "dash-flow 4s linear infinite" }}
          />
        </svg>

        {/* ── Source Station ── */}
        <div
          className="absolute left-3 sm:left-8 lg:left-16 top-[46%] -translate-y-1/2 z-10"
          style={{ animation: "fade-in-up 0.8s ease-out 0.2s both" }}
        >
          <div className="rounded-2xl bg-white/65 backdrop-blur-sm border border-stone-200/40 p-3 sm:p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] w-[108px] sm:w-36 lg:w-40">
            <div className="flex items-center gap-1.5 mb-2 sm:mb-3">
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#78716c"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
              <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                Send from
              </span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-stone-600 mb-2 sm:mb-2.5">
              Any Chain
            </p>
            <div className="flex gap-1 sm:gap-1.5">
              {sourceChains.map((c, i) => (
                <div
                  key={c.initial}
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: c.color,
                    animation: `pulse-soft 3s ease-in-out ${i * 0.4}s infinite`,
                  }}
                >
                  <span className="text-[7px] sm:text-[9px] font-bold text-white leading-none">
                    {c.initial}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Destination Stations ── */}
        <div
          className="absolute right-3 sm:right-8 lg:right-16 top-[46%] -translate-y-1/2 z-10"
          style={{ animation: "fade-in-up 0.8s ease-out 0.35s both" }}
        >
          {/* ENS delivery address */}
          <div
            className="flex items-center gap-1 sm:gap-1.5 bg-white/80 backdrop-blur-sm rounded-full px-2 py-1 sm:px-3 sm:py-1.5 border border-stone-200/50 shadow-sm mb-2 mx-auto w-fit"
            style={{
              animation: "ens-float 10s ease-in-out 1s infinite both",
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#14b8a6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="text-[9px] sm:text-[10px] font-mono text-stone-500 whitespace-nowrap">
              {activeDest.slug}.zkfriendly.eth
            </span>
          </div>

          {/* Station card */}
          <div className="relative">
            <div
              className="absolute -inset-4 sm:-inset-6 rounded-3xl pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(20,184,166,0.22) 0%, transparent 70%)",
                animation: "dest-glow 10s ease-in-out 1s infinite both",
              }}
            />
            <div className="relative rounded-2xl bg-white/65 backdrop-blur-sm border border-stone-200/40 p-2 sm:p-3 shadow-[0_2px_16px_rgba(0,0,0,0.04)] w-[120px] sm:w-40 lg:w-44">
              <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2 px-1">
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#14b8a6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                  Deliver to
                </span>
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                {destChains.map((chain, i) => {
                  const isActive = i === activeIdx;
                  return (
                    <div
                      key={chain.slug}
                      className={`relative rounded-lg sm:rounded-xl px-2 py-1.5 sm:px-2.5 sm:py-2 flex items-center gap-1.5 sm:gap-2 transition-all duration-700 ${
                        isActive
                          ? "bg-white/90 shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
                          : ""
                      }`}
                    >
                      {isActive && (
                        <div
                          key={`ring-${activeIdx}`}
                          className="absolute inset-0 rounded-lg sm:rounded-xl border border-teal-200/60 pointer-events-none"
                          style={{
                            animation:
                              "dest-ring 10s ease-out 1s infinite both",
                          }}
                        />
                      )}
                      <div
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shrink-0 transition-opacity duration-700"
                        style={{
                          backgroundColor: chain.color,
                          opacity: isActive ? 1 : 0.25,
                        }}
                      >
                        <span className="text-[7px] sm:text-[9px] font-bold text-white leading-none">
                          {chain.initial}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] sm:text-xs font-medium transition-colors duration-700 ${
                          isActive ? "text-stone-700" : "text-stone-300"
                        }`}
                      >
                        {chain.name}
                      </span>
                      {isActive && (
                        <div className="ml-auto w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-teal-400 animate-pulse shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Rider ── */}
        <div
          className="absolute top-[46%] z-20 pointer-events-none"
          style={{
            animation: "ride-across 6s ease-in-out 1s infinite both",
            willChange: "transform, opacity",
          }}
        >
          <div className="relative">
            <div
              className="absolute -top-5 -left-3 w-16 h-16 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(251,191,36,0.45) 0%, rgba(251,191,36,0.1) 50%, transparent 70%)",
                animation: "package-glow 10s ease-in-out 1s infinite both",
                filter: "blur(3px)",
              }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/rider.png"
              alt=""
              className="h-16 sm:h-24 lg:h-36 w-auto"
              style={{
                filter: "drop-shadow(0 6px 20px rgba(0,0,0,0.06))",
              }}
              draggable={false}
            />
          </div>
        </div>

        {/* ── Hero bottom text ── */}
        <div
          className="absolute bottom-8 sm:bottom-12 lg:bottom-14 left-0 right-0 text-center z-20 px-6"
          style={{ animation: "fade-in-up 1s ease-out 0.5s both" }}
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-800 tracking-tight mb-3">
            Takeaway
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-stone-500 max-w-md mx-auto leading-relaxed mb-6">
            Set up{" "}
            <span className="font-mono font-semibold text-teal-600">
              {"{chain}"}.yourname.eth
            </span>{" "}
            once - receive funds from any chain to the right one, automatically.
          </p>
          {/* Scroll hint */}
          <div className="flex flex-col items-center gap-1 text-stone-300">
            <span className="text-[11px] font-medium tracking-wide uppercase">
              Learn more
            </span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-bounce"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </section>

      {/* ================================================================
          HOW IT WORKS
          ================================================================ */}
      <section className="py-20 sm:py-28 relative">
        <div className="mx-auto max-w-5xl px-6">
          <FadeIn className="text-center mb-14 sm:mb-16">
            <p className="text-xs sm:text-sm font-semibold text-teal-600 tracking-wider uppercase mb-2">
              How it works
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-800 tracking-tight">
              Three steps. That&apos;s it.
            </h2>
          </FadeIn>

          <div className="grid sm:grid-cols-3 gap-5 lg:gap-8">
            {steps.map((step, i) => (
              <FadeIn key={step.num} delay={i * 0.12}>
                <div className="rounded-2xl bg-white/50 backdrop-blur-sm border border-stone-200/30 p-5 sm:p-6 shadow-[0_2px_16px_rgba(0,0,0,0.03)] h-full">
                  <span className="text-4xl sm:text-5xl font-bold text-teal-500/[0.12] block mb-3 leading-none">
                    {step.num}
                  </span>
                  <h3 className="text-base sm:text-lg font-semibold text-stone-700 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-stone-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          WHY TAKEAWAY — value props
          ================================================================ */}
      <section className="py-20 sm:py-28 relative">
        <div className="mx-auto max-w-5xl px-6">
          <FadeIn className="text-center mb-14 sm:mb-16">
            <p className="text-xs sm:text-sm font-semibold text-teal-600 tracking-wider uppercase mb-2">
              Why Takeaway
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-800 tracking-tight">
              Set up once. Receive forever.
            </h2>
          </FadeIn>

          <div className="grid sm:grid-cols-3 gap-5 lg:gap-8">
            {values.map((v, i) => (
              <FadeIn key={v.title} delay={i * 0.12}>
                <div className="rounded-2xl bg-white/50 backdrop-blur-sm border border-stone-200/30 p-5 sm:p-6 shadow-[0_2px_16px_rgba(0,0,0,0.03)] h-full">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100/60 flex items-center justify-center text-teal-500 mb-4">
                    {v.icon}
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-stone-700 mb-2">
                    {v.title}
                  </h3>
                  <p className="text-sm text-stone-400 leading-relaxed">
                    {v.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          EXAMPLE — show the concept visually
          ================================================================ */}
      <section className="py-16 sm:py-24 relative">
        <div className="mx-auto max-w-3xl px-6">
          <FadeIn>
            <div className="rounded-2xl bg-white/50 backdrop-blur-sm border border-stone-200/30 p-6 sm:p-8 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
              <p className="text-xs sm:text-sm font-semibold text-teal-600 tracking-wider uppercase mb-4">
                Example
              </p>
              <div className="space-y-4 text-sm sm:text-base text-stone-500 leading-relaxed">
                <p>
                  You own{" "}
                  <span className="font-mono font-semibold text-stone-700">
                    zkfriendly.eth
                  </span>
                  . You configure{" "}
                  <span className="font-mono font-semibold text-teal-600">
                    arbitrum.zkfriendly.eth
                  </span>{" "}
                  to point to your Arbitrum address.
                </p>
                <p>
                  Now, anyone — from{" "}
                  <span className="font-medium text-stone-600">
                    any chain
                  </span>{" "}
                  — sends ETH to{" "}
                  <span className="font-mono text-stone-600">
                    arbitrum.zkfriendly.eth
                  </span>
                  . Our relayer picks it up, bridges it via Li.Fi, and it
                  arrives on Arbitrum.{" "}
                  <span className="font-medium text-stone-700">
                    Automatically.
                  </span>
                </p>
                <p className="text-stone-400">
                  No bridge UI. No chain switching. No second transaction. Just
                  a name and a destination.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ================================================================
          CTA
          ================================================================ */}
      <section className="py-20 sm:py-28 relative">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <FadeIn>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-800 tracking-tight mb-3">
              Ready to set up your name?
            </h2>
            <p className="text-sm sm:text-base text-stone-400 leading-relaxed mb-8 max-w-md mx-auto">
              It only takes a minute. Configure once, receive across chains
              forever.
            </p>
            <Link
              href="/setup"
              className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 transition-all duration-300"
              style={{
                background: "linear-gradient(135deg, #14b8a6, #06b6d4)",
              }}
            >
              Launch App
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14m-7-7l7 7-7 7" />
              </svg>
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ================================================================
          Footer
          ================================================================ */}
      <footer className="py-8 border-t border-stone-200/30">
        <div className="mx-auto max-w-5xl px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-stone-400">
            Built with{" "}
            <a
              href="https://ens.domains"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-500 hover:text-stone-600 transition-colors"
            >
              ENS
            </a>{" "}
            &amp;{" "}
            <a
              href="https://li.fi"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-500 hover:text-stone-600 transition-colors"
            >
              Li.Fi
            </a>
          </p>
          <span className="text-xs font-bold text-teal-600 tracking-tight">
            Takeaway
          </span>
        </div>
      </footer>
    </div>
  );
}
