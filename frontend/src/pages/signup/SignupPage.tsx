import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import styles from "./SignupPage.module.css";
import { useRegister, useVerifyOtp, useResendOtp } from "../../hooks/useAuth";

type UserRole = "landlord" | "buyer" | "seller" | "rental" | "agent" | "caretaker";
type Step = "form" | "otp";

const ROLES: { key: UserRole; label: string; icon: string; desc: string }[] = [
  { key: "buyer",     label: "Buyer",       icon: "🏠", desc: "Looking to purchase property" },
  { key: "seller",    label: "Seller",      icon: "💰", desc: "Want to sell your property" },
  { key: "landlord",  label: "Landlord",    icon: "🔑", desc: "Listing for rental income" },
  { key: "rental",    label: "Rental/Lease",icon: "📝", desc: "Seeking a property to rent" },
  { key: "agent",     label: "Agent",       icon: "🤝", desc: "Real estate professional" },
  { key: "caretaker", label: "Caretaker",   icon: "🛡️", desc: "Managing properties for owners" },
];

function OTPInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const digits = value.padEnd(6, " ").split("");
  return (
    <div className={styles.otpRow}>
      {digits.map((d, i) => (
        <input
          key={i}
          className={styles.otpBox}
          type="text"
          maxLength={1}
          value={d.trim()}
          inputMode="numeric"
          onChange={e => {
            const next = value.split("");
            next[i] = e.target.value.replace(/\D/, "");
            onChange(next.join("").slice(0, 6));
            if (e.target.value && e.target.nextElementSibling) {
              (e.target.nextElementSibling as HTMLInputElement).focus();
            }
          }}
          onKeyDown={e => {
            if (e.key === "Backspace" && !value[i] && e.currentTarget.previousElementSibling) {
              (e.currentTarget.previousElementSibling as HTMLInputElement).focus();
            }
          }}
        />
      ))}
    </div>
  );
}

