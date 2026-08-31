import styles from "./UniversalHeader.module.css";

function renderLink(LinkComponent, href, props = {}, children) {
  const { key, ...linkProps } = props;
  if (!LinkComponent || LinkComponent === "a") {
    return <a key={key} href={href} {...linkProps}>{children}</a>;
  }
  return <LinkComponent key={key} to={href} {...linkProps}>{children}</LinkComponent>;
}

export default function UniversalBrand({ LinkComponent = "a", href = "/", compact = false }) {
  return renderLink(
    LinkComponent,
    href,
    { className: styles.brand, "aria-label": "NexusRBX home" },
    <>
      {!compact ? <span className={styles.brandMark} aria-hidden="true">PROJECT /</span> : null}
      <img
        src="/favicon.png"
        alt=""
        aria-hidden="true"
        className={styles.brandIcon}
      />
    </>,
  );
}

export { renderLink };
