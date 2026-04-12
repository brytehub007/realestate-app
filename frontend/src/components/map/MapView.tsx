import { useState } from "react";
import styles from "./MapView.module.css";

interface Property {
  id:        string;
  title:     string;
  price?:    number | string;
  state?:    string;
  lga?:      string;
  latitude?:  number;
  longitude?: number;
  images?:   { url: string }[];
}

interface Props {
  properties:      Property[];
  onPropertyClick: (id: string) => void;
  selectedId?:     string;
}

function fmt(n: number | string | undefined) {
  if (!n) return "Price TBD";
  const num = typeof n === "string" ? parseFloat(n) : n;
  return num >= 1_000_000_000 ? `₦${(num / 1_000_000_000).toFixed(1)}B`
    : num >= 1_000_000 ? `₦${(num / 1_000_000).toFixed(1)}M`
    : `₦${num.toLocaleString()}`;
}

export default function MapView({ properties, onPropertyClick, selectedId }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  // Group properties by state for the visual layout
  const byState = properties.reduce<Record<string, Property[]>>((acc, p) => {
    const key = p.state ?? "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div className={styles.wrap}>
      {/* Map placeholder — shows clustered pins by state */}
      <div className={styles.mapBg}>
        <div className={styles.mapLabel}>
          <span>🗺️</span>
          <p>Interactive map</p>
          <p className={styles.mapSub}>
            {properties.length} propert{properties.length !== 1 ? "ies" : "y"} in view
          </p>
          <p className={styles.mapNote}>
            Add a Mapbox token in <code>.env</code> as <code>VITE_MAPBOX_TOKEN</code> to enable the full map
          </p>
        </div>

        {/* Render property "pins" as floating cards */}
        {Object.entries(byState).map(([state, props], si) => (
          <div key={state} className={styles.stateCluster} style={{ top: `${20 + si * 18}%`, left: `${15 + si * 12}%` }}>
            <div className={styles.clusterBubble}>{props.length}</div>
            <div className={styles.clusterLabel}>{state}</div>

            {/* Expanded pins when cluster hovered */}
            {props.map((p, pi) => (
              <button
                key={p.id}
                className={[
                  styles.pin,
                  selectedId === p.id ? styles.pinSelected : "",
                  hovered === p.id ? styles.pinHovered : "",
                ].join(" ")}
                style={{ top: `${30 + pi * 44}px`, left: `${-10 + pi * 8}px` }}
                onClick={() => onPropertyClick(p.id)}
                onMouseEnter={() => setHovered(p.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <span className={styles.pinPrice}>{fmt(p.price)}</span>
                {hovered === p.id && (
                  <div className={styles.pinTooltip}>
                    <strong>{p.title}</strong>
                    <span>{p.lga ? `${p.lga}, ` : ""}{p.state}</span>
                    <span className={styles.pinTooltipPrice}>{fmt(p.price)}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        ))}

        {properties.length === 0 && (
          <div className={styles.empty}>No properties to display on map</div>
        )}
      </div>
    </div>
  );
}
