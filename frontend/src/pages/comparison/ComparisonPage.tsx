import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./ComparisonPage.module.css";
import { useListings } from "../../hooks/useListings";

// Normalise a raw API listing into a flat shape the comparison table needs
interface CompProp {
  id: string;
  slug: string;
  title: string;
  image: string;
  price: number;
  priceType: string;
  category: string;
  location: string;
  state: string;
  bedrooms?: number;
  bathrooms?: number;
  size: number;
  sizeUnit: string;
  tier: string;
  condition: string;
  parking: string;
  power: string;
  water: string;
  security: boolean;
  cctv: boolean;
  pool: boolean;
  gym: boolean;
  elevator: boolean;
  bq: boolean;
  garden: boolean;
  internet: boolean;
  titleDoc: string;
  yearBuilt?: number;
  views: number;
  saves: number;
  seller: string;
  sellerAvatar: string;
  sellerRating: number;
  sellerVerified: boolean;
}

function normalise(raw: Record<string, unknown>): CompProp {
  const price = raw.price as Record<string, unknown> | number | undefined;
  const priceAmount = typeof price === "number"
    ? price
    : ((price as Record<string, number>)?.amount ?? (price as Record<string, number>)?.minAmount ?? 0);
  const priceFreq  = typeof price === "object" ? ((price as Record<string, string>)?.rentFrequency ?? "") : "";
  const priceType  = priceFreq === "per_year" ? "Per Year" : priceFreq === "per_month" ? "Per Month" : priceFreq === "per_night" ? "Per Night" : "For Sale";

  const imgs  = raw.images as Record<string, string>[] | undefined;
  const specs = raw.specifications as Record<string, unknown> | undefined;
  const amen  = raw.amenities as Record<string, unknown> | undefined;
  const owner = raw.owner as Record<string, unknown> | undefined;

  const seller = owner
    ? `${owner.firstName ?? ""} ${owner.lastName ?? ""}`.trim()
    : "Seller";
  const sellerInitials = owner
    ? `${String(owner.firstName ?? "")[0] ?? ""}${String(owner.lastName ?? "")[0] ?? ""}`.toUpperCase()
    : "??";

  return {
    id:             raw.id as string,
    slug:           (raw.slug as string) ?? (raw.id as string),
    title:          raw.title as string,
    image:          imgs?.[0]?.url ?? "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&q=80",
    price:          priceAmount,
    priceType,
    category:       raw.category as string ?? "—",
    location:       [raw.address, raw.neighbourhood].filter(Boolean).join(", ") as string ?? "",
    state:          raw.state as string ?? "",
    bedrooms:       (specs?.bedrooms as number) ?? (raw.bedrooms as number) ?? undefined,
    bathrooms:      (specs?.bathrooms as number) ?? (raw.bathrooms as number) ?? undefined,
    size:           (specs?.floorArea as number) ?? (raw.size as number) ?? (raw.sizeInSqm as number) ?? 0,
    sizeUnit:       "sqm",
    tier:           raw.tier as string ?? "free",
    condition:      (specs?.condition as string) ?? (raw.condition as string) ?? "—",
    parking:        (specs?.parkingType as string) ?? (amen?.parking as string) ?? "",
    power:          (specs?.powerSupply as string) ?? (amen?.power as string) ?? "—",
    water:          (specs?.waterSupply as string) ?? (amen?.water as string) ?? "—",
    security:       !!(amen?.security),
    cctv:           !!(amen?.cctv),
    pool:           !!(amen?.pool ?? amen?.swimmingPool),
    gym:            !!(amen?.gym),
    elevator:       !!(amen?.elevator),
    bq:             !!(amen?.bq ?? amen?.boysQuarters),
    garden:         !!(amen?.garden),
    internet:       !!(amen?.internet ?? amen?.wifi),
    titleDoc:       (raw.titleDocument as string) ?? (raw.titleDoc as string) ?? "—",
    yearBuilt:      (specs?.yearBuilt as number) ?? undefined,
    views:          (raw.views as number) ?? 0,
    saves:          (raw.saves as number) ?? 0,
    seller,
    sellerAvatar:   sellerInitials,
    sellerRating:   (owner?.rating as number) ?? 0,
    sellerVerified: !!(owner as Record<string, boolean>)?.isVerified,
  };
}

