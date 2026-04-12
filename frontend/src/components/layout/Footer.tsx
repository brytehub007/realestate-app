import { Link } from "react-router-dom";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      {/* Gold rule top */}
      <div className={styles.topRule} />

      <div className={`container ${styles.grid}`}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.logoRow}>
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
              <path d="M14 2L2 10V26H10V18H18V26H26V10L14 2Z" stroke="#d4af37" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
              <circle cx="14" cy="10" r="2" fill="#d4af37" />
            </svg>
            <span className={styles.brandName}>
              Shelters<span style={{ color: "#d4af37" }}>'</span>&nbsp;Horizon
            </span>
          </div>
          <p className={styles.tagline}>
            Nigeria's Most Transparent Real Estate marketplace. Every price shown. Every title verified.
          </p>
          <div className={styles.socialRow}>
            {["Twitter", "LinkedIn", "Instagram", "YouTube"].map((s) => (
              <a key={s} href="#" className={styles.social} aria-label={s}>{s[0]}</a>
            ))}
          </div>
        </div>

        {/* Links */}
        {[
          {
            heading: "Marketplace",
            links: ["Browse Listings", "Create Listing", "Verified Properties", "Price Guide"],
          },
          {
            heading: "Services",
            links: ["Hire a Surveyor", "Hire a Lawyer", "Due Diligence", "Escrow System"],
          },
          {
            heading: "Community",
            links: ["Area Reports", "Neighborhood Alerts", "Forum", "Blog"],
          },
          {
            heading: "Company",
            links: ["About Us", "Careers", "Press", "Contact", "Legal"],
          },
        ].map(({ heading, links }) => (
          <div key={heading} className={styles.col}>
            <h4 className={styles.colHead}>{heading}</h4>
            <ul className={styles.linkList}>
              {links.map((l) => (
                <li key={l}>
                  <a href="#" className={styles.footLink}>{l}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className={styles.bottom}>
        <div className="container">
          <div className={styles.bottomRow}>
            <p className={styles.copy}>
              &copy; {new Date().getFullYear()} Shelters&rsquo; Horizon Real Estate Ltd. All rights reserved.
            </p>
            <p className={styles.disclaimer}>
              All listed prices are mandatory. "Price on Call" listings are not permitted.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
