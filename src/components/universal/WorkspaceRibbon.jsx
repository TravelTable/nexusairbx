import UniversalBrand from "./UniversalBrand";
import styles from "./WorkspaceRibbon.module.css";

export default function WorkspaceRibbon({
  LinkComponent = "a",
  left = null,
  right = null,
  label = "CURRENT PROJECT",
  className = "",
}) {
  return (
    <header className={`${styles.ribbon} ${className}`} data-workspace-ribbon>
      <div className={styles.brand}><UniversalBrand LinkComponent={LinkComponent} compact /></div>
      <div className={styles.left}>
        <span className={styles.label}>{label}</span>
        {left}
      </div>
      <div className={styles.right}>{right}</div>
    </header>
  );
}
