import { homepageFooterLinks } from "../../content/homepageLanding";
import styles from "./HomepageCinematic.module.css";

export default function HomepageFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerMain}>
        <a className={styles.footerBrand} href="/" aria-label="NexusRBX home">
          <img src="/logo.png" alt="" width="25" height="25" />
          <span>NexusRBX</span>
        </a>
        <nav className={styles.footerNav} aria-label="Footer">
          {homepageFooterLinks.map((link) => (
            <a href={link.href} key={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
      <p className={styles.footerFinePrint}>
        NexusRBX.com is an independent developer tool and is not affiliated with Roblox Corporation.
      </p>
    </footer>
  );
}
