import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type {
  PropertyCategory, ListingType, PropertySubtype,
  SoilType, ZoningType, PowerGridProximity, FurnishingStatus,
} from "../types";
import { CATEGORY_META, NIGERIAN_STATES } from "../types";
import styles from "./CreateListingPage.module.css";
import toast from "react-hot-toast";
import { useCreateListing, usePublishListing } from "../hooks/useListings";
import { useUploadImages, useUploadDocument } from "../hooks/useUpload";

// ── Types ─────────────────────────────────────────────────────────────────────
type ListingTier = "free" | "verified" | "premium" | "developer";

interface FormState {
  // Step 1 – Category
  category: PropertyCategory | "";
  // Step 2 – Basics
  title: string;
  description: string;
  listingType: ListingType | "";
  subtype: string;
  // Step 3 – Location
  state: string;
  lga: string;
  address: string;
  neighbourhood: string;
  coordinates: { lat: string; lng: string };
  hasBoundary: boolean;
  // Step 4 – Specs (land)
  sizeInSqm: string;
  sizeInPlot: string;
  sizeInHectare: string;
  soilType: SoilType | "";
  topography: string;
  zoning: ZoningType | "";
  powerGrid: PowerGridProximity | "";
  waterSupply: boolean;
  roadAccess: boolean;
  floodRisk: string;
  fenced: boolean;
  gateAccess: boolean;
  nearbyLandmarks: string;
  // Step 4 – Specs (building)
  floorArea: string;
  landArea: string;
  bedrooms: string;
  bathrooms: string;
  toilets: string;
  sittingRooms: string;
  totalFloors: string;
  floorLevel: string;
  parkingType: string;
  parkingSpaces: string;
  furnishing: FurnishingStatus | "";
  condition: string;
  powerSupply: string;
  waterSupplyBuilding: string;
  estateName: string;
  yearBuilt: string;
  ceilingHeight: string;
  // Amenities
  amenities: Record<string, boolean>;
  // Step 4 – Shortlet extras
  maxGuests: string;
  minNights: string;
  petsAllowed: boolean;
  // Step 5 – Price
  priceType: "fixed" | "range";
  amount: string;
  minAmount: string;
  maxAmount: string;
  negotiable: boolean;
  rentFrequency: string;
  cautionFee: string;
  agencyFee: string;
  serviceCharge: string;
  legalFee: string;
  // Step 6 – Media
  images: File[];
  videoUrl: string;
  virtualTourUrl: string;
  // Step 7 – Documents
  documents: { file: File; docType: string; name: string }[];
  // Step 8 – Tier
  tier: ListingTier;
}

const INIT: FormState = {
  category: "", title: "", description: "", listingType: "", subtype: "",
  state: "", lga: "", address: "", neighbourhood: "",
  coordinates: { lat: "", lng: "" }, hasBoundary: false,
  sizeInSqm: "", sizeInPlot: "", sizeInHectare: "",
  soilType: "", topography: "", zoning: "", powerGrid: "",
  waterSupply: false, roadAccess: true, floodRisk: "none", fenced: false, gateAccess: false, nearbyLandmarks: "",
  floorArea: "", landArea: "", bedrooms: "", bathrooms: "", toilets: "", sittingRooms: "",
  totalFloors: "", floorLevel: "", parkingType: "compound", parkingSpaces: "1",
  furnishing: "", condition: "good", powerSupply: "partial", waterSupplyBuilding: "borehole",
  estateName: "", yearBuilt: "", ceilingHeight: "",
  amenities: {},
  maxGuests: "", minNights: "1", petsAllowed: false,
  priceType: "fixed", amount: "", minAmount: "", maxAmount: "",
  negotiable: false, rentFrequency: "per_year",
  cautionFee: "", agencyFee: "", serviceCharge: "", legalFee: "",
  images: [], videoUrl: "", virtualTourUrl: "",
  documents: [],
  tier: "free",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className={styles.label}>
      {children}{required && <span className={styles.req}>*</span>}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return <input {...props} className={[styles.input, props.className].filter(Boolean).join(" ")} />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { className?: string }) {
  return <select {...props} className={[styles.select, props.className].filter(Boolean).join(" ")} />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={styles.textarea} />;
}

function FormRow({ children, half }: { children: React.ReactNode; half?: boolean }) {
  return <div className={half ? styles.rowHalf : styles.row}>{children}</div>;
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className={styles.fieldGroup}>{children}</div>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" className={[styles.toggle, checked ? styles.toggleOn : ""].join(" ")} onClick={onChange}>
      <span className={styles.toggleKnob} />
      <span className={styles.toggleLabel}>{label}</span>
    </button>
  );
}

function AmenityCheck({ icon, label, checked, onChange }: { icon: string; label: string; checked: boolean; onChange: () => void }) {
  return (
    <button type="button" className={[styles.amenityBtn, checked ? styles.amenityBtnOn : ""].join(" ")} onClick={onChange}>
      <span>{icon}</span> {label}
      {checked && <span className={styles.amenityChk}>✓</span>}
    </button>
  );
}

const STEP_LABELS = [
  { n: 1, label: "Category",  icon: "🏷️" },
  { n: 2, label: "Basics",    icon: "📝" },
  { n: 3, label: "Location",  icon: "📍" },
  { n: 4, label: "Specs",     icon: "📐" },
  { n: 5, label: "Pricing",   icon: "💰" },
  { n: 6, label: "Media",     icon: "🖼️" },
  { n: 7, label: "Documents", icon: "📄" },
  { n: 8, label: "Tier",      icon: "⭐" },
  { n: 9, label: "Review",    icon: "✅" },
];

// ── Subtypes by category ───────────────────────────────────────────────────
const SUBTYPES: Record<string, [string, string][]> = {
  land:        [["residential_plot","Residential Plot"],["commercial_plot","Commercial Plot"],["farmland","Farmland"],["industrial","Industrial Land"],["waterfront","Waterfront"],["corner_piece","Corner Piece"]],
  house:       [["detached_duplex","Detached Duplex"],["semi_detached_duplex","Semi-Detached Duplex"],["terrace_bungalow","Terrace Bungalow"],["detached_bungalow","Detached Bungalow"],["townhouse","Townhouse"],["mansion","Mansion"],["villa","Villa"]],
  apartment:   [["self_contain","Self-Contain"],["one_bedroom","1-Bedroom"],["two_bedroom","2-Bedroom"],["three_bedroom","3-Bedroom"],["four_bedroom","4-Bedroom"],["studio","Studio"],["penthouse","Penthouse"],["mini_flat","Mini-Flat"]],
  commercial:  [["office_space","Office Space"],["shop","Shop"],["plaza","Plaza / Mall"],["showroom","Showroom"],["event_centre","Event Centre"],["hotel","Hotel"],["filling_station","Filling Station"],["restaurant","Restaurant"]],
  warehouse:   [["warehouse","Warehouse"],["cold_storage","Cold Storage"],["factory","Factory"],["logistics_hub","Logistics Hub"],["open_yard","Open Yard"]],
  shortlet:    [["shortlet_apartment","Shortlet Apartment"],["shortlet_house","Shortlet House"]],
  new_development: [["off_plan","Off-Plan"],["under_construction","Under Construction"]],
};

