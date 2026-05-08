import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Zap, ArrowRight, Play, Shield, Users, Mic,
  Flame, Brain, Timer, Eye, Trophy, Swords
} from "lucide-react";
import "../CSS/landing.css";

/* ═══════════════════════════════════════════════════
   TICKER DATA — absurd debate topics
   ═══════════════════════════════════════════════════ */
const TICKER_ITEMS = [
  "Is cereal a soup?",
  "Pineapple on pizza: war crime or genius?",
  "Is water wet?",
  "Hotdog = sandwich?",
  "Tabs vs Spaces: the eternal war",
  "Is math discovered or invented?",
  "GIF: hard G or soft G?",
  "Should toilet paper face over or under?",
  "Is a straw one hole or two?",
  "Would you fight 100 duck-sized horses?",
  "Is Pluto still a planet in your heart?",
  "Does the light inside the fridge actually turn off?",
];

/* ═══════════════════════════════════════════════════
   ROAST MESSAGES — cycles on click
   ═══════════════════════════════════════════════════ */
const ROASTS = [
  "You've been staring at this page for a while. Scared to debate?",
  "Fun fact: 73% of visitors click this. You're not special.",
  "Still here? Your opponent already warmed up.",
  "This banner does nothing. You clicked it anyway. Twice.",
  "Your argument skills are like this text — going nowhere.",
  "Plot twist: the real debate was the friends we lost along the way.",
  "Congrats, you found the easter egg. It's disappointment.",
];

/* ═══════════════════════════════════════════════════
   FEATURE CARDS
   ═══════════════════════════════════════════════════ */
const FEATURES = [
  {
    icon: <Mic size={22} />,
    title: "Live Voice Battles",
    desc: "Real-time HD video. Let them watch the exact moment they lose.",
    accent: "#ff4757",
    tilt: "-1.5deg",
  },
  {
    icon: <Timer size={22} />,
    title: "Timed Rounds",
    desc: "60 seconds. No filler. Say something smart or say nothing.",
    accent: "#ffc048",
    tilt: "0deg",
  },
  {
    icon: <Eye size={22} />,
    title: "Audience Jury",
    desc: "Strangers decide your fate. Democracy at its most terrifying.",
    accent: "#3742fa",
    tilt: "1.5deg",
  },
  {
    icon: <Brain size={22} />,
    title: "AI Fact-Check",
    desc: "Our AI catches your lies in real-time. It has no chill.",
    accent: "#a855f7",
    tilt: "-1deg",
  },
  {
    icon: <Shield size={22} />,
    title: "Ego Protection™",
    desc: "Optional safe mode. Disables audience roasting. (Coward.)",
    accent: "#2ed573",
    tilt: "0.5deg",
  },
  {
    icon: <Trophy size={22} />,
    title: "Ranked Ladder",
    desc: "Climb from 'Loud Wrong' to 'Insufferably Correct'. ELO for opinions.",
    accent: "#ff6b81",
    tilt: "-0.5deg",
  },
];

/* ═══════════════════════════════════════════════════
   HOT TOPICS
   ═══════════════════════════════════════════════════ */
const HOT_TOPICS = [
  { title: "AI will replace programmers by 2027", heat: "fire", fighters: "2.4k watching" },
  { title: "Remote work makes you lazier", heat: "fire", fighters: "1.8k watching" },
  { title: "College degrees are overpriced receipts", heat: "warm", fighters: "960 watching" },
  { title: "Crypto is just gambling with extra steps", heat: "warm", fighters: "1.1k watching" },
  { title: "Linux users are just suffering on purpose", heat: "cold", fighters: "420 watching" },
];

