import { homepageFooterLinks } from "../../content/homepageLanding";
import styles from "./HomepageCinematic.module.css";

export default function HomepageFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerMain}>
        <div className={styles.footerIdentity}>
          <a className={styles.footerBrand} href="/" aria-label="NexusRBX home">
            <img src="/nexus-mark.svg" alt="" width="28" height="28" />
            <span>NexusRBX</span>
          </a>
          <p>Build the game in your head. Keep the creative decisions and the upside.</p>
        </div>
        <nav className={styles.footerNav} aria-label="Footer">
          {homepageFooterLinks.map((link) => (
            <a href={link.href} key={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
      <p className={styles.footerFinePrint}>
        NexusRBX is an independent developer tool and is not affiliated with or endorsed by Roblox Corporation.
        Earnings are never guaranteed.
      </p>
    </footer>
  );
}