const TIER_META: Record<string, { label: string; color: string }> = {
  free:     { label: "Standard", color: "#888" },
  verified: { label: "Verified", color: "#3d7a3d" },
  premium:  { label: "Premium",  color: "#d4af37" },
};

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `₦${(n/1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `₦${(n/1_000_000).toFixed(0)}M`;
  return `₦${(n/1_000).toFixed(0)}k`;
}

function Check({ v }: { v: boolean }) {
  return <span className={v ? styles.checkYes : styles.checkNo}>{v ? "✓" : "✗"}</span>;
}

type Slot = CompProp | null;

export default function ComparisonPage() {
  // Fetch up to 20 listings to populate the picker
  const { data, isLoading } = useListings({ limit: 20 });
  const rawListings = (data?.data ?? []) as Record<string, unknown>[];
  const available: CompProp[] = rawListings.map(normalise);

  const [slots, setSlots] = useState<[Slot, Slot, Slot]>([null, null, null]);
  const [pickerFor, setPickerFor] = useState<0 | 1 | 2 | null>(null);
  const [search, setSearch] = useState("");

  // Pre-fill first two slots once data loads (once only)
  const [prefilled, setPrefilled] = useState(false);
  if (!prefilled && available.length >= 2) {
    setSlots([available[0], available[1], null]);
    setPrefilled(true);
  }

  function selectProp(slotIdx: 0 | 1 | 2, prop: CompProp) {
    setSlots(prev => {
      const next: [Slot, Slot, Slot] = [...prev] as [Slot, Slot, Slot];
      const existing = next.findIndex(s => s?.id === prop.id);
      if (existing !== -1 && existing !== slotIdx) next[existing] = null;
      next[slotIdx] = prop;
      return next;
    });
    setPickerFor(null);
    setSearch("");
  }

  function removeSlot(idx: 0 | 1 | 2) {
    setSlots(prev => {
      const next: [Slot, Slot, Slot] = [...prev] as [Slot, Slot, Slot];
      next[idx] = null;
      return next;
    });
  }

  const activeSlots = slots.filter(Boolean) as CompProp[];
  const pickerList = available
    .filter(p => !slots.some(s => s?.id === p.id))
    .filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.state.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerInner}>
          <div>
            <h1 className={styles.pageTitle}>Property Comparison</h1>
            <p className={styles.pageSub}>Compare up to 3 properties side by side</p>
          </div>
          <div className={styles.activeCount}>{activeSlots.length} of 3 selected</div>
        </div>
      </div>

      <div className={styles.container}>
        {/* Property selector row */}
        <div className={styles.selectorRow} style={{ gridTemplateColumns: "240px repeat(3, 1fr)" }}>
          <div className={styles.selectorLabel}>Comparing</div>
          {([0, 1, 2] as const).map(idx => (
            <div key={idx} className={styles.selectorCell}>
              {slots[idx] ? (
                <div className={styles.selectedProp}>
                  <img src={slots[idx]!.image} alt="" className={styles.selectedImg} />
                  <div className={styles.selectedInfo}>
                    <div className={styles.selectedTitle}>{slots[idx]!.title}</div>
                    <div className={styles.selectedLoc}>{slots[idx]!.state}</div>
                  </div>
                  <button className={styles.removeBtn} onClick={() => removeSlot(idx)}>✕</button>
                </div>
              ) : (
                <button className={styles.addSlotBtn} onClick={() => setPickerFor(idx)}>
                  <span className={styles.addSlotIcon}>+</span>
                  <span className={styles.addSlotLabel}>
                    {isLoading ? "Loading…" : "Add property"}
                  </span>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div className={styles.table}>

          {/* Price */}
          <div className={styles.tableSection}>
            <div className={styles.sectionHead}>💰 Price</div>
            {[
              { label: "Asking Price", render: (s: CompProp) => (
                <span className={styles.priceVal}>{fmt(s.price)}<span className={styles.priceType}> / {s.priceType}</span></span>
              )},
              { label: "Price per sqm", render: (s: CompProp) => s.size > 0 ? fmt(Math.round(s.price / s.size)) + "/sqm" : "—" },
            ].map(row => (
              <div key={row.label} className={styles.tableRow} style={{ gridTemplateColumns: "240px repeat(3, 1fr)" }}>
                <div className={styles.rowLabel}>{row.label}</div>
                {slots.map((s, i) => (
                  <div key={i} className={styles.rowCell}>{s ? row.render(s) : <span className={styles.empty}>—</span>}</div>
                ))}
              </div>
            ))}
          </div>

          {/* Overview */}
          <div className={styles.tableSection}>
            <div className={styles.sectionHead}>🏠 Overview</div>
            {[
              { label: "Category",       render: (s: CompProp) => s.category },
              { label: "Location",       render: (s: CompProp) => [s.location, s.state].filter(Boolean).join(", ") || "—" },
              { label: "Size",           render: (s: CompProp) => s.size ? `${s.size.toLocaleString()} ${s.sizeUnit}` : "—" },
              { label: "Bedrooms",       render: (s: CompProp) => s.bedrooms != null ? String(s.bedrooms) : "N/A" },
              { label: "Bathrooms",      render: (s: CompProp) => s.bathrooms != null ? String(s.bathrooms) : "N/A" },
              { label: "Condition",      render: (s: CompProp) => s.condition },
              { label: "Year Built",     render: (s: CompProp) => s.yearBuilt ? String(s.yearBuilt) : "N/A" },
              { label: "Title Document", render: (s: CompProp) => s.titleDoc },
              { label: "Listing Tier",   render: (s: CompProp) => (
                <span style={{ color: (TIER_META[s.tier] ?? TIER_META.free).color, fontWeight: 700 }}>
                  {(TIER_META[s.tier] ?? TIER_META.free).label}
                </span>
              )},
            ].map(row => (
              <div key={row.label} className={styles.tableRow} style={{ gridTemplateColumns: "240px repeat(3, 1fr)" }}>
                <div className={styles.rowLabel}>{row.label}</div>
                {slots.map((s, i) => (
                  <div key={i} className={styles.rowCell}>{s ? row.render(s) : <span className={styles.empty}>—</span>}</div>
                ))}
              </div>
            ))}
          </div>

          {/* Utilities */}
          <div className={styles.tableSection}>
            <div className={styles.sectionHead}>⚡ Utilities & Infrastructure</div>
            {[
              { label: "Power Supply", render: (s: CompProp) => s.power },
              { label: "Water Supply", render: (s: CompProp) => s.water },
              { label: "Parking",      render: (s: CompProp) => s.parking || "N/A" },
            ].map(row => (
              <div key={row.label} className={styles.tableRow} style={{ gridTemplateColumns: "240px repeat(3, 1fr)" }}>
                <div className={styles.rowLabel}>{row.label}</div>
                {slots.map((s, i) => (
                  <div key={i} className={styles.rowCell}>{s ? row.render(s) : <span className={styles.empty}>—</span>}</div>
                ))}
              </div>
            ))}
          </div>

          {/* Amenities */}
          <div className={styles.tableSection}>
            <div className={styles.sectionHead}>✨ Amenities</div>
            {[
              { label: "Security",          render: (s: CompProp) => <Check v={s.security} /> },
              { label: "CCTV",             render: (s: CompProp) => <Check v={s.cctv} /> },
              { label: "Swimming Pool",    render: (s: CompProp) => <Check v={s.pool} /> },
              { label: "Gym",              render: (s: CompProp) => <Check v={s.gym} /> },
              { label: "Elevator",         render: (s: CompProp) => <Check v={s.elevator} /> },
              { label: "Boys' Quarters",   render: (s: CompProp) => <Check v={s.bq} /> },
              { label: "Garden",           render: (s: CompProp) => <Check v={s.garden} /> },
              { label: "Internet",         render: (s: CompProp) => <Check v={s.internet} /> },
            ].map(row => (
              <div key={row.label} className={styles.tableRow} style={{ gridTemplateColumns: "240px repeat(3, 1fr)" }}>
                <div className={styles.rowLabel}>{row.label}</div>
                {slots.map((s, i) => (
                  <div key={i} className={styles.rowCell}>{s ? row.render(s) : <span className={styles.empty}>—</span>}</div>
                ))}
              </div>
            ))}
          </div>

          {/* Engagement */}
          <div className={styles.tableSection}>
            <div className={styles.sectionHead}>📊 Engagement</div>
            {[
              { label: "Total Views", render: (s: CompProp) => s.views.toLocaleString() },
              { label: "Saved By",    render: (s: CompProp) => `${s.saves} users` },
            ].map(row => (
              <div key={row.label} className={styles.tableRow} style={{ gridTemplateColumns: "240px repeat(3, 1fr)" }}>
                <div className={styles.rowLabel}>{row.label}</div>
                {slots.map((s, i) => (
                  <div key={i} className={styles.rowCell}>{s ? row.render(s) : <span className={styles.empty}>—</span>}</div>
                ))}
              </div>
            ))}
          </div>

          {/* Seller */}
          <div className={styles.tableSection}>
            <div className={styles.sectionHead}>👤 Seller / Agent</div>
            {[
              { label: "Name",     render: (s: CompProp) => s.seller },
              { label: "Rating",   render: (s: CompProp) => s.sellerRating ? `★ ${s.sellerRating}` : "—" },
              { label: "Verified", render: (s: CompProp) => <Check v={s.sellerVerified} /> },
            ].map(row => (
              <div key={row.label} className={styles.tableRow} style={{ gridTemplateColumns: "240px repeat(3, 1fr)" }}>
                <div className={styles.rowLabel}>{row.label}</div>
                {slots.map((s, i) => (
                  <div key={i} className={styles.rowCell}>{s ? row.render(s) : <span className={styles.empty}>—</span>}</div>
                ))}
              </div>
            ))}
          </div>

          {/* CTA row */}
          <div className={styles.tableRow} style={{ gridTemplateColumns: "240px repeat(3, 1fr)" }}>
            <div className={styles.rowLabel} />
            {slots.map((s, i) => (
              <div key={i} className={styles.rowCell}>
                {s ? (
                  <div className={styles.ctaCell}>
                    <Link to={`/listings/${s.slug}`} className={styles.viewBtn}>View Listing →</Link>
                    <button className={styles.saveBtn}>♡ Save</button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Property picker modal */}
      {pickerFor !== null && (
        <>
          <div className={styles.pickerBackdrop} onClick={() => setPickerFor(null)} />
          <div className={styles.picker}>
            <div className={styles.pickerHead}>
              <h3 className={styles.pickerTitle}>Add a property to compare</h3>
              <button className={styles.pickerClose} onClick={() => setPickerFor(null)}>✕</button>
            </div>
            <div className={styles.pickerSearch}>
              <input
                className={styles.pickerSearchInput}
                placeholder="Search by title or state…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className={styles.pickerList}>
              {isLoading && <p className={styles.pickerEmpty}>Loading listings…</p>}
              {!isLoading && pickerList.length === 0 && (
                <p className={styles.pickerEmpty}>
                  {search ? "No listings match your search." : "All available listings are already in the comparison."}
                </p>
              )}
              {pickerList.map(p => (
                <button key={p.id} className={styles.pickerItem} onClick={() => selectProp(pickerFor, p)}>
                  <img src={p.image} alt="" className={styles.pickerImg} />
                  <div>
                    <div className={styles.pickerPropTitle}>{p.title}</div>
                    <div className={styles.pickerPropLoc}>{[p.location, p.state].filter(Boolean).join(", ")}</div>
                    <div className={styles.pickerPropPrice}>{fmt(p.price)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