// ── Main Component ─────────────────────────────────────────────────────────
export default function CreateListingPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INIT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imgPreviews, setImgPreviews] = useState<string[]>([]);
  const [docNames, setDocNames]       = useState<string[]>([]);
  const [publishing, setPublishing]   = useState(false);
  const navigate = useNavigate();
  const imgInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const cat = form.category;
  const isLand     = cat === "land";
  const isBuilding = cat !== "land" && cat !== "";
  const hasRooms   = cat === "house" || cat === "apartment" || cat === "shortlet";
  const isShortlet = cat === "shortlet";
  const isWarehouse= cat === "warehouse";
  const isNewDev   = cat === "new_development";

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  }

  function toggleAmenity(key: string) {
    setForm(f => ({ ...f, amenities: { ...f.amenities, [key]: !f.amenities[key] } }));
  }

  // ── Validation per step ─────────────────────────────────────────────────
  function validate(): boolean {
    const e: Record<string, string> = {};
    if (step === 1 && !form.category) e.category = "Please choose a category";
    if (step === 2) {
      if (!form.title.trim()) e.title = "Title is required";
      if (!form.listingType) e.listingType = "Choose a listing type";
      if (form.description.trim().length < 30) e.description = "Write at least 30 characters";
    }
    if (step === 3) {
      if (!form.state) e.state = "State is required";
      if (!form.lga.trim()) e.lga = "LGA / Area is required";
    }
    if (step === 5) {
      if (form.priceType === "fixed" && !form.amount) e.amount = "Price is required";
      if (form.priceType === "range" && !form.minAmount) e.minAmount = "Minimum price is required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (validate()) setStep(s => Math.min(s + 1, 9));
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function back() { setStep(s => Math.max(s - 1, 1)); }

  // ── Image upload ─────────────────────────────────────────────────────────
  const handleImages = useCallback((files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 20);
    const newPreviews = arr.map(f => URL.createObjectURL(f));
    setImgPreviews(p => [...p, ...newPreviews].slice(0, 20));
    setForm(f => ({ ...f, images: [...f.images, ...arr].slice(0, 20) }));
  }, []);

  const removeImage = (i: number) => {
    setImgPreviews(p => p.filter((_,j) => j !== i));
    setForm(f => ({ ...f, images: f.images.filter((_,j) => j !== i) }));
  };

  // ── Document upload ──────────────────────────────────────────────────────
  const handleDocs = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 10);
    const newDocs = arr.map(f => ({ file: f, docType: "c_of_o", name: f.name }));
    setForm(f => ({ ...f, documents: [...f.documents, ...newDocs] }));
    setDocNames(n => [...n, ...arr.map(f => f.name)]);
  };

  const removeDoc = (i: number) => {
    setForm(f => ({ ...f, documents: f.documents.filter((_,j) => j !== i) }));
    setDocNames(n => n.filter((_,j) => j !== i));
  };

  function updateDocType(i: number, type: string) {
    setForm(f => ({ ...f, documents: f.documents.map((d,j) => j === i ? { ...d, docType: type } : d) }));
  }

  // ── Publish ──────────────────────────────────────────────────────────────
  const createMutation  = useCreateListing();
  const publishMutation = usePublishListing();

  async function publish() {
    setPublishing(true);
    try {
      const listing = await createMutation.mutateAsync({
        title:       form.title,
        description: form.description,
        category:    form.category,
        listingType: form.listingType,
        price:       Number(form.price),
        state:       form.state,
        lga:         form.lga,
        neighbourhood: form.neighbourhood,
        bedrooms:    form.bedrooms,
        bathrooms:   form.bathrooms,
        size:        form.size,
        amenities:   form.amenities ?? [],
        tier:        form.tier ?? "free",
      });
      await publishMutation.mutateAsync(listing.id);
      toast.success("Listing submitted for review!");
      navigate(`/listings/${listing.slug}`);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Could not publish listing. Try again.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className={styles.page}>
      {/* ── Left sidebar: step indicator ── */}
      <aside className={styles.stepSidebar}>
        <div className={styles.stepSidebarInner}>
          <div className={styles.sidebarBrand}>
            <span className={styles.sidebarBrandIcon}>⌂</span>
            <span className={styles.sidebarBrandText}>Create Listing</span>
          </div>

          <div className={styles.steps}>
            {STEP_LABELS.map(({ n, label, icon }) => (
              <button
                key={n}
                className={[
                  styles.stepItem,
                  step === n ? styles.stepCurrent : "",
                  step > n  ? styles.stepDone    : "",
                  step < n  ? styles.stepFuture  : "",
                ].join(" ")}
                onClick={() => step > n && setStep(n)}
                disabled={step < n}
              >
                <span className={styles.stepDot}>
                  {step > n
                    ? <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 6l3 3 5-5"/></svg>
                    : icon}
                </span>
                <span className={styles.stepName}>{label}</span>
                {step === n && <span className={styles.stepArrow}>›</span>}
              </button>
            ))}
          </div>

          {/* Progress */}
          <div className={styles.progress}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${((step - 1) / 8) * 100}%` }} />
            </div>
            <p className={styles.progressText}>{step} of 9 steps</p>
          </div>

          {/* Help tip */}
          <div className={styles.helpBox}>
            <span className={styles.helpIcon}>💡</span>
            <p className={styles.helpText}>
              {step === 1 && "Choose the category that best describes your property. This determines which fields you'll need to fill."}
              {step === 2 && "A clear title and detailed description attract serious buyers. Aim for 150+ characters."}
              {step === 3 && "Precise location increases visibility. Use the map tool to draw your property's exact boundary."}
              {step === 4 && "Complete specs help buyers filter and find your property faster."}
              {step === 5 && "Set a fair price. Listings with visible prices get 3× more enquiries than 'Price on Call' listings."}
              {step === 6 && "High-quality photos are the #1 factor in buyer engagement. Add at least 5 photos."}
              {step === 7 && "Uploaded documents unlock Verified status and increase buyer trust significantly."}
              {step === 8 && "Choose the right tier. Verified listings sell 60% faster than Free listings."}
              {step === 9 && "Review everything carefully before publishing. You can edit after publishing."}
            </p>
          </div>
        </div>
      </aside>

      {/* ── Mobile progress bar ── */}
      <div className={styles.mobileProg}>
        <div className={styles.mobileProgFill} style={{ width: `${((step - 1) / 8) * 100}%` }} />
        <div className={styles.mobileProgLabel}>
          <span>{STEP_LABELS[step - 1].icon} {STEP_LABELS[step - 1].label}</span>
          <span>{step} / 9</span>
        </div>
      </div>

      {/* ── Main form area ── */}
      <main className={styles.main}>
        <div className={styles.formCard}>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* STEP 1 — CATEGORY                                               */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className={styles.stepPane}>
              <div className={styles.stepHeader}>
                <h1 className={styles.stepTitle}>What are you listing?</h1>
                <p className={styles.stepSub}>Choose the category that best describes your property.</p>
              </div>
              {errors.category && <p className={styles.error}>{errors.category}</p>}
              <div className={styles.catGrid}>
                {(Object.entries(CATEGORY_META) as [PropertyCategory, typeof CATEGORY_META[PropertyCategory]][]).map(([key, meta]) => (
                  <button
                    key={key}
                    type="button"
                    className={[styles.catCard, form.category === key ? styles.catCardActive : ""].join(" ")}
                    style={form.category === key ? { borderColor: meta.color, background: meta.color + "0d" } : {}}
                    onClick={() => set("category", key)}
                  >
                    <span className={styles.catCardIcon}>{meta.icon}</span>
                    <strong className={styles.catCardLabel} style={form.category === key ? { color: meta.color } : {}}>
                      {meta.label}
                    </strong>
                    <p className={styles.catCardDesc}>{meta.description}</p>
                    {form.category === key && (
                      <span className={styles.catCardCheck} style={{ background: meta.color }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* STEP 2 — BASICS                                                 */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className={styles.stepPane}>
              <div className={styles.stepHeader}>
                <h1 className={styles.stepTitle}>Basic Information</h1>
                <p className={styles.stepSub}>Give your listing a clear, descriptive title that buyers will search for.</p>
              </div>

              <FieldGroup>
                <Label required>Listing Title</Label>
                <Input
                  value={form.title}
                  onChange={e => set("title", e.target.value)}
                  placeholder={cat === "land" ? "e.g. Corner-Piece C of O Plot — Lekki Phase 2" : "e.g. 5-Bed Fully Detached Duplex — Jabi, Abuja"}
                  maxLength={120}
                />
                {errors.title && <p className={styles.error}>{errors.title}</p>}
                <p className={styles.hint}>{form.title.length}/120 characters</p>
              </FieldGroup>

              <FieldGroup>
                <Label required>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={e => set("description", e.target.value)}
                  placeholder="Describe the property in detail — key features, finishing quality, neighbourhood benefits, access roads, nearby landmarks, and any unique selling points..."
                  rows={7}
                />
                {errors.description && <p className={styles.error}>{errors.description}</p>}
                <p className={styles.hint}>{form.description.length} characters (minimum 30)</p>
              </FieldGroup>

              <FormRow half>
                <FieldGroup>
                  <Label required>Listing Type</Label>
                  <Select value={form.listingType} onChange={e => set("listingType", e.target.value as ListingType)}>
                    <option value="">Select type...</option>
                    <option value="sale">For Sale</option>
                    {cat !== "land" && <>
                      <option value="rent">For Rent</option>
                      <option value="lease">For Lease</option>
                    </>}
                    {isShortlet && <option value="shortlet">Short-let</option>}
                    <option value="joint_venture">Joint Venture</option>
                  </Select>
                  {errors.listingType && <p className={styles.error}>{errors.listingType}</p>}
                </FieldGroup>

                <FieldGroup>
                  <Label>Property Subtype</Label>
                  <Select value={form.subtype} onChange={e => set("subtype", e.target.value)}>
                    <option value="">Select subtype...</option>
                    {(SUBTYPES[cat] || []).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select>
                </FieldGroup>
              </FormRow>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* STEP 3 — LOCATION                                               */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {step === 3 && (
            <div className={styles.stepPane}>
              <div className={styles.stepHeader}>
                <h1 className={styles.stepTitle}>Property Location</h1>
                <p className={styles.stepSub}>Precise location information helps buyers find your listing. For land, draw the boundary on the map.</p>
              </div>

              <FormRow half>
                <FieldGroup>
                  <Label required>State</Label>
                  <Select value={form.state} onChange={e => set("state", e.target.value)}>
                    <option value="">Select state...</option>
                    {NIGERIAN_STATES.map(s => <option key={s}>{s}</option>)}
                  </Select>
                  {errors.state && <p className={styles.error}>{errors.state}</p>}
                </FieldGroup>
                <FieldGroup>
                  <Label required>LGA / Area</Label>
                  <Input
                    value={form.lga}
                    onChange={e => set("lga", e.target.value)}
                    placeholder="e.g. Lekki, Jabi, GRA"
                  />
                  {errors.lga && <p className={styles.error}>{errors.lga}</p>}
                </FieldGroup>
              </FormRow>

              <FieldGroup>
                <Label>Full Address</Label>
                <Input
                  value={form.address}
                  onChange={e => set("address", e.target.value)}
                  placeholder="e.g. Plot 45, Sunrise Estate, Jabi"
                />
                <p className={styles.hint}>Exact address will only be shown to verified buyers after escrow initiation.</p>
              </FieldGroup>

              <FormRow half>
                <FieldGroup>
                  <Label>Neighbourhood / Estate</Label>
                  <Input value={form.neighbourhood} onChange={e => set("neighbourhood", e.target.value)} placeholder="e.g. Sunrise Estate" />
                </FieldGroup>
                <FieldGroup>
                  <Label>Nearest Landmarks</Label>
                  <Input value={form.nearbyLandmarks} onChange={e => set("nearbyLandmarks", e.target.value)} placeholder="e.g. Jabi Lake Mall, Airport" />
                </FieldGroup>
              </FormRow>

              {/* Mapbox Draw section */}
              <div className={styles.mapSection}>
                <div className={styles.mapSectionHeader}>
                  <div>
                    <strong className={styles.mapSectionTitle}>📐 Draw Property Boundary</strong>
                    <p className={styles.mapSectionSub}>
                      {isLand
                        ? "Required for land listings. Draw the exact plot boundary using the polygon tool."
                        : "Optional for buildings. Draw the compound boundary to show land area."}
                    </p>
                  </div>
                  {form.hasBoundary && (
                    <span className={styles.boundaryBadge}>✓ Boundary Set</span>
                  )}
                </div>

                <div className={styles.mapBox}>
                  {import.meta.env.VITE_MAPBOX_TOKEN ? (
                    <div id="draw-map" className={styles.mapEl} />
                  ) : (
                    <div className={styles.mapPlaceholder}>
                      <div className={styles.mapPlaceholderInner}>
                        <span className={styles.mapPlaceholderIcon}>🗺️</span>
                        <strong>Mapbox Draw Tool</strong>
                        <p>The interactive boundary drawing tool will appear here once you set <code>VITE_MAPBOX_TOKEN</code> in your <code>.env</code> file.</p>
                        <p style={{ marginTop: 8, fontSize: "0.78rem", opacity: 0.7 }}>Tools available: Polygon draw, edit vertices, delete, undo</p>
                        {/* Simulate draw action in preview */}
                        <button
                          type="button"
                          className={styles.simulateBtn}
                          onClick={() => set("hasBoundary", !form.hasBoundary)}
                        >
                          {form.hasBoundary ? "✓ Boundary drawn — click to reset" : "Simulate: Draw boundary polygon"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.coordRow}>
                  <FieldGroup>
                    <Label>Latitude (auto from map)</Label>
                    <Input value={form.coordinates.lat} onChange={e => setForm(f => ({ ...f, coordinates: { ...f.coordinates, lat: e.target.value } }))} placeholder="e.g. 6.4698" type="number" step="any" />
                  </FieldGroup>
                  <FieldGroup>
                    <Label>Longitude (auto from map)</Label>
                    <Input value={form.coordinates.lng} onChange={e => setForm(f => ({ ...f, coordinates: { ...f.coordinates, lng: e.target.value } }))} placeholder="e.g. 3.5852" type="number" step="any" />
                  </FieldGroup>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* STEP 4 — PROPERTY SPECS                                         */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {step === 4 && (
            <div className={styles.stepPane}>
              <div className={styles.stepHeader}>
                <h1 className={styles.stepTitle}>
                  {isLand ? "Land Specifications" : "Property Specifications"}
                </h1>
                <p className={styles.stepSub}>Complete specs help buyers filter and find your property.</p>
              </div>

              {/* ── LAND FIELDS ── */}
              {isLand && (
                <>
                  <div className={styles.sectionDivider}>📐 Size</div>
                  <div className={styles.rowThree}>
                    <FieldGroup>
                      <Label>Area (m²)</Label>
                      <Input type="number" value={form.sizeInSqm} onChange={e => set("sizeInSqm", e.target.value)} placeholder="e.g. 648" />
                    </FieldGroup>
                    <FieldGroup>
                      <Label>Plots</Label>
                      <Input type="number" value={form.sizeInPlot} onChange={e => set("sizeInPlot", e.target.value)} placeholder="e.g. 1" />
                    </FieldGroup>
                    <FieldGroup>
                      <Label>Hectares</Label>
                      <Input type="number" value={form.sizeInHectare} onChange={e => set("sizeInHectare", e.target.value)} placeholder="e.g. 0.065" />
                    </FieldGroup>
                  </div>

                  <div className={styles.sectionDivider}>🌱 Land Characteristics</div>
                  <FormRow half>
                    <FieldGroup>
                      <Label>Soil Type</Label>
                      <Select value={form.soilType} onChange={e => set("soilType", e.target.value as SoilType)}>
                        <option value="">Select...</option>
                        {["dry","loamy","sandy","clay","swampy","rocky"].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </Select>
                    </FieldGroup>
                    <FieldGroup>
                      <Label>Topography</Label>
                      <Select value={form.topography} onChange={e => set("topography", e.target.value)}>
                        <option value="">Select...</option>
                        {[["flat","Flat"],["gentle_slope","Gentle Slope"],["steep_slope","Steep Slope"],["valley","Valley"],["highland","Highland"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                      </Select>
                    </FieldGroup>
                  </FormRow>

                  <FormRow half>
                    <FieldGroup>
                      <Label>Zoning</Label>
                      <Select value={form.zoning} onChange={e => set("zoning", e.target.value as ZoningType)}>
                        <option value="">Select...</option>
                        {[["residential","Residential"],["commercial","Commercial"],["industrial","Industrial"],["agricultural","Agricultural"],["mixed_use","Mixed Use"],["government_reserved","Govt Reserved"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                      </Select>
                    </FieldGroup>
                    <FieldGroup>
                      <Label>Power Grid</Label>
                      <Select value={form.powerGrid} onChange={e => set("powerGrid", e.target.value as PowerGridProximity)}>
                        <option value="">Select...</option>
                        <option value="on_grid">On Grid</option>
                        <option value="near_grid">Near Grid</option>
                        <option value="off_grid">Off Grid</option>
                      </Select>
                    </FieldGroup>
                  </FormRow>

                  <FieldGroup>
                    <Label>Flood Risk</Label>
                    <Select value={form.floodRisk} onChange={e => set("floodRisk", e.target.value)}>
                      <option value="none">None</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </Select>
                  </FieldGroup>

                  <div className={styles.toggleGrid}>
                    {([
                      ["waterSupply",  "💧 Water Supply Available"],
                      ["roadAccess",   "🛣️ Direct Road Access"],
                      ["fenced",       "🧱 Fenced"],
                      ["gateAccess",   "🚪 Gate Access"],
                    ] as [keyof FormState, string][]).map(([k, l]) => (
                      <Toggle key={k} checked={form[k] as boolean} onChange={() => set(k, !form[k] as FormState[typeof k])} label={l} />
                    ))}
                  </div>
                </>
              )}

              {/* ── BUILDING FIELDS ── */}
              {isBuilding && (
                <>
                  <div className={styles.sectionDivider}>📏 Size</div>
                  <FormRow half>
                    <FieldGroup>
                      <Label>Floor Area (m²)</Label>
                      <Input type="number" value={form.floorArea} onChange={e => set("floorArea", e.target.value)} placeholder="e.g. 520" />
                    </FieldGroup>
                    <FieldGroup>
                      <Label>Land / Compound Area (m²)</Label>
                      <Input type="number" value={form.landArea} onChange={e => set("landArea", e.target.value)} placeholder="e.g. 850" />
                    </FieldGroup>
                  </FormRow>

                  {hasRooms && (
                    <>
                      <div className={styles.sectionDivider}>🛏 Rooms</div>
                      <div className={styles.rowThree}>
                        <FieldGroup>
                          <Label>Bedrooms</Label>
                          <Input type="number" min="0" value={form.bedrooms} onChange={e => set("bedrooms", e.target.value)} placeholder="0" />
                        </FieldGroup>
                        <FieldGroup>
                          <Label>Bathrooms</Label>
                          <Input type="number" min="0" value={form.bathrooms} onChange={e => set("bathrooms", e.target.value)} placeholder="0" />
                        </FieldGroup>
                        <FieldGroup>
                          <Label>Toilets</Label>
                          <Input type="number" min="0" value={form.toilets} onChange={e => set("toilets", e.target.value)} placeholder="0" />
                        </FieldGroup>
                      </div>
                      <FormRow half>
                        <FieldGroup>
                          <Label>Sitting Rooms</Label>
                          <Input type="number" min="0" value={form.sittingRooms} onChange={e => set("sittingRooms", e.target.value)} placeholder="1" />
                        </FieldGroup>
                        <FieldGroup>
                          <Label>Estate Name</Label>
                          <Input value={form.estateName} onChange={e => set("estateName", e.target.value)} placeholder="e.g. Sunrise Estate" />
                        </FieldGroup>
                      </FormRow>
                    </>
                  )}

                  {isShortlet && (
                    <>
                      <div className={styles.sectionDivider}>🛎️ Short-let Rules</div>
                      <div className={styles.rowThree}>
                        <FieldGroup>
                          <Label>Max Guests</Label>
                          <Input type="number" min="1" value={form.maxGuests} onChange={e => set("maxGuests", e.target.value)} placeholder="4" />
                        </FieldGroup>
                        <FieldGroup>
                          <Label>Min Nights</Label>
                          <Input type="number" min="1" value={form.minNights} onChange={e => set("minNights", e.target.value)} placeholder="1" />
                        </FieldGroup>
                        <FieldGroup>
                          <Label>Pets Allowed</Label>
                          <Select value={form.petsAllowed ? "yes" : "no"} onChange={e => set("petsAllowed", e.target.value === "yes")}>
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </Select>
                        </FieldGroup>
                      </div>
                    </>
                  )}

                  <div className={styles.sectionDivider}>🏗️ Building Details</div>
                  <div className={styles.rowThree}>
                    <FieldGroup>
                      <Label>Total Floors</Label>
                      <Input type="number" value={form.totalFloors} onChange={e => set("totalFloors", e.target.value)} placeholder="e.g. 3" />
                    </FieldGroup>
                    <FieldGroup>
                      <Label>Unit Floor Level</Label>
                      <Input type="number" value={form.floorLevel} onChange={e => set("floorLevel", e.target.value)} placeholder="e.g. 2" />
                    </FieldGroup>
                    <FieldGroup>
                      <Label>Year Built</Label>
                      <Input type="number" value={form.yearBuilt} onChange={e => set("yearBuilt", e.target.value)} placeholder="e.g. 2022" />
                    </FieldGroup>
                  </div>

                  <FormRow half>
                    <FieldGroup>
                      <Label>Furnishing</Label>
                      <Select value={form.furnishing} onChange={e => set("furnishing", e.target.value as FurnishingStatus)}>
                        <option value="">Select...</option>
                        <option value="furnished">Furnished</option>
                        <option value="semi_furnished">Semi-Furnished</option>
                        <option value="unfurnished">Unfurnished</option>
                        <option value="shell">Shell</option>
                      </Select>
                    </FieldGroup>
                    <FieldGroup>
                      <Label>Condition</Label>
                      <Select value={form.condition} onChange={e => set("condition", e.target.value)}>
                        <option value="new">New</option>
                        <option value="renovated">Renovated</option>
                        <option value="good">Good</option>
                        <option value="needs_work">Needs Work</option>
                        <option value="off_plan">Off-Plan</option>
                      </Select>
                    </FieldGroup>
                  </FormRow>

                  <FormRow half>
                    <FieldGroup>
                      <Label>Power Supply</Label>
                      <Select value={form.powerSupply} onChange={e => set("powerSupply", e.target.value)}>
                        <option value="24hrs">24hrs</option>
                        <option value="partial">Partial</option>
                        <option value="generator_only">Generator Only</option>
                        <option value="solar">Solar</option>
                        <option value="none">None</option>
                      </Select>
                    </FieldGroup>
                    <FieldGroup>
                      <Label>Water Supply</Label>
                      <Select value={form.waterSupplyBuilding} onChange={e => set("waterSupplyBuilding", e.target.value)}>
                        <option value="borehole">Borehole</option>
                        <option value="public_mains">Public Mains</option>
                        <option value="well">Well</option>
                        <option value="both">Both</option>
                        <option value="none">None</option>
                      </Select>
                    </FieldGroup>
                  </FormRow>

                  <FormRow half>
                    <FieldGroup>
                      <Label>Parking</Label>
                      <Select value={form.parkingType} onChange={e => set("parkingType", e.target.value)}>
                        <option value="none">None</option>
                        <option value="street">Street</option>
                        <option value="compound">Compound</option>
                        <option value="garage">Garage</option>
                        <option value="dedicated">Dedicated</option>
                      </Select>
                    </FieldGroup>
                    <FieldGroup>
                      <Label>Parking Spaces</Label>
                      <Input type="number" min="0" value={form.parkingSpaces} onChange={e => set("parkingSpaces", e.target.value)} placeholder="1" />
                    </FieldGroup>
                  </FormRow>

                  {isWarehouse && (
                    <FormRow half>
                      <FieldGroup>
                        <Label>Ceiling Height (m)</Label>
                        <Input type="number" value={form.ceilingHeight} onChange={e => set("ceilingHeight", e.target.value)} placeholder="e.g. 10" />
                      </FieldGroup>
                    </FormRow>
                  )}

                  <div className={styles.sectionDivider}>✨ Amenities</div>
                  <div className={styles.amenityGrid}>
                    {[
                      ["pool",       "🏊", "Swimming Pool"],
                      ["gym",        "💪", "Gym"],
                      ["elevator",   "🛗", "Elevator / Lift"],
                      ["security",   "🔐", "24hr Security"],
                      ["cctv",       "📷", "CCTV"],
                      ["serviced",   "🧹", "Serviced"],
                      ["bq",         "🏠", "Boys' Quarters"],
                      ["garden",     "🌿", "Garden"],
                      ["internet",   "📶", "Internet Ready"],
                      ["fenced",     "🧱", "Fenced & Gated"],
                      ["loadingDock","🚛", "Loading Dock"],
                      ["officeSpace","💼", "Office Space"],
                    ].map(([k, icon, label]) => (
                      <AmenityCheck
                        key={k}
                        icon={icon}
                        label={label}
                        checked={!!form.amenities[k]}
                        onChange={() => toggleAmenity(k)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* STEP 5 — PRICING                                                */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {step === 5 && (
            <div className={styles.stepPane}>
              <div className={styles.stepHeader}>
                <h1 className={styles.stepTitle}>Set Your Price</h1>
                <p className={styles.stepSub}>Listings with a clear price get 3× more buyer enquiries. Price on Call is not permitted on Shelters' Horizon.</p>
              </div>

              <div className={styles.priceTypeTabs}>
                <button
                  type="button"
                  className={[styles.priceTypeTab, form.priceType === "fixed" ? styles.priceTypeTabActive : ""].join(" ")}
                  onClick={() => set("priceType", "fixed")}
                >
                  Fixed Price
                </button>
                <button
                  type="button"
                  className={[styles.priceTypeTab, form.priceType === "range" ? styles.priceTypeTabActive : ""].join(" ")}
                  onClick={() => set("priceType", "range")}
                >
                  Price Range
                </button>
              </div>

              {form.priceType === "fixed" && (
                <FieldGroup>
                  <Label required>Price (₦)</Label>
                  <div className={styles.currencyInput}>
                    <span className={styles.currencySymbol}>₦</span>
                    <Input
                      type="number"
                      value={form.amount}
                      onChange={e => set("amount", e.target.value)}
                      placeholder="0"
                      className={styles.currencyField}
                    />
                  </div>
                  {errors.amount && <p className={styles.error}>{errors.amount}</p>}
                </FieldGroup>
              )}

              {form.priceType === "range" && (
                <FormRow half>
                  <FieldGroup>
                    <Label required>Minimum Price (₦)</Label>
                    <div className={styles.currencyInput}>
                      <span className={styles.currencySymbol}>₦</span>
                      <Input type="number" value={form.minAmount} onChange={e => set("minAmount", e.target.value)} placeholder="0" className={styles.currencyField} />
                    </div>
                    {errors.minAmount && <p className={styles.error}>{errors.minAmount}</p>}
                  </FieldGroup>
                  <FieldGroup>
                    <Label>Maximum Price (₦)</Label>
                    <div className={styles.currencyInput}>
                      <span className={styles.currencySymbol}>₦</span>
                      <Input type="number" value={form.maxAmount} onChange={e => set("maxAmount", e.target.value)} placeholder="0" className={styles.currencyField} />
                    </div>
                  </FieldGroup>
                </FormRow>
              )}

              {(form.listingType === "rent" || form.listingType === "lease" || form.listingType === "shortlet") && (
                <FieldGroup>
                  <Label>Rent Frequency</Label>
                  <Select value={form.rentFrequency} onChange={e => set("rentFrequency", e.target.value)}>
                    {form.listingType === "shortlet" && <option value="per_night">Per Night</option>}
                    <option value="per_month">Per Month</option>
                    <option value="per_year">Per Year</option>
                  </Select>
                </FieldGroup>
              )}

              <div className={styles.toggleGrid}>
                <Toggle checked={form.negotiable} onChange={() => set("negotiable", !form.negotiable)} label="💬 Price is Negotiable" />
              </div>

              <div className={styles.sectionDivider}>💸 Additional Fees (Optional)</div>
              <div className={styles.rowThree}>
                {[
                  ["cautionFee",    "Caution Fee"],
                  ["agencyFee",     "Agency Fee"],
                  ["serviceCharge", "Service Charge"],
                  ["legalFee",      "Legal Fee"],
                ].map(([k, l]) => (
                  <FieldGroup key={k}>
                    <Label>{l} (₦)</Label>
                    <Input
                      type="number"
                      value={(form as any)[k]}
                      onChange={e => set(k as keyof FormState, e.target.value as any)}
                      placeholder="0"
                    />
                  </FieldGroup>
                ))}
              </div>

              <div className={styles.pricePreviewBox}>
                <p className={styles.pricePreviewLabel}>How buyers will see your price:</p>
                <p className={styles.pricePreviewVal}>
                  {form.priceType === "fixed" && form.amount
                    ? `₦${Number(form.amount).toLocaleString()}${form.rentFrequency === "per_night" ? "/night" : form.rentFrequency === "per_month" ? "/mo" : form.rentFrequency === "per_year" ? "/yr" : ""}`
                    : form.priceType === "range" && form.minAmount
                    ? `₦${Number(form.minAmount).toLocaleString()} – ₦${Number(form.maxAmount || 0).toLocaleString()}`
                    : "₦ —"}
                  {form.negotiable && " · Negotiable"}
                </p>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* STEP 6 — MEDIA                                                  */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {step === 6 && (
            <div className={styles.stepPane}>
              <div className={styles.stepHeader}>
                <h1 className={styles.stepTitle}>Photos & Media</h1>
                <p className={styles.stepSub}>Upload high-quality photos. The first photo will be your cover image. Maximum 20 photos.</p>
              </div>

              {/* Drag & Drop zone */}
              <div
                className={styles.dropZone}
                onClick={() => imgInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add(styles.dropZoneActive); }}
                onDragLeave={e => { e.currentTarget.classList.remove(styles.dropZoneActive); }}
                onDrop={e => {
                  e.preventDefault();
                  e.currentTarget.classList.remove(styles.dropZoneActive);
                  handleImages(e.dataTransfer.files);
                }}
              >
                <input
                  ref={imgInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={e => handleImages(e.target.files)}
                />
                <span className={styles.dropZoneIcon}>🖼️</span>
                <strong className={styles.dropZoneText}>Drop photos here or click to browse</strong>
                <p className={styles.dropZoneHint}>JPG, PNG, WEBP • Max 20 photos • Min 5 recommended</p>
              </div>

              {/* Photo grid */}
              {imgPreviews.length > 0 && (
                <div className={styles.imgGrid}>
                  {imgPreviews.map((src, i) => (
                    <div key={i} className={styles.imgThumb}>
                      <img src={src} alt={`Photo ${i + 1}`} />
                      {i === 0 && <span className={styles.coverLabel}>Cover</span>}
                      <button
                        type="button"
                        className={styles.imgRemove}
                        onClick={() => removeImage(i)}
                      >✕</button>
                    </div>
                  ))}
                  <div className={styles.imgAddMore} onClick={() => imgInputRef.current?.click()}>
                    <span>+</span>
                    <span style={{ fontSize: "0.7rem" }}>Add more</span>
                  </div>
                </div>
              )}

              <div className={styles.sectionDivider}>🎬 Video & Virtual Tour (Optional)</div>
              <FieldGroup>
                <Label>YouTube / Vimeo Video URL</Label>
                <Input value={form.videoUrl} onChange={e => set("videoUrl", e.target.value)} placeholder="https://youtube.com/watch?v=..." />
              </FieldGroup>
              <FieldGroup>
                <Label>Virtual Tour URL (Matterport, etc.)</Label>
                <Input value={form.virtualTourUrl} onChange={e => set("virtualTourUrl", e.target.value)} placeholder="https://my.matterport.com/show/?m=..." />
              </FieldGroup>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* STEP 7 — DOCUMENTS                                              */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {step === 7 && (
            <div className={styles.stepPane}>
              <div className={styles.stepHeader}>
                <h1 className={styles.stepTitle}>Title Documents</h1>
                <p className={styles.stepSub}>Uploading title documents unlocks Verified status. Verified listings sell 60% faster.</p>
              </div>

              <div className={styles.docBenefit}>
                <div className={styles.docBenefitItem}>
                  <span>✓</span> Document uploads unlock <strong>Verified</strong> tier automatically
                </div>
                <div className={styles.docBenefitItem}>
                  <span>✓</span> Admin review within <strong>24 hours</strong>
                </div>
                <div className={styles.docBenefitItem}>
                  <span>✓</span> Verified badge shown to all buyers searching in your area
                </div>
              </div>

              <div
                className={styles.dropZone}
                onClick={() => docInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add(styles.dropZoneActive); }}
                onDragLeave={e => e.currentTarget.classList.remove(styles.dropZoneActive)}
                onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove(styles.dropZoneActive); handleDocs(e.dataTransfer.files); }}
              >
                <input
                  ref={docInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  style={{ display: "none" }}
                  onChange={e => handleDocs(e.target.files)}
                />
                <span className={styles.dropZoneIcon}>📄</span>
                <strong className={styles.dropZoneText}>Drop documents here or click to upload</strong>
                <p className={styles.dropZoneHint}>PDF, JPG, PNG accepted • Max 10 documents</p>
              </div>

              {form.documents.length > 0 && (
                <div className={styles.docList}>
                  {form.documents.map((doc, i) => (
                    <div key={i} className={styles.docItem}>
                      <span className={styles.docItemIcon}>📄</span>
                      <div className={styles.docItemInfo}>
                        <p className={styles.docItemName}>{docNames[i] || doc.file.name}</p>
                        <Select
                          value={doc.docType}
                          onChange={e => updateDocType(i, e.target.value)}
                          className={styles.docTypeSelect}
                        >
                          <option value="c_of_o">Certificate of Occupancy (C of O)</option>
                          <option value="governors_consent">Governor's Consent</option>
                          <option value="survey_plan">Survey Plan</option>
                          <option value="deed_of_assignment">Deed of Assignment</option>
                          <option value="building_approval">Building Approval</option>
                          <option value="receipts">Purchase Receipts</option>
                          <option value="other">Other Document</option>
                        </Select>
                      </div>
                      <button type="button" className={styles.docRemove} onClick={() => removeDoc(i)}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.docSkipNote}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
                </svg>
                <p>Documents are optional but strongly recommended. You can also upload documents after publishing from your dashboard.</p>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* STEP 8 — TIER SELECTION                                         */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {step === 8 && (
            <div className={styles.stepPane}>
              <div className={styles.stepHeader}>
                <h1 className={styles.stepTitle}>Choose Your Listing Tier</h1>
                <p className={styles.stepSub}>Pick the tier that matches your goals. You can upgrade anytime from your dashboard.</p>
              </div>

              <div className={styles.tierGrid}>
                {([
                  {
                    key: "free" as ListingTier,
                    name: "Free",
                    price: "₦0",
                    period: "forever",
                    color: "#888",
                    icon: "◯",
                    features: ["1 active listing","3 photos max","Map pin location","Basic metadata","Standard search ranking"],
                    missing:  ["Priority placement","Polygon boundary","Verified badge","Photo gallery (20 photos)","Analytics"],
                  },
                  {
                    key: "verified" as ListingTier,
                    name: "Verified",
                    price: "₦0",
                    period: "free with docs",
                    color: "#d4af37",
                    icon: "✓",
                    badge: "Recommended",
                    features: ["Verified badge","Up to 20 photos + video","Polygon boundary map","Document verification","Priority search ranking","Higher buyer trust"],
                    missing: ["Homepage featured slot","Email campaign","Analytics dashboard"],
                  },
                  {
                    key: "premium" as ListingTier,
                    name: "Premium",
                    price: "₦25k",
                    period: "per month",
                    color: "#5a9e5a",
                    icon: "★",
                    features: ["Everything in Verified","Featured on Homepage","Email campaign to buyers","Full analytics dashboard","Dedicated support","WhatsApp notification leads"],
                    missing: [],
                  },
                  {
                    key: "developer" as ListingTier,
                    name: "Developer",
                    price: "Custom",
                    period: "contact us",
                    color: "#b8ddb8",
                    icon: "🏗",
                    features: ["Unlimited off-plan projects","Branded developer page","Lead capture & CRM","Payment plan builder","Escrow integration","Priority support"],
                    missing: [],
                  },
                ]).map(tier => (
                  <button
                    key={tier.key}
                    type="button"
                    className={[styles.tierCard, form.tier === tier.key ? styles.tierCardActive : ""].join(" ")}
                    style={form.tier === tier.key ? { borderColor: tier.color, background: tier.color + "0a" } : {}}
                    onClick={() => set("tier", tier.key)}
                  >
                    {tier.badge && (
                      <span className={styles.tierBadge} style={{ background: tier.color, color: tier.key === "verified" ? "#0b1a0b" : "#fff" }}>
                        {tier.badge}
                      </span>
                    )}
                    <div className={styles.tierIconWrap} style={{ background: tier.color + "18", borderColor: tier.color + "44" }}>
                      <span className={styles.tierIcon} style={{ color: tier.color }}>{tier.icon}</span>
                    </div>
                    <h3 className={styles.tierName} style={form.tier === tier.key ? { color: tier.color } : {}}>{tier.name}</h3>
                    <div className={styles.tierPrice}>{tier.price}</div>
                    <div className={styles.tierPeriod}>{tier.period}</div>
                    <ul className={styles.tierFeatures}>
                      {tier.features.map(f => (
                        <li key={f} className={styles.tierFeature}>
                          <span className={styles.tierCheck} style={{ color: tier.color }}>✓</span> {f}
                        </li>
                      ))}
                      {tier.missing.map(f => (
                        <li key={f} className={[styles.tierFeature, styles.tierFeatureMissing].join(" ")}>
                          <span className={styles.tierCross}>✕</span> {f}
                        </li>
                      ))}
                    </ul>
                    {form.tier === tier.key && (
                      <div className={styles.tierSelected} style={{ background: tier.color }}>✓ Selected</div>
                    )}
                  </button>
                ))}
              </div>

              {form.documents.length === 0 && (form.tier === "verified" || form.tier === "premium") && (
                <div className={styles.tierWarning}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <p>You've selected <strong>{form.tier}</strong> but haven't uploaded any documents. Your listing will be published at <strong>Free</strong> tier until documents are uploaded and verified. <button type="button" className={styles.goBack} onClick={() => setStep(7)}>Go back to upload →</button></p>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* STEP 9 — REVIEW & PUBLISH                                       */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {step === 9 && (
            <div className={styles.stepPane}>
              <div className={styles.stepHeader}>
                <h1 className={styles.stepTitle}>Review & Publish</h1>
                <p className={styles.stepSub}>Check your listing before it goes live. You can edit any section by clicking its name below.</p>
              </div>

              {/* Preview card */}
              <div className={styles.reviewCard}>
                {imgPreviews[0] ? (
                  <img src={imgPreviews[0]} alt="Cover" className={styles.reviewImg} />
                ) : (
                  <div className={styles.reviewImgPlaceholder}>🖼️ No photos uploaded</div>
                )}
                <div className={styles.reviewBody}>
                  <div className={styles.reviewBadges}>
                    {form.category && (
                      <span className={styles.reviewCatBadge}
                        style={{ background: CATEGORY_META[form.category as PropertyCategory]?.color + "18",
                                 borderColor: CATEGORY_META[form.category as PropertyCategory]?.color + "44",
                                 color: CATEGORY_META[form.category as PropertyCategory]?.color }}>
                        {CATEGORY_META[form.category as PropertyCategory]?.icon} {CATEGORY_META[form.category as PropertyCategory]?.label}
                      </span>
                    )}
                    <span className={styles.reviewTierBadge}>{form.tier === "free" ? "◯ Free" : form.tier === "verified" ? "✓ Verified" : form.tier === "premium" ? "★ Premium" : "🏗 Developer"}</span>
                  </div>
                  <h2 className={styles.reviewTitle}>{form.title || "Untitled Listing"}</h2>
                  <p className={styles.reviewLoc}>📍 {[form.neighbourhood, form.lga, form.state].filter(Boolean).join(", ") || "Location not set"}</p>
                  <p className={styles.reviewPrice}>
                    {form.amount ? `₦${Number(form.amount).toLocaleString()}` : form.minAmount ? `₦${Number(form.minAmount).toLocaleString()} – ₦${Number(form.maxAmount || 0).toLocaleString()}` : "Price not set"}
                    {form.negotiable && " · Negotiable"}
                  </p>
                </div>
              </div>

              {/* Section summary */}
              <div className={styles.reviewSections}>
                {[
                  { label: "Category", value: form.category ? `${CATEGORY_META[form.category as PropertyCategory]?.icon} ${CATEGORY_META[form.category as PropertyCategory]?.label}` : "—", step: 1 },
                  { label: "Listing Type", value: form.listingType || "—", step: 2 },
                  { label: "Location", value: [form.lga, form.state].filter(Boolean).join(", ") || "—", step: 3 },
                  { label: "Boundary", value: form.hasBoundary ? "✓ Polygon drawn" : "No boundary", step: 3 },
                  { label: "Photos", value: `${imgPreviews.length} photo${imgPreviews.length !== 1 ? "s" : ""}`, step: 6 },
                  { label: "Documents", value: `${form.documents.length} document${form.documents.length !== 1 ? "s" : ""}`, step: 7 },
                  { label: "Listing Tier", value: form.tier.charAt(0).toUpperCase() + form.tier.slice(1), step: 8 },
                ].map(({ label, value, step: s }) => (
                  <div key={label} className={styles.reviewRow}>
                    <span className={styles.reviewRowLabel}>{label}</span>
                    <span className={styles.reviewRowValue}>{value}</span>
                    <button type="button" className={styles.reviewEdit} onClick={() => setStep(s)}>Edit →</button>
                  </div>
                ))}
              </div>

              <div className={styles.publishNote}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
                </svg>
                <p>By publishing, you confirm that all information is accurate and you have the right to list this property. False listings may result in account suspension.</p>
              </div>

              <button
                type="button"
                className={[styles.publishBtn, publishing ? styles.publishBtnLoading : ""].join(" ")}
                onClick={publish}
                disabled={publishing}
              >
                {publishing ? (
                  <><span className={styles.spinner} /> Publishing your listing...</>
                ) : (
                  <>🚀 Publish Listing{form.tier !== "free" ? ` (${form.tier.charAt(0).toUpperCase() + form.tier.slice(1)})` : ""}</>
                )}
              </button>
            </div>
          )}

          {/* ── Nav buttons ── */}
          <div className={styles.navBtns}>
            {step > 1 && (
              <button type="button" className={styles.backBtn} onClick={back}>
                ← Back
              </button>
            )}
            <div style={{ flex: 1 }} />
            {step < 9 && (
              <button type="button" className={styles.nextBtn} onClick={next}>
                {step === 8 ? "Review & Publish →" : "Save & Continue →"}
              </button>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
