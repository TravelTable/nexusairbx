import SiteHeader from "./SiteHeader";

export default function SiteShell({ variant, children }) {
  if (variant === "auth") return children;

  return (
    <>
      <SiteHeader variant={variant} />
      {children}
    </>
  );
}
