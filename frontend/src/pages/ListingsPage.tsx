import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import PropertyCard from "../components/property/PropertyCard";
import FilterSidebar from "../components/listings/FilterSidebar";
import ActiveFilterChips from "../components/listings/ActiveFilterChips";
import MapView from "../components/map/MapView";
import type { PropertyFilter, PropertyCategory, ListingType } from "../types";
import { CATEGORY_META } from "../types";
import styles from "./ListingsPage.module.css";
import { useListings } from "../hooks/useListings";

type ViewMode = "grid" | "map" | "split";
type SortKey = "newest" | "oldest" | "price_asc" | "price_desc" | "views";

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ListingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>();

  // Init filters from URL params
  const [filters, setFilters] = useState<PropertyFilter>(() => ({
    category:    (searchParams.get("category") as PropertyCategory) || undefined,
    listingType: (searchParams.get("type") as ListingType) || undefined,
    state:       searchParams.get("state") || undefined,
    lga:         searchParams.get("lga") || undefined,
  }));

  // Sync filters → URL
  useEffect(() => {
    const p: Record<string, string> = {};
    if (filters.category)    p.category = filters.category;
    if (filters.listingType) p.type     = filters.listingType;
    if (filters.state)       p.state    = filters.state;
    if (filters.lga)         p.lga      = filters.lga;
    setSearchParams(p, { replace: true });
    setPage(1);
  }, [filters]);

  const updateFilters = (partial: Partial<PropertyFilter>) =>
    setFilters(f => ({ ...f, ...partial }));

  const resetFilters = () => setFilters({});

  const removeFilter = (key: keyof PropertyFilter, value?: string) => {
    setFilters(f => {
      if (key === "amenities" && value)
        return { ...f, amenities: f.amenities?.filter(a => a !== value) };
      return { ...f, [key]: undefined };
    });
  };

  // ── Live API query — all filtering/sorting/pagination done server-side ──────
  const { data, isLoading, isError } = useListings({
    ...filters,
    sortBy: sortKey,
    page,
    limit: 9,
  });

  const listings    = data?.data        ?? [];
  const pagination  = data?.pagination  ?? { total: 0, page: 1, limit: 9, totalPages: 1 };
  const totalPages  = pagination.totalPages;
  const totalCount  = pagination.total;

  const catMeta = filters.category ? CATEGORY_META[filters.category] : null;

  return (
    <div className={styles.page}>
      {/* ── Page Header ── */}
      <div className={styles.pageHeader}>
        <div className="container">
          <div className={styles.headerInner}>
            <div>
              <div className={styles.breadcrumb}>
                <a href="/" className={styles.breadcrumbLink}>Home</a>
                <span className={styles.breadcrumbSep}>›</span>
                <span>Listings</span>
                {catMeta && (
                  <>
                    <span className={styles.breadcrumbSep}>›</span>
                    <span>{catMeta.icon} {catMeta.label}</span>
                  </>
                )}
              </div>
              <h1 className={styles.pageTitle}>
                {catMeta ? `${catMeta.icon} ${catMeta.label}` : "All Properties"}
              </h1>
              <p className={styles.pageSubtitle}>
                {isLoading
                  ? "Searching…"
                  : `${totalCount.toLocaleString()} listing${totalCount !== 1 ? "s" : ""} found${filters.state ? ` in ${filters.state}` : " across Nigeria"}`
                }
              </p>
            </div>

            {/* Category quick-nav */}
            <div className={styles.catQuickNav}>
              <button
                className={[styles.catNavBtn, !filters.category ? styles.catNavActive : ""].join(" ")}
                onClick={() => updateFilters({ category: undefined })}
              >
                All
              </button>
              {(Object.entries(CATEGORY_META) as [PropertyCategory, typeof CATEGORY_META[PropertyCategory]][]).map(([key, meta]) => (
                <button
                  key={key}
                  className={[styles.catNavBtn, filters.category === key ? styles.catNavActive : ""].join(" ")}
                  onClick={() => updateFilters({ category: filters.category === key ? undefined : key })}
                  style={filters.category === key ? { borderColor: meta.color, color: meta.color, background: meta.color + "18" } : {}}
                >
                  {meta.icon} {meta.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className={`container ${styles.layout}`}>
        <FilterSidebar
          filters={filters}
          onChange={updateFilters}
          onReset={resetFilters}
          resultCount={totalCount}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className={styles.main}>
          {/* Toolbar */}
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <button className={styles.filterToggleBtn} onClick={() => setSidebarOpen(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="12" y1="18" x2="20" y2="18"/>
                </svg>
                Filters
                {Object.values(filters).filter(v => v !== undefined && !(Array.isArray(v) && v.length === 0)).length > 0 && (
                  <span className={styles.filterBadge}>
                    {Object.values(filters).filter(v => v !== undefined && !(Array.isArray(v) && v.length === 0)).length}
                  </span>
                )}
              </button>
              <p className={styles.resultCount}>
                {isLoading
                  ? "Loading…"
                  : <>Showing <strong>{listings.length}</strong> of <strong>{totalCount}</strong></>
                }
              </p>
            </div>

            <div className={styles.toolbarRight}>
              <div className={styles.sortWrap}>
                <label className={styles.sortLabel}>Sort:</label>
                <select
                  className={styles.sortSelect}
                  value={sortKey}
                  onChange={e => { setSortKey(e.target.value as SortKey); setPage(1); }}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="views">Most Viewed</option>
                </select>
              </div>

              <div className={styles.viewToggle}>
                {([
                  { mode: "grid",  label: "Grid",  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
                  { mode: "map",   label: "Map",   icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> },
                  { mode: "split", label: "Split", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="8" height="18"/><rect x="13" y="3" width="8" height="18"/></svg> },
                ] as { mode: ViewMode; icon: React.ReactNode; label: string }[]).map(({ mode, icon, label }) => (
                  <button
                    key={mode}
                    className={[styles.viewBtn, viewMode === mode ? styles.viewBtnActive : ""].join(" ")}
                    onClick={() => setViewMode(mode)}
                    title={label}
                  >
                    {icon}
                    <span className={styles.viewBtnLabel}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ActiveFilterChips filters={filters} onRemove={removeFilter} onReset={resetFilters} />

          {/* Error state */}
          {isError && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>⚠️</div>
              <h3 className={styles.emptyTitle}>Could not load listings</h3>
              <p className={styles.emptySub}>Check your connection and try again.</p>
            </div>
          )}

          {/* MAP ONLY */}
          {!isError && viewMode === "map" && (
            <div className={styles.mapOnly}>
              <MapView properties={listings} onPropertyClick={id => setSelectedId(id)} selectedId={selectedId} />
            </div>
          )}

          {/* SPLIT VIEW */}
          {!isError && viewMode === "split" && (
            <div className={styles.splitView}>
              <div className={styles.splitList}>
                {isLoading
                  ? <LoadingSkeletons />
                  : listings.length === 0
                    ? <EmptyState onReset={resetFilters} />
                    : listings.map((p: Record<string, unknown>) => (
                        <div
                          key={p.id as string}
                          className={[styles.splitCard, selectedId === p.id ? styles.splitCardActive : ""].join(" ")}
                          onClick={() => setSelectedId(p.id as string)}
                        >
                          <PropertyCard property={p as never} />
                        </div>
                      ))
                }
                {listings.length > 0 && <Pagination page={page} total={totalPages} onChange={setPage} />}
              </div>
              <div className={styles.splitMap}>
                <MapView properties={listings} onPropertyClick={setSelectedId} selectedId={selectedId} />
              </div>
            </div>
          )}

          {/* GRID VIEW */}
          {!isError && viewMode === "grid" && (
            <>
              {isLoading ? (
                <LoadingSkeletons />
              ) : listings.length === 0 ? (
                <EmptyState onReset={resetFilters} />
              ) : (
                <>
                  <div className={styles.grid}>
                    {listings.map((p: Record<string, unknown>) => (
                      <PropertyCard key={p.id as string} property={p as never} />
                    ))}
                  </div>
                  <Pagination page={page} total={totalPages} onChange={setPage} />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Loading skeletons ─────────────────────────────────────────────────────────
function LoadingSkeletons() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ height: 340, borderRadius: 12, background: "rgba(212,175,55,.06)", animation: "pulse 1.5s ease-in-out infinite" }} />
      ))}
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null;
  const pages: (number | "...")[] = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== "...") pages.push("...");
  }
  return (
    <div className={styles.pagination}>
      <button className={styles.pageBtn} onClick={() => onChange(page - 1)} disabled={page === 1}>← Prev</button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`e${i}`} className={styles.pageEllipsis}>…</span>
        ) : (
          <button
            key={p}
            className={[styles.pageBtn, page === p ? styles.pageBtnActive : ""].join(" ")}
            onClick={() => onChange(p as number)}
          >{p}</button>
        )
      )}
      <button className={styles.pageBtn} onClick={() => onChange(page + 1)} disabled={page === total}>Next →</button>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>🔍</div>
      <h3 className={styles.emptyTitle}>No properties found</h3>
      <p className={styles.emptySub}>Try adjusting your filters or search in a different area.</p>
      <button className={styles.emptyReset} onClick={onReset}>Clear all filters</button>
    </div>
  );
}
