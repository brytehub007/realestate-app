import { useState } from "react";
import type { PropertyFilter, PropertyCategory, ListingType } from "../../types";
import { CATEGORY_META, NIGERIAN_STATES } from "../../types";
import styles from "./FilterSidebar.module.css";

interface Props {
  filters:     PropertyFilter;
  onChange:    (partial: Partial<PropertyFilter>) => void;
  onReset:     () => void;
  resultCount: number;
  isOpen:      boolean;
  onClose:     () => void;
}

const LISTING_TYPES: { value: ListingType; label: string }[] = [
  { value: "sale",    label: "For Sale"  },
  { value: "rent",    label: "For Rent"  },
  { value: "lease",   label: "For Lease" },
  { value: "shortlet",label: "Shortlet"  },
];

const PRICE_PRESETS = [
  { label: "Under ₦5M",      max: 5_000_000  },
  { label: "₦5M – ₦20M",    min: 5_000_000,  max: 20_000_000  },
  { label: "₦20M – ₦50M",   min: 20_000_000, max: 50_000_000  },
  { label: "₦50M – ₦150M",  min: 50_000_000, max: 150_000_000 },
  { label: "₦150M – ₦500M", min: 150_000_000,max: 500_000_000 },
  { label: "Above ₦500M",    min: 500_000_000 },
];

export default function FilterSidebar({ filters, onChange, onReset, resultCount, isOpen, onClose }: Props) {
  const [pricePreset, setPricePreset] = useState<number | null>(null);

  const activeCount = Object.values(filters).filter(
    v => v !== undefined && !(Array.isArray(v) && v.length === 0)
  ).length;

  function applyPreset(idx: number) {
    const p = PRICE_PRESETS[idx];
    setPricePreset(idx);
    onChange({ minPrice: p.min, maxPrice: p.max });
  }

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && <div className={styles.overlay} onClick={onClose} />}

      <aside className={[styles.sidebar, isOpen ? styles.sidebarOpen : ""].join(" ")}>
        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title}>
            Filters {activeCount > 0 && <span className={styles.badge}>{activeCount}</span>}
          </h3>
          <div className={styles.headerActions}>
            {activeCount > 0 && (
              <button className={styles.resetBtn} onClick={() => { onReset(); setPricePreset(null); }}>
                Reset
              </button>
            )}
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        <div className={styles.body}>
          {/* Category */}
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Property Type</h4>
            <div className={styles.categoryGrid}>
              {(Object.entries(CATEGORY_META) as [PropertyCategory, typeof CATEGORY_META[PropertyCategory]][]).map(([key, meta]) => (
                <button
                  key={key}
                  className={[styles.catBtn, filters.category === key ? styles.catBtnActive : ""].join(" ")}
                  style={filters.category === key ? { borderColor: meta.color, background: meta.color + "18", color: meta.color } : {}}
                  onClick={() => onChange({ category: filters.category === key ? undefined : key })}
                >
                  <span className={styles.catIcon}>{meta.icon}</span>
                  <span className={styles.catLabel}>{meta.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Listing type */}
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Listing Type</h4>
            <div className={styles.chipGroup}>
              {LISTING_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  className={[styles.chip, filters.listingType === value ? styles.chipActive : ""].join(" ")}
                  onClick={() => onChange({ listingType: filters.listingType === value ? undefined : value })}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Location */}
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Location</h4>
            <select
              className={styles.select}
              value={filters.state ?? ""}
              onChange={e => onChange({ state: e.target.value || undefined, lga: undefined })}
            >
              <option value="">All States</option>
              {NIGERIAN_STATES.map(s => <option key={s}>{s}</option>)}
            </select>
            {filters.state && (
              <input
                className={styles.input}
                placeholder="LGA / Area (optional)"
                value={filters.lga ?? ""}
                onChange={e => onChange({ lga: e.target.value || undefined })}
              />
            )}
          </section>

          {/* Price */}
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Price Range</h4>
            <div className={styles.presetList}>
              {PRICE_PRESETS.map((p, i) => (
                <button
                  key={i}
                  className={[styles.presetBtn, pricePreset === i ? styles.presetActive : ""].join(" ")}
                  onClick={() => pricePreset === i ? (setPricePreset(null), onChange({ minPrice: undefined, maxPrice: undefined })) : applyPreset(i)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </section>

          {/* Bedrooms */}
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Bedrooms</h4>
            <div className={styles.chipGroup}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  className={[styles.chip, filters.bedrooms === n ? styles.chipActive : ""].join(" ")}
                  onClick={() => onChange({ bedrooms: filters.bedrooms === n ? undefined : n })}
                >
                  {n === 5 ? "5+" : n}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={onClose}>
            Show {resultCount.toLocaleString()} Result{resultCount !== 1 ? "s" : ""}
          </button>
        </div>
      </aside>
    </>
  );
}
