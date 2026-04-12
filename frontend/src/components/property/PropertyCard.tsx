import { Link } from "react-router-dom";
import type { Property } from "../../types";
import styles from "./PropertyCard.module.css";

interface Props {
  property: Property;
}

const ZONING_LABELS: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  industrial: "Industrial",
  agricultural: "Agricultural",
  mixed_use: "Mixed Use",
  government_reserved: "Govt. Reserved",
};

const SOIL_LABELS: Record<string, string> = {
  dry: "Dry", swampy: "Swampy", sandy: "Sandy",
  clay: "Clay", loamy: "Loamy", rocky: "Rocky",
};

function formatPrice(price: Property["price"]): string {
  const fmt = (n: number) =>
    n >= 1_000_000
      ? `₦${(n / 1_000_000).toFixed(1)}M`
      : `₦${(n / 1_000).toFixed(0)}k`;

  if (price.type === "fixed" && price.amount) return fmt(price.amount);
  if (price.type === "range" && price.minAmount && price.maxAmount)
    return `${fmt(price.minAmount)} – ${fmt(price.maxAmount)}`;
  return "Contact for price";
}

function TierBadge({ tier }: { tier: Property["tier"] }) {
  if (tier === "verified")
    return <span className="badge badge-gold">✓ Verified</span>;
  if (tier === "premium")
    return <span className="badge badge-green">★ Premium</span>;
  return <span className="badge badge-silver">Free</span>;
}

export default function PropertyCard({ property }: Props) {
  const coverImg = property.images[0] || "/images/placeholder-land.jpg";
  const sizeParts: string[] = [];
  if (property.sizeInSqm) sizeParts.push(`${property.sizeInSqm.toLocaleString()} m²`);
  if (property.sizeInPlot) sizeParts.push(`${property.sizeInPlot} plot${property.sizeInPlot > 1 ? "s" : ""}`);

  return (
    <article className={styles.card}>
      {/* Image */}
      <Link to={`/listings/${property.id}`} className={styles.imgWrap}>
        <img src={coverImg} alt={property.title} className={styles.img} loading="lazy" />
        <div className={styles.imgOverlay} />
        <div className={styles.imgMeta}>
          <TierBadge tier={property.tier} />
          {property.boundary && (
            <span className="badge badge-silver">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="3,11 12,2 21,11 21,22 15,22 15,15 9,15 9,22 3,22"/>
              </svg>
              Boundary Mapped
            </span>
          )}
        </div>
        <div className={styles.listingTypeBadge}>
          {property.listingType === "sale" ? "For Sale"
            : property.listingType === "lease" ? "For Lease"
            : "For Rent"}
        </div>
      </Link>

      {/* Body */}
      <div className={styles.body}>
        {/* Price — always shown, never "price on call" */}
        <div className={styles.priceRow}>
          <span className={styles.price}>{formatPrice(property.price)}</span>
          {property.price.negotiable && (
            <span className={styles.negotiable}>Negotiable</span>
          )}
        </div>

        <h3 className={styles.title}>
          <Link to={`/listings/${property.id}`}>{property.title}</Link>
        </h3>

        <p className={styles.location}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          {property.lga}, {property.state}
        </p>

        {/* Size */}
        {sizeParts.length > 0 && (
          <p className={styles.size}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
            {sizeParts.join(" · ")}
          </p>
        )}

        {/* Metadata chips */}
        <div className={styles.chips}>
          <span className={styles.chip}>
            🌱 {SOIL_LABELS[property.metadata.soilType] || property.metadata.soilType}
          </span>
          <span className={styles.chip}>
            🏙️ {ZONING_LABELS[property.metadata.zoning] || property.metadata.zoning}
          </span>
          <span className={styles.chip}>
            {property.metadata.powerGrid === "on_grid" ? "⚡ On Grid"
              : property.metadata.powerGrid === "near_grid" ? "⚡ Near Grid"
              : "🔋 Off Grid"}
          </span>
        </div>

        {/* Actions */}
        <div className={styles.footer}>
          <Link to={`/listings/${property.id}`} className={styles.viewBtn}>
            View Details
          </Link>
          <button className={styles.saveBtn} aria-label="Save property">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}
