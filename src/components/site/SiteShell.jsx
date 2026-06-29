import SiteHeader from "./SiteHeader";

export default function SiteShell({ variant, children }) {
  return (
    <>
      <SiteHeader variant={variant} />
      {children}
    </>
  );
}
