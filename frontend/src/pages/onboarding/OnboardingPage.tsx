import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./OnboardingPage.module.css";

type OwnerType = "individual" | "organization" | "";
type Category = "buy" | "rent" | "land" | "commercial" | "shortlet" | "estate" | "uncompleted" | "exhibition";

const CATEGORIES: { key: Category; icon: string; label: string; desc: string }[] = [
  { key: "buy",        icon: "🏠", label: "Buy",         desc: "Residential purchase" },
  { key: "rent",       icon: "🔑", label: "Rent",        desc: "Residential rental" },
  { key: "land",       icon: "🌍", label: "Land",        desc: "Plots & land" },
  { key: "commercial", icon: "🏢", label: "Commercial",  desc: "Business properties" },
  { key: "shortlet",   icon: "🏨", label: "Short Let",   desc: "Temporary stays" },
  { key: "estate",     icon: "🏘️", label: "Estate",      desc: "Housing communities" },
  { key: "uncompleted",icon: "🏗️", label: "Uncompleted", desc: "Under construction" },
  { key: "exhibition", icon: "🎪", label: "Exhibition",  desc: "Event spaces" },
];

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT - Abuja","Gombe",
  "Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara",
  "Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau",
  "Rivers","Sokoto","Taraba","Yobe","Zamfara",
];

const PRICE_PRESETS: { label: string; min: number; max: number }[] = [
  { label: "Under ₦5M",     min: 0,         max: 5_000_000 },
  { label: "₦5M – ₦20M",   min: 5_000_000, max: 20_000_000 },
  { label: "₦20M – ₦50M",  min: 20_000_000,max: 50_000_000 },
  { label: "₦50M – ₦150M", min: 50_000_000,max: 150_000_000 },
  { label: "₦150M+",        min: 150_000_000,max: 0 },
];

