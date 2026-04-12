import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import styles from "./Navbar.module.css";

const NAV_LINKS = [
  { label: "Listings", href: "/listings" },
  { label: "Services", href: "/services" },
  { label: "Area Reports", href: "/area-report" },
  { label: "How It Works", href: "/#how-it-works" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const navClass = [
    styles.navbar,
    scrolled || !isHome ? styles.solid : styles.transparent,
    mobileOpen ? styles.mobileActive : "",
  ].join(" ");

  return (
    <nav className={navClass} role="navigation" aria-label="Main navigation">
      <div className={styles.inner}>
        {/* ── Logo ── */}
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path
                d="M14 2L2 10V26H10V18H18V26H26V10L14 2Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M14 6L5 12.5V25H10.5V17.5H17.5V25H23V12.5L14 6Z"
                fill="rgba(212,175,55,0.15)"
              />
              <circle cx="14" cy="10" r="2" fill="#d4af37" />
            </svg>
          </span>
          <span className={styles.logoText}>
            Shelters<span className={styles.logoAccent}>'</span>
            <br />
            <span className={styles.logoSub}>HORIZON</span>
          </span>
        </Link>

        {/* ── Desktop Links ── */}
        <ul className={styles.navLinks} role="list">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                to={link.href}
                className={[
                  styles.navLink,
                  location.pathname === link.href ? styles.active : "",
                ].join(" ")}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* ── CTA Buttons ── */}
        <div className={styles.actions}>
          <Link to="/dashboard" className={`btn btn-ghost ${styles.dashBtn}`}>
            Dashboard
          </Link>
          <Link to="/create-listing" className={`btn btn-primary ${styles.listBtn}`}>
            List Property
          </Link>
          <button
            className={styles.hamburger}
            aria-label="Toggle mobile menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
          >
            <span className={styles.bar} />
            <span className={styles.bar} />
            <span className={styles.bar} />
          </button>
        </div>
      </div>

      {/* ── Mobile Menu ── */}
      {mobileOpen && (
        <div className={styles.mobileMenu}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={styles.mobileLink}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className={styles.mobileCtas}>
            <Link to="/dashboard" className="btn btn-outline-silver" onClick={() => setMobileOpen(false)}>
              Dashboard
            </Link>
            <Link to="/create-listing" className="btn btn-primary" onClick={() => setMobileOpen(false)}>
              List Property
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
