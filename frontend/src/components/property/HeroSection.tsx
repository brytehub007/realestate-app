import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./HeroSection.module.css";

const NIGERIAN_STATES = [
  "Lagos", "Abuja (FCT)", "Rivers", "Oyo", "Kano", "Anambra",
  "Enugu", "Ogun", "Delta", "Imo", "Akwa Ibom", "Cross River",
];

const LISTING_TYPES = ["For Sale", "For Lease", "For Rent"];

type TickerItem = { label: string; value: string; up: boolean };

const TICKER_DATA: TickerItem[] = [
  { label: "Lagos Land (Lekki)", value: "₦85M/plot", up: true },
  { label: "Abuja (Jabi)", value: "₦120M/plot", up: true },
  { label: "Oyo (Ibadan)", value: "₦8.5M/plot", up: false },
  { label: "Rivers (GRA)", value: "₦95M/plot", up: true },
  { label: "Enugu (Trans-Ekulu)", value: "₦12M/plot", up: true },
  { label: "Lagos (Ikorodu)", value: "₦22M/plot", up: false },
];

export default function HeroSection() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const resize = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      radius: number; alpha: number;
    }> = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 1.5 + 0.3,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212,175,55,${p.alpha})`;
        ctx.fill();
      });

      // draw connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(212,175,55,${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (state) params.set("state", state);
    if (lga) params.set("lga", lga);
    params.set("type", LISTING_TYPES[activeTab].replace("For ", "").toLowerCase());
    navigate(`/listings?${params.toString()}`);
  };

  return (
    <section className={styles.hero}>
      {/* Background layers */}
      <div className={styles.bgGradient} />
      <div className={styles.bgOverlay} />
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden />

      {/* Ticker */}
      <div className={styles.ticker}>
        <div className={styles.tickerLabel}>LIVE PRICES</div>
        <div className={styles.tickerTrack}>
          <div className={styles.tickerInner}>
            {[...TICKER_DATA, ...TICKER_DATA].map((item, i) => (
              <span key={i} className={styles.tickerItem}>
                <span className={styles.tickerCity}>{item.label}</span>
                <span className={[styles.tickerVal, item.up ? styles.up : styles.down].join(" ")}>
                  {item.up ? "▲" : "▼"} {item.value}
                </span>
                <span className={styles.tickerSep}>|</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`container ${styles.content}`}>
        <div className={styles.textBlock}>
          <p className="section-eyebrow" style={{ color: "var(--accent-gold)", justifyContent: "flex-start" }}>
            Nigeria's Most Transparent Land Marketplace
          </p>
          <h1 className={styles.heading}>
            Find Your{" "}
            <span className={styles.headingAccent}>Perfect Plot</span>
            <br />
            With Full Confidence
          </h1>
          <p className={styles.sub}>
            Every listing shows its real price. Every "Verified" title is reviewed
            by licensed professionals. From search to title transfer — all in one platform.
          </p>

          {/* Trust pills */}
          <div className={styles.trustRow}>
            {[
              { icon: "✓", text: "No 'Price on Call'" },
              { icon: "🔐", text: "MFA-Secured Sellers" },
              { icon: "⚖️", text: "Escrow Protected" },
              { icon: "📐", text: "Boundary Mapped" },
            ].map(({ icon, text }) => (
              <span key={text} className={styles.trustPill}>
                <span>{icon}</span> {text}
              </span>
            ))}
          </div>
        </div>

        {/* Search Card */}
        <div className={styles.searchCard}>
          {/* Tabs */}
          <div className={styles.tabs}>
            {LISTING_TYPES.map((t, i) => (
              <button
                key={t}
                className={[styles.tab, activeTab === i ? styles.tabActive : ""].join(" ")}
                onClick={() => setActiveTab(i)}
              >
                {t}
              </button>
            ))}
          </div>

          <div className={styles.searchBody}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label form-label-dark">State</label>
              <select
                className={`form-input form-input-dark ${styles.select}`}
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                <option value="">All States</option>
                {NIGERIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label form-label-dark">LGA / Area</label>
              <input
                type="text"
                className={`form-input form-input-dark`}
                placeholder="e.g. Lekki, Jabi, Awka South"
                value={lga}
                onChange={(e) => setLga(e.target.value)}
              />
            </div>

            <div className={styles.searchRow}>
              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label className="form-label form-label-dark">Min Price (₦)</label>
                <input
                  type="number"
                  className="form-input form-input-dark"
                  placeholder="0"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label className="form-label form-label-dark">Max Price (₦)</label>
                <input
                  type="number"
                  className="form-input form-input-dark"
                  placeholder="No limit"
                />
              </div>
            </div>

            <button className={`btn btn-primary ${styles.searchBtn}`} onClick={handleSearch}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              Search Properties
            </button>

            <p className={styles.searchHint}>
              <span className="badge badge-gold">⚡</span>&nbsp;
              4,831 active listings · Updated hourly
            </p>
          </div>
        </div>
      </div>

      {/* Stats band */}
      <div className={styles.statsBand}>
        <div className="container">
          <div className={styles.statsRow}>
            {[
              { value: "12,400+", label: "Properties Listed" },
              { value: "₦2.4T", label: "Total Value Transacted" },
              { value: "98.2%", label: "Title Verification Rate" },
              { value: "36", label: "States Covered" },
              { value: "500+", label: "Vetted Professionals" },
            ].map(({ value, label }) => (
              <div key={label} className={styles.stat}>
                <span className={styles.statVal}>{value}</span>
                <span className={styles.statLabel}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