function fmtNum(n: number): string {
  if (!n) return "";
  if (n >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}k`;
  return `₦${n}`;
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 4;

  // Step 1 — Location
  const [state, setState] = useState("");
  const [city, setCity] = useState("");

  // Step 2 — Categories
  const [categories, setCategories] = useState<Category[]>([]);

  // Step 3 — Price
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [pricePreset, setPricePreset] = useState<number | null>(null);

  // Step 4 — Owner type
  const [ownerType, setOwnerType] = useState<OwnerType>("");
  const [alertEmail, setAlertEmail] = useState(true);
  const [alertSms, setAlertSms] = useState(false);

  function toggleCat(k: Category) {
    setCategories(prev =>
      prev.includes(k) ? prev.filter(c => c !== k) : [...prev, k]
    );
  }

  function applyPreset(idx: number) {
    const p = PRICE_PRESETS[idx];
    setMinPrice(p.min ? String(p.min) : "");
    setMaxPrice(p.max ? String(p.max) : "");
    setPricePreset(idx);
  }

  function finish() {
    navigate("/listings");
  }

  const stepTitles = [
    "Where are you looking?",
    "What interests you?",
    "What's your budget?",
    "Almost done!",
  ];
  const stepIcons = ["📍","🏠","💰","🎯"];

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Progress header */}
        <div className={styles.progressBar}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={[styles.progressSeg, i < step ? styles.progressDone : i === step - 1 ? styles.progressActive : ""].join(" ")}
            />
          ))}
        </div>

        <div className={styles.stepMeta}>
          <span className={styles.stepIcon}>{stepIcons[step - 1]}</span>
          <span className={styles.stepCount}>Step {step} of {TOTAL_STEPS}</span>
        </div>

        <h1 className={styles.title}>{stepTitles[step - 1]}</h1>

        {/* STEP 1 — Location */}
        {step === 1 && (
          <div className={styles.stepBody}>
            <p className={styles.stepDesc}>We'll show you listings that match your preferred locations first.</p>
            <div className={styles.field}>
              <label className={styles.label}>State</label>
              <select className={styles.select} value={state} onChange={e => setState(e.target.value)}>
                <option value="">Select a state…</option>
                {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                <option value="international">🌍 International</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>City / Area / Neighbourhood</label>
              <input
                className={styles.input}
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. Lekki Phase 1, Jabi, Maitama…"
              />
            </div>
            <div className={styles.skipNote}>
              Searching multiple locations? You can refine further in the listings filters.
            </div>
          </div>
        )}

        {/* STEP 2 — Categories */}
        {step === 2 && (
          <div className={styles.stepBody}>
            <p className={styles.stepDesc}>Select all that apply — you can browse any category any time.</p>
            <div className={styles.catGrid}>
              {CATEGORIES.map(c => (
                <button
                  key={c.key}
                  className={[styles.catCard, categories.includes(c.key) ? styles.catCardOn : ""].join(" ")}
                  onClick={() => toggleCat(c.key)}
                >
                  <span className={styles.catIcon}>{c.icon}</span>
                  <span className={styles.catLabel}>{c.label}</span>
                  <span className={styles.catDesc}>{c.desc}</span>
                  {categories.includes(c.key) && <span className={styles.catCheck}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3 — Budget */}
        {step === 3 && (
          <div className={styles.stepBody}>
            <p className={styles.stepDesc}>Set your price range to see the most relevant listings.</p>
            <div className={styles.presetGrid}>
              {PRICE_PRESETS.map((p, i) => (
                <button
                  key={i}
                  className={[styles.presetBtn, pricePreset === i ? styles.presetBtnOn : ""].join(" ")}
                  onClick={() => applyPreset(i)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className={styles.orDivider}><span>or enter custom range</span></div>
            <div className={styles.priceRow}>
              <div className={styles.field}>
                <label className={styles.label}>Minimum (₦)</label>
                <input
                  className={styles.input}
                  type="number"
                  value={minPrice}
                  onChange={e => { setMinPrice(e.target.value); setPricePreset(null); }}
                  placeholder="0"
                />
                {minPrice && <span className={styles.priceHint}>{fmtNum(Number(minPrice))}</span>}
              </div>
              <div className={styles.priceSep}>—</div>
              <div className={styles.field}>
                <label className={styles.label}>Maximum (₦)</label>
                <input
                  className={styles.input}
                  type="number"
                  value={maxPrice}
                  onChange={e => { setMaxPrice(e.target.value); setPricePreset(null); }}
                  placeholder="No limit"
                />
                {maxPrice && <span className={styles.priceHint}>{fmtNum(Number(maxPrice))}</span>}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 — Owner type + alerts */}
        {step === 4 && (
          <div className={styles.stepBody}>
            <p className={styles.stepDesc}>Tell us about yourself so we can personalise your experience.</p>

            <div className={styles.field}>
              <label className={styles.label}>I'm looking to buy/rent from…</label>
              <div className={styles.ownerRow}>
                {[
                  { key: "individual" as OwnerType, icon: "👤", label: "Individual", desc: "Private sellers, landlords and direct owners" },
                  { key: "organization" as OwnerType, icon: "🏢", label: "Organisation", desc: "Developers, estates & commercial entities" },
                ].map(o => (
                  <button
                    key={o.key}
                    className={[styles.ownerCard, ownerType === o.key ? styles.ownerCardOn : ""].join(" ")}
                    onClick={() => setOwnerType(o.key)}
                  >
                    <span className={styles.ownerIcon}>{o.icon}</span>
                    <span className={styles.ownerLabel}>{o.label}</span>
                    <span className={styles.ownerDesc}>{o.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Property alert preferences</label>
              <div className={styles.alertOptions}>
                <label className={styles.alertOption}>
                  <input type="checkbox" checked={alertEmail} onChange={e => setAlertEmail(e.target.checked)} className={styles.alertCheck} />
                  <div>
                    <span className={styles.alertOptionLabel}>📧 Email alerts</span>
                    <span className={styles.alertOptionDesc}>Daily digest of new matching listings</span>
                  </div>
                </label>
                <label className={styles.alertOption}>
                  <input type="checkbox" checked={alertSms} onChange={e => setAlertSms(e.target.checked)} className={styles.alertCheck} />
                  <div>
                    <span className={styles.alertOptionLabel}>📱 SMS alerts</span>
                    <span className={styles.alertOptionDesc}>Instant alerts for high-demand areas</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Summary */}
            <div className={styles.summary}>
              <div className={styles.summaryTitle}>Your search profile</div>
              {(state || city) && <div className={styles.summaryRow}><span>📍</span> {[city, state].filter(Boolean).join(", ")}</div>}
              {categories.length > 0 && <div className={styles.summaryRow}><span>🏠</span> {categories.map(c => CATEGORIES.find(x => x.key === c)?.label).join(", ")}</div>}
              {(minPrice || maxPrice) && <div className={styles.summaryRow}><span>💰</span> {minPrice ? fmtNum(Number(minPrice)) : "No min"} — {maxPrice ? fmtNum(Number(maxPrice)) : "No max"}</div>}
              {ownerType && <div className={styles.summaryRow}><span>{ownerType === "individual" ? "👤" : "🏢"}</span> {ownerType === "individual" ? "Individual owners" : "Organisations"}</div>}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className={styles.navRow}>
          {step > 1 ? (
            <button className={styles.backBtn} onClick={() => setStep(s => s - 1)}>← Back</button>
          ) : (
            <button className={styles.skipBtn} onClick={finish}>Skip setup</button>
          )}
          {step < TOTAL_STEPS ? (
            <button className={styles.nextBtn} onClick={() => setStep(s => s + 1)}>
              Continue →
            </button>
          ) : (
            <button className={styles.finishBtn} onClick={finish}>
              Find Properties →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
