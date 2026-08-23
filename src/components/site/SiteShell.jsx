import SiteHeader from "./SiteHeader";
import SkipToMainContent from "./SkipToMainContent";

export default function SiteShell({ variant, children }) {
  const shell = variant || "marketing";

  if (shell === "auth") {
    return (
      <div className="nx-site-shell" data-shell="auth">
        <SkipToMainContent targetId="site-shell-content" />
        <div id="site-shell-content" className="nx-site-shell__content" tabIndex={-1}>{children}</div>
      </div>
    );
  }

  return (
    <div className="nx-site-shell" data-shell={shell}>
      <SiteHeader variant={shell} skipTargetId="site-shell-content" />
      <div id="site-shell-content" className="nx-site-shell__content" tabIndex={-1}>{children}</div>
    </div>
  );
}
