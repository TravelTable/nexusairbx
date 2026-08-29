import styles from "./BotMessageSquareIcon.module.css";

export default function BotMessageSquareIcon({ size = 18, ...props }) {
  return (
    <svg
      aria-hidden="true"
      className={styles.icon}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      <path d="M12 6V2H8" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path
        className={styles.bubble}
        d="M20 16a2 2 0 0 1-2 2H8.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 4 20.286V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"
      />
      <path
        className={`${styles.eye} ${styles.eyeLeft}`}
        d="M9 11v2"
      />
      <path
        className={`${styles.eye} ${styles.eyeRight}`}
        d="M15 11v2"
      />
      {[10, 12, 14].map((cx, index) => (
        <circle
          key={cx}
          className={styles.dot}
          cx={cx}
          cy="18"
          r="0.5"
          style={{ "--bot-dot-delay": `${index * 0.3}s` }}
        />
      ))}
    </svg>
  );
}
