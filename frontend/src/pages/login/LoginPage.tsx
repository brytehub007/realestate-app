import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import styles from "./LoginPage.module.css";
import { useLogin, useVerifyOtp, useResendOtp, normalizeUser } from "../../hooks/useAuth";
import { useAuthStore } from "../../store/auth.store";

type LoginStep = "credentials" | "otp" | "success";

export default function LoginPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<LoginStep>("credentials");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [otp, setOtp]             = useState("");
  const [otpTimer, setOtpTimer]   = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [passValid, setPassValid]   = useState<boolean | null>(null);
  const [isLoading, setIsLoading]   = useState(false);
  const [loginError, setLoginError] = useState("");
  // email is already tracked in state above — no userId needed

  const loginMutation   = useLogin();
  const verifyMutation  = useVerifyOtp();
  const resendMutation  = useResendOtp();

  /* ---------- validation ---------- */
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passOk  = password.length >= 8;
  const canSubmit = emailOk && passOk;
  const canVerify = otp.replace(/\s/g, "").length === 6;

  function handleEmailBlur()    { setEmailValid(emailOk); }
  function handlePasswordBlur() { setPassValid(passOk); }

  /* ---------- OTP countdown ---------- */
  useEffect(() => {
    if (!timerRunning) return;
    if (otpTimer <= 0) { setTimerRunning(false); return; }
    const t = setTimeout(() => setOtpTimer(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timerRunning, otpTimer]);

  /* ---------- handlers ---------- */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setIsLoading(true);
    setLoginError("");
    try {
      const data = await loginMutation.mutateAsync({ email, password });
      // API returns tokens directly if already verified, or { requiresOtp:true } if not
      if (data.requiresOtp || !data.data?.accessToken) {
        setStep("otp");
        setOtpTimer(60);
        setTimerRunning(true);
      } else {
        const { setTokens, setUser } = useAuthStore.getState();
        setTokens(data.data.accessToken, data.data.refreshToken);
        setUser(normalizeUser(data.data.user));
        navigate("/dashboard");
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setLoginError(msg ?? "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!canVerify) return;
    setIsLoading(true);
    try {
      await verifyMutation.mutateAsync({
        email,
        otp: otp.replace(/\s/g, ""),
      });
      setStep("success");
    } catch {
      toast.error("Invalid or expired code. Try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function resendOtp() {
    setOtp("");
    setOtpTimer(60);
    setTimerRunning(true);
    try {
      await resendMutation.mutateAsync({ email });
      toast.success("New code sent to your email");
    } catch {
      toast.error("Could not resend code. Try again.");
    }
  }

  function goToDashboard() { navigate("/dashboard"); }

  /* ---------- OTP input ---------- */
  function OtpInput() {
    const digits = otp.padEnd(6, " ").split("");
    return (
      <div className={styles.otpRow}>
        {digits.map((d, i) => (
          <input
            key={i}
            id={`otp-${i}`}
            className={[styles.otpBox, d.trim() ? styles.otpBoxFilled : ""].join(" ")}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d.trim()}
            onChange={e => {
              const v = e.target.value.replace(/\D/, "");
              const arr = otp.split("").slice(0, 6);
              while (arr.length < 6) arr.push(" ");
              arr[i] = v || " ";
              setOtp(arr.join("").trimEnd());
              if (v) {
                const next = document.getElementById(`otp-${i + 1}`) as HTMLInputElement;
                next?.focus();
              }
            }}
            onKeyDown={e => {
              if (e.key === "Backspace" && !otp[i]?.trim()) {
                const prev = document.getElementById(`otp-${i - 1}`) as HTMLInputElement;
                prev?.focus();
              }
            }}
          />
        ))}
      </div>
    );
  }

  /* ---------- left panel trust signals ---------- */
  const trustItems = [
    { icon: "🔒", text: "256-bit escrow-protected transactions" },
    { icon: "✅", text: "Verified sellers, agents & landlords" },
    { icon: "📄", text: "Secure document vault — your title docs, safe" },
    { icon: "🏆", text: "14,000+ registered users across Nigeria" },
    { icon: "🇳🇬", text: "Nigeria · Africa · International" },
  ];

  return (
    <div className={styles.page}>

      {/* ── LEFT PANEL ── */}
      <aside className={styles.left}>
        <div className={styles.leftContent}>

          {/* Brand */}
          <div className={styles.brand}>
            <span className={styles.brandIcon}>⌂</span>
            <div>
              <div className={styles.brandName}>Shelters' Horizon</div>
              <div className={styles.brandTagline}>Living In Our Safest Haven</div>
            </div>
          </div>

          {/* Hero */}
          <div className={styles.heroText}>
            <h2 className={styles.heroH2}>
              Welcome<br/>
              <em>back.</em>
            </h2>
            <p className={styles.heroSub}>
              Your property journey continues here. Sign in to access your listings, messages, escrow transactions, and document vault.
            </p>
          </div>

          {/* Trust signals */}
          <ul className={styles.trustList}>
            {trustItems.map((t, i) => (
              <li key={i} className={styles.trustItem}>
                <span className={styles.trustIcon}>{t.icon}</span>
                <span className={styles.trustText}>{t.text}</span>
              </li>
            ))}
          </ul>

          {/* Progress dots */}
          <div className={styles.dots}>
            <div className={[styles.dot, step === "credentials" ? styles.dotActive : step !== "credentials" ? styles.dotDone : ""].join(" ")} />
            <div className={[styles.dot, step === "otp" ? styles.dotActive : step === "success" ? styles.dotDone : ""].join(" ")} />
            <div className={[styles.dot, step === "success" ? styles.dotActive : ""].join(" ")} />
          </div>

        </div>
      </aside>

      {/* ── RIGHT PANEL ── */}
      <main className={styles.right}>
        <div className={styles.rightInner}>

          {/* Progress bar */}
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: step === "credentials" ? "33%" : step === "otp" ? "66%" : "100%" }}
            />
          </div>

          {/* Step indicator */}
          {step !== "success" && (
            <div className={styles.stepMeta}>
              <span className={styles.stepCount}>
                Step {step === "credentials" ? 1 : 2} of 2
              </span>
              <span className={styles.stepLabel}>—</span>
              <span className={styles.stepLabel}>
                {step === "credentials" ? "Sign In" : "Verify Identity"}
              </span>
            </div>
          )}

          {/* ── STEP 1: CREDENTIALS ── */}
          {step === "credentials" && (
            <form className={styles.form} onSubmit={handleLogin} noValidate>
              <h1 className={styles.title}>Sign in to your account</h1>
              <p className={styles.subtitle}>
                Don't have an account?{" "}
                <Link to="/signup" className={styles.authLink}>Create one →</Link>
              </p>

              {loginError && (
                <div className={styles.errorBanner}>
                  ⚠ {loginError}
                </div>
              )}

              <div className={styles.field}>
                <label className={styles.label}>Email Address</label>
                <div className={styles.inputWrap}>
                  <input
                    className={[
                      styles.input,
                      emailValid === true  ? styles.inputValid   : "",
                      emailValid === false ? styles.inputInvalid : "",
                    ].join(" ")}
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setEmailValid(null); }}
                    onBlur={handleEmailBlur}
                    autoComplete="email"
                  />
                  {emailValid === true  && <span className={styles.validMark}>✓</span>}
                  {emailValid === false && <span className={styles.invalidMark}>✕</span>}
                </div>
                {emailValid === false && (
                  <p className={styles.fieldError}>Please enter a valid email address</p>
                )}
              </div>

              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label className={styles.label}>Password</label>
                  <Link to="/forgot-password" className={styles.forgotLink}>Forgot password?</Link>
                </div>
                <div className={styles.inputWrap}>
                  <input
                    className={[
                      styles.input,
                      styles.inputWithToggle,
                      passValid === true  ? styles.inputValid   : "",
                      passValid === false ? styles.inputInvalid : "",
                    ].join(" ")}
                    type={showPass ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setPassValid(null); }}
                    onBlur={handlePasswordBlur}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className={styles.showPassBtn}
                    onClick={() => setShowPass(v => !v)}
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? "🙈" : "👁"}
                  </button>
                  {passValid === true  && <span className={[styles.validMark, styles.validMarkShifted].join(" ")}>✓</span>}
                  {passValid === false && <span className={[styles.invalidMark, styles.validMarkShifted].join(" ")}>✕</span>}
                </div>
                {passValid === false && (
                  <p className={styles.fieldError}>Password must be at least 8 characters</p>
                )}
              </div>

              <div className={styles.rememberRow}>
                <label className={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span className={styles.checkText}>Keep me signed in for 30 days</span>
                </label>
              </div>

              <button
                className={styles.primaryBtn}
                type="submit"
                disabled={!canSubmit || isLoading}
              >
                {isLoading ? (
                  <span className={styles.loadingRow}>
                    <span className={styles.spinner} /> Signing in…
                  </span>
                ) : "Sign In →"}
              </button>

              <div className={styles.divider}><span>or continue with</span></div>

              <div className={styles.socialRow}>
                <button type="button" className={styles.socialBtn} onClick={() => alert("Google OAuth flow")}>
                  <span className={styles.socialIcon}>G</span> Google
                </button>
                <button type="button" className={styles.socialBtn} onClick={() => alert("Facebook OAuth flow")}>
                  <span className={styles.socialIcon}>f</span> Facebook
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === "otp" && !isLoading && (
            <form className={styles.form} onSubmit={handleVerify} noValidate>
              <div className={styles.otpIconWrap}>
                <span className={styles.otpIcon}>🔐</span>
              </div>
              <h1 className={styles.title}>Verify it's you</h1>
              <p className={styles.subtitle}>
                We sent a 6-digit code to <strong>{email}</strong>. Enter it below to complete sign-in.
              </p>

              <div className={styles.otpInfoCard}>
                <div className={styles.otpInfoRow}>
                  <span className={styles.otpInfoIcon}>📧</span>
                  <div>
                    <div className={styles.otpInfoLabel}>Email verification code</div>
                    <div className={styles.otpInfoVal}>{email}</div>
                  </div>
                </div>
                <div className={styles.otpInfoNote}>
                  🕐 Code expires in 10 minutes &nbsp;·&nbsp; 🔒 Do not share with anyone
                </div>
              </div>

              <OtpInput />

              <div className={styles.timerRow}>
                {otpTimer > 0 ? (
                  <span className={styles.timerText}>Resend code in {otpTimer}s</span>
                ) : (
                  <button type="button" className={styles.resendBtn} onClick={resendOtp}>
                    Resend code →
                  </button>
                )}
              </div>

              <button
                className={styles.primaryBtn}
                type="submit"
                disabled={!canVerify || isLoading}
              >
                {isLoading ? (
                  <span className={styles.loadingRow}>
                    <span className={styles.spinner} /> Verifying…
                  </span>
                ) : "Verify & Sign In →"}
              </button>

              <button type="button" className={styles.backLink} onClick={() => { setStep("credentials"); setOtp(""); setTimerRunning(false); }}>
                ← Back to sign in
              </button>

              <p className={styles.demoTip}>
                💡 Demo tip: Enter any 6 digits to simulate verification
              </p>
            </form>
          )}

          {/* ── STEP 3: SUCCESS ── */}
          {step === "success" && (
            <div className={styles.successWrap}>
              <div className={styles.successIcon}>✅</div>
              <h1 className={styles.successTitle}>You're signed in!</h1>
              <p className={styles.successSub}>
                Welcome back to <strong>Shelters' Horizon</strong>. Your dashboard is ready.
              </p>

              <div className={styles.successCard}>
                <div className={styles.successCardTitle}>Where would you like to go?</div>
                <div className={styles.successLinks}>
                  <button className={styles.successLinkBtn} onClick={() => navigate("/dashboard")}>
                    <span>📊</span><div><strong>Dashboard</strong><br/><span>Your listings, messages & activity</span></div>
                  </button>
                  <button className={styles.successLinkBtn} onClick={() => navigate("/listings")}>
                    <span>🏠</span><div><strong>Browse Listings</strong><br/><span>2,800+ verified properties</span></div>
                  </button>
                  <button className={styles.successLinkBtn} onClick={() => navigate("/messages")}>
                    <span>💬</span><div><strong>Messages</strong><br/><span>Continue your conversations</span></div>
                  </button>
                  <button className={styles.successLinkBtn} onClick={() => navigate("/vault")}>
                    <span>🔐</span><div><strong>Document Vault</strong><br/><span>Access your property documents</span></div>
                  </button>
                </div>
              </div>

              <button className={styles.primaryBtn} style={{ marginTop: "8px" }} onClick={goToDashboard}>
                Go to Dashboard →
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