export default function SignupPage() {
  const [step, setStep] = useState<Step>("form");
  const [role, setRole] = useState<UserRole | "">("");
  const [agreed, setAgreed] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [otpTimer, setOtpTimer] = useState(60);
  const [verified, setVerified] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", surname: "", email: "",
    phone: "", nin: "", dob: "", gender: "", address: "",
  });

  function set(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  const formValid =
    form.firstName && form.lastName && form.email && form.phone &&
    form.nin && form.dob && form.gender && role && agreed;

  const [registeredEmail, setRegisteredEmail] = useState("");
  const navigate          = useNavigate();
  const registerMutation  = useRegister();
  const verifyMutation    = useVerifyOtp();
  const resendMutation    = useResendOtp();

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid) return;
    try {
      const data = await registerMutation.mutateAsync({
        ...form,
        role,
      });
      setRegisteredEmail(form.email);
      setStep("otp");
      let t = 60;
      const iv = setInterval(() => {
        t--;
        setOtpTimer(t);
        if (t <= 0) clearInterval(iv);
      }, 1000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Registration failed. Please try again.");
    }
  }

  async function verifyOtp() {
    const code = emailOtp.length === 6 ? emailOtp : phoneOtp;
    if (code.length < 6) return;
    try {
      await verifyMutation.mutateAsync({ email: registeredEmail, otp: code });
      setVerified(true);
      toast.success("Account verified! Welcome to Shelters\u2019 Horizon.");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch {
      toast.error("Invalid or expired code. Try again.");
    }
  }

  async function resendCode() {
    try {
      await resendMutation.mutateAsync({ email: registeredEmail });
      toast.success("New code sent to your email");
      setOtpTimer(60);
    } catch {
      toast.error("Could not resend. Please wait and try again.");
    }
  }

  return (
    <div className={styles.page}>
      {/* Split layout */}
      <div className={styles.left}>
        <div className={styles.leftContent}>
          <div className={styles.brand}>
            <span className={styles.brandIcon}>⌂</span>
            <div>
              <div className={styles.brandName}>Shelters' Horizon</div>
              <div className={styles.brandTagline}>Living In Our Safest Haven</div>
            </div>
          </div>
          <div className={styles.heroText}>
            <h2 className={styles.heroH2}>Your property journey<br /><em>starts here.</em></h2>
            <p className={styles.heroSub}>
              Join Nigeria's most trusted real estate platform. Verified listings, escrow-protected transactions, and licensed professionals — all in one place.
            </p>
          </div>
          <div className={styles.trustList}>
            {[
              { icon: "🔒", t: "Escrow-protected transactions" },
              { icon: "✅", t: "Verified sellers & agents" },
              { icon: "📄", t: "Secure document vault" },
              { icon: "🏆", t: "14,000+ registered users" },
            ].map(({ icon, t }) => (
              <div key={t} className={styles.trustItem}>
                <span className={styles.trustIcon}>{icon}</span>
                <span className={styles.trustText}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.formWrap}>
          {step === "form" ? (
            <>
              <div className={styles.formHead}>
                <h1 className={styles.formTitle}>Create your account</h1>
                <p className={styles.formSub}>
                  Already registered? <Link to="/login" className={styles.loginLink}>Sign in →</Link>
                </p>
              </div>

              <form onSubmit={submitForm} className={styles.form} noValidate>
                {/* Personal Info */}
                <div className={styles.sectionLabel}>Personal Information</div>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>First Name *</label>
                    <input className={styles.input} value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="Adaeze" required />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Last Name *</label>
                    <input className={styles.input} value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Okonkwo" required />
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Surname / Other Names</label>
                  <input className={styles.input} value={form.surname} onChange={e => set("surname", e.target.value)} placeholder="Optional" />
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Email Address *</label>
                    <input className={styles.input} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="adaeze@email.com" required />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Phone Number *</label>
                    <input className={styles.input} type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+234 800 000 0000" required />
                  </div>
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>NIN (National ID) *</label>
                    <input className={styles.input} value={form.nin} onChange={e => set("nin", e.target.value)} placeholder="12345678901" maxLength={11} required />
                    <p className={styles.hint}>Your NIN is securely encrypted and used only for identity verification.</p>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Date of Birth *</label>
                    <input className={styles.input} type="date" value={form.dob} onChange={e => set("dob", e.target.value)} required />
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Gender *</label>
                  <div className={styles.radioRow}>
                    {["Male", "Female", "Other"].map(g => (
                      <label key={g} className={styles.radioLabel}>
                        <input type="radio" name="gender" value={g} checked={form.gender === g} onChange={() => set("gender", g)} className={styles.radio} />
                        {g}
                      </label>
                    ))}
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Residential Address</label>
                  <input className={styles.input} value={form.address} onChange={e => set("address", e.target.value)} placeholder="House number, street, city, state" />
                </div>

                {/* Role selection */}
                <div className={styles.sectionLabel}>I am a *</div>
                <div className={styles.roleGrid}>
                  {ROLES.map(r => (
                    <button
                      type="button"
                      key={r.key}
                      className={[styles.roleCard, role === r.key ? styles.roleCardActive : ""].join(" ")}
                      onClick={() => setRole(r.key)}
                    >
                      <span className={styles.roleIcon}>{r.icon}</span>
                      <span className={styles.roleLabel}>{r.label}</span>
                      <span className={styles.roleDesc}>{r.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Terms */}
                <label className={styles.termsRow}>
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span className={styles.termsText}>
                    I accept the <a href="#" className={styles.termsLink}>Terms & Conditions</a> and <a href="#" className={styles.termsLink}>Disclaimer</a>. I confirm that the information provided is accurate and that I am at least 18 years old.
                  </span>
                </label>

                <button type="submit" className={styles.submitBtn} disabled={!formValid}>
                  Create Account →
                </button>

                <div className={styles.divider}><span>or continue with</span></div>
                <div className={styles.socialRow}>
                  <button type="button" className={styles.socialBtn}>🇬 Google</button>
                  <button type="button" className={styles.socialBtn}>📱 Facebook</button>
                </div>
              </form>
            </>
          ) : (
            <div className={styles.otpWrap}>
              {!verified ? (
                <>
                  <div className={styles.otpIcon}>📲</div>
                  <h1 className={styles.formTitle}>Verify your account</h1>
                  <p className={styles.formSub}>
                    We've sent 6-digit codes to <strong>{form.email}</strong> and <strong>{form.phone}</strong>. Enter both below to complete registration.
                  </p>

                  <div className={styles.otpGroup}>
                    <div className={styles.otpLabel}>
                      <span>📧</span> Email verification code
                    </div>
                    <OTPInput value={emailOtp} onChange={setEmailOtp} />
                  </div>

                  <div className={styles.otpGroup}>
                    <div className={styles.otpLabel}>
                      <span>📱</span> SMS verification code
                    </div>
                    <OTPInput value={phoneOtp} onChange={setPhoneOtp} />
                  </div>

                  <div className={styles.otpTimer}>
                    {otpTimer > 0 ? (
                      <span>Resend code in <strong>{otpTimer}s</strong></span>
                    ) : (
                      <button className={styles.resendBtn} onClick={() => setOtpTimer(60)}>Resend codes →</button>
                    )}
                  </div>

                  <button
                    className={styles.submitBtn}
                    disabled={emailOtp.length < 6 || phoneOtp.length < 6}
                    onClick={verifyOtp}
                  >
                    Verify & Continue →
                  </button>
                  <button className={styles.backBtn} onClick={() => setStep("form")}>← Edit details</button>
                </>
              ) : (
                <div className={styles.successWrap}>
                  <div className={styles.successIcon}>✅</div>
                  <h2 className={styles.successTitle}>Welcome to Shelters' Horizon!</h2>
                  <p className={styles.successText}>
                    Your account has been verified. You're registered as a <strong>{ROLES.find(r => r.key === role)?.label}</strong>.
                  </p>
                  <div className={styles.successActions}>
                    <Link to="/onboarding" className={styles.submitBtn}>Set up your preferences →</Link>
                    <Link to="/" className={styles.backBtn}>Skip for now</Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
