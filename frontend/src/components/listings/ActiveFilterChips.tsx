import type { PropertyFilter } from "../../types";
import { CATEGORY_META } from "../../types";
import styles from "./ActiveFilterChips.module.css";

interface Props {
  filters:  PropertyFilter;
  onRemove: (key: keyof PropertyFilter, value?: string) => void;
  onReset:  () => void;
}

function fmt(n: number) {
  return n >= 1_000_000_000 ? `₦${(n / 1_000_000_000).toFixed(1)}B`
    : n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(0)}M`
    : `₦${(n / 1_000).toFixed(0)}k`;
}

export default function ActiveFilterChips({ filters, onRemove, onReset }: Props) {
  const chips: { key: keyof PropertyFilter; label: string; value?: string }[] = [];

  if (filters.category) {
    const meta = CATEGORY_META[filters.category];
    chips.push({ key: "category", label: `${meta.icon} ${meta.label}` });
  }
  if (filters.listingType) chips.push({ key: "listingType", label: filters.listingType.replace("_", " ") });
  if (filters.state)       chips.push({ key: "state",       label: filters.state });
  if (filters.lga)         chips.push({ key: "lga",         label: filters.lga });
  if (filters.bedrooms)    chips.push({ key: "bedrooms",    label: `${filters.bedrooms}+ beds` });
  if (filters.minPrice || filters.maxPrice) {
    const label = filters.minPrice && filters.maxPrice
      ? `${fmt(filters.minPrice)} – ${fmt(filters.maxPrice)}`
      : filters.minPrice ? `From ${fmt(filters.minPrice)}`
      : `Up to ${fmt(filters.maxPrice!)}`;
    chips.push({ key: "minPrice", label });
  }

  if (chips.length === 0) return null;

  return (
    <div className={styles.wrap}>
      {chips.map(c => (
        <span key={c.key} className={styles.chip}>
          {c.label}
          <button className={styles.remove} onClick={() => onRemove(c.key, c.value)}>✕</button>
        </span>
      ))}
      {chips.length > 1 && (
        <button className={styles.clearAll} onClick={onReset}>Clear all</button>
      )}
    </div>
  );
}
