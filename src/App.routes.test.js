import fs from "fs";
import path from "path";

const appSource = fs.readFileSync(path.join(process.cwd(), "src/App.js"), "utf8");
const headerSource = fs.readFileSync(path.join(process.cwd(), "src/components/site/SiteHeader.jsx"), "utf8");
const navigationSource = fs.readFileSync(path.join(process.cwd(), "src/content/universalNavigation.js"), "utf8");
const signInSource = fs.readFileSync(path.join(process.cwd(), "src/pages/SignInPage.jsx"), "utf8");
const signUpSource = fs.readFileSync(path.join(process.cwd(), "src/pages/SignUpPage.jsx"), "utf8");

test("keeps capability and authenticated icon routes explicit and collision-free", () => {
  expect(appSource).toContain('<Route path="/tools/icon-generator"');
  expect(appSource).toContain('AUTHENTICATED_ICON_DETAIL_ROUTE = "/icons-market/:id"');
  expect(appSource).not.toContain('<Route path="/icons/:id"');
});

test("keeps both asset deep links owned when capability reads are disabled", () => {
  expect(appSource).toContain('<Route path="/assets" element={withSiteShell(<AssetLibraryRouteContent />');
  expect(appSource).toContain('<Route path="/assets/:assetId" element={withSiteShell(<AssetDetailRouteContent />');
  expect(appSource).toContain('<NexusRBXAssetPlatformUnavailablePage view="library" />');
  expect(appSource).toContain('<NexusRBXAssetPlatformUnavailablePage view="detail" />');
});

test("owns the password-reset deep link", () => {
  expect(appSource).toContain('<Route path="/forgot-password"');
});

test("keeps canonical legal pages reachable through the app router and legacy aliases", () => {
  expect(appSource).toContain('<Route path="/legal/terms"');
  expect(appSource).toContain('<Route path="/legal/privacy"');
  expect(appSource).toContain('<Route path="/privacy" element={<Navigate to="/legal/privacy" replace />}');
  expect(appSource).toContain('<Route path="/terms" element={<Navigate to="/legal/terms" replace />}');
  expect(headerSource).toContain('STATIC_PUBLIC_PATHS = ["/docs", "/pricing", "/legal"]');
  expect(navigationSource).toContain('{ href: "/legal", label: "Legal documents"');
  expect(signUpSource).toContain('href="/legal/terms"');
  expect(signUpSource).toContain('href="/legal/privacy"');
  for (const source of [signInSource, signUpSource]) {
    expect(source).not.toContain('href="/terms"');
    expect(source).not.toContain('href="/privacy"');
  }
});