/* ═══════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════ */
export default function LandingPage() {
  const [roastIndex, setRoastIndex] = useState(0);
  const [counters, setCounters] = useState({
    arguments: 2847,
    egos: 12043,
    facts: 0,
    uptime: 98,
  });

  // Slowly increment the "live" counters
  useEffect(() => {
    const interval = setInterval(() => {
      setCounters(prev => ({
        ...prev,
        arguments: prev.arguments + Math.floor(Math.random() * 3),
        egos: prev.egos + Math.floor(Math.random() * 5),
        facts: 0, // always zero lol
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const cycleRoast = useCallback(() => {
    setRoastIndex(i => (i + 1) % ROASTS.length);
  }, []);

  // Duplicate ticker items for seamless loop
  const tickerContent = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="landing-root">

      {/* ── Scrolling Ticker ── */}
      <div className="ticker-strip">
        <div className="ticker-track">
          {tickerContent.map((item, i) => (
            <span key={i}>{item}</span>
          ))}
        </div>
      </div>

      {/* ── HERO: VS Split ── */}
      <section className="hero-vs">
        <div className="hero-side left fade-up fade-up-d1">
          <div className="side-label">Side A — The Attacker</div>
          <div className="side-quote">"You're objectively wrong and I have receipts."</div>
          <div className="side-author">— Every debate ever, 0.3 seconds in</div>
        </div>

        <div className="vs-divider fade-up fade-up-d2">
          <div className="vs-badge">VS</div>
        </div>

        <div className="hero-side right fade-up fade-up-d3">
          <div className="side-label">Side B — The Denier</div>
          <div className="side-quote">"That's your opinion, not a fact. Google it."</div>
          <div className="side-author">— Also every debate, 0.5 seconds in</div>
        </div>
      </section>

      {/* ── Hero CTAs ── */}
      <div className="hero-bottom fade-up fade-up-d4">
        <Link to="/register" className="hero-cta primary">
          <Swords size={20} />
          Start Arguing
        </Link>
        <Link to="/dashboard" className="hero-cta secondary">
          <Play size={20} />
          Watch Live Debates
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* ── Clickable Roast Banner ── */}
      <div className="roast-banner" onClick={cycleRoast}>
        {ROASTS[roastIndex]} <span style={{ opacity: 0.4 }}>[ click me ]</span>
      </div>

      {/* ── Live Counters ── */}
      <div className="counter-strip">
        <div className="counter-item">
          <div className="counter-num" style={{ color: "#2ed573" }}>
            {counters.arguments.toLocaleString()}
          </div>
          <div className="counter-label">Arguments Started</div>
        </div>
        <div className="counter-item">
          <div className="counter-num" style={{ color: "#a855f7" }}>
            {counters.egos.toLocaleString()}
          </div>
          <div className="counter-label">Egos Demolished</div>
        </div>
        <div className="counter-item">
          <div className="counter-num" style={{ color: "#ff4757" }}>
            {counters.facts}
          </div>
          <div className="counter-label">Facts Checked</div>
        </div>
        <div className="counter-item">
          <div className="counter-num" style={{ color: "#3742fa" }}>
            {counters.uptime}%
          </div>
          <div className="counter-label">Uptime (probably)</div>
        </div>
      </div>

      {/* ── Features ── */}
      <div className="section-header">
        <h2>Built for people who can't shut up</h2>
        <p>Every feature exists because someone lost an argument and demanded it.</p>
      </div>

      <div className="features-grid">
        {FEATURES.map((f, i) => (
          <div
            key={i}
            className={`feature-card fade-up fade-up-d${i + 1}`}
            style={{ "--card-accent": f.accent, "--tilt": f.tilt }}
          >
            <div className="card-icon" style={{ color: f.accent }}>
              {f.icon}
            </div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Hot Topics ── */}
      <div className="section-header">
        <h2>🔥 Trending Arguments</h2>
        <p>Jump into a fight that's already happening. No context needed.</p>
      </div>

      <div className="hot-topics">
        {HOT_TOPICS.map((t, i) => (
          <Link to="/register" key={i} className="topic-card">
            <span className={`topic-heat ${t.heat}`}>
              {t.heat === "fire" ? "🔥 HOT" : t.heat === "warm" ? "♨️ WARM" : "🧊 COLD"}
            </span>
            <span className="topic-title">{t.title}</span>
            <span className="topic-fighters">{t.fighters}</span>
            <ArrowRight size={16} style={{ color: "var(--arena-muted)", flexShrink: 0 }} />
          </Link>
        ))}
      </div>

      {/* ── Final CTA ── */}
      <div className="final-cta">
        <h2>Still reading?<br />Your opponent isn't waiting.</h2>
        <p>Join thousands of people who turned "well, actually..." into a competitive sport.</p>
        <Link to="/register" className="hero-cta primary" style={{ fontSize: "1.1rem" }}>
          <Flame size={22} />
          Enter The Arena
        </Link>
      </div>

      {/* ── Footer ── */}
      <footer className="arena-footer">
        <span>© 2025 DEBATE.AI — for people with strong opinions and wifi</span>
        <div className="footer-links">
          <a href="#">manifesto</a>
          <a href="#">terms of combat</a>
          <a href="#">ego support</a>
        </div>
      </footer>
    </div>
  );
}
