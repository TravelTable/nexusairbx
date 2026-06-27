import PublicAccountState from "./PublicAccountState";

export default function PublicHeader() {
  return (
    <header className="public-header">
      <div className="public-header-inner">
        <a className="brand-mark" href="/" aria-label="NexusRBX home">
          <span className="brand-bolt" aria-hidden="true">N</span>
          <span>NexusRBX</span>
        </a>
        <nav className="nav-links" aria-label="Primary">
          <a href="/roblox-script-generator">Script Generator</a>
          <a href="/roblox-gui-maker">GUI Maker</a>
          <a href="/docs">Docs</a>
          <a href="/tools/icon-generator">Icon Generator</a>
          <a href="/subscribe">Pricing</a>
        </nav>
        <div className="header-actions">
          <PublicAccountState />
          <a className="button button-primary" href="/ai">Open AI</a>
        </div>
      </div>
    </header>
  );
}
