import React from 'react';
import styles from './VisualMockups.module.css';

export function ToolVisualMockup({ label }) {
  const normLabel = (label || '').toUpperCase();

  // 1. AGENT WORKSPACE SCREENSHOT
  if (normLabel.includes('AGENT WORKSPACE') || normLabel.includes('AGENT')) {
    return (
      <div className={styles.largeMockupContainer}>
        <div className={styles.windowHeader}>
          <div className={styles.windowDots}>
            <span className={styles.dotRed} />
            <span className={styles.dotYellow} />
            <span className={styles.dotGreen} />
          </div>
          <span className={styles.windowTitle}>Nexus AI Agent Workspace — Project "Arcade Escape"</span>
          <span className={styles.badgePulse}>AGENT ACTIVE</span>
        </div>
        <div className={styles.workspaceBody}>
          <div className={styles.workspaceSidebar}>
            <div className={styles.sidebarHeader}>EXPLORER & PLAN</div>
            <div className={styles.treeItemActive}>📄 ServerScriptService/RoundService.luau</div>
            <div className={styles.treeItem}>📄 ReplicatedStorage/RoundConfig.luau</div>
            <div className={styles.treeItem}>📦 StarterGui/RoundTimerHud.rbxmx</div>
            <div className={styles.sidebarSection}>
              <span className={styles.sectionTitle}>PROPOSED PLAN</span>
              <div className={styles.planStep}>1. Read current project map</div>
              <div className={styles.planStep}>2. Add RoundService module</div>
              <div className={styles.planStep}>3. Wire client HUD remote events</div>
            </div>
          </div>
          <div className={styles.workspaceEditor}>
            <div className={styles.editorTabs}>
              <div className={styles.tabActive}>RoundService.luau</div>
              <div className={styles.tabInactive}>RoundConfig.luau</div>
            </div>
            <div className={styles.editorCode}>
              <pre>
<code><span className={styles.codeKw}>local</span> RoundService = {}
RoundService.__index = RoundService

<span className={styles.codeKw}>function</span> <span className={styles.codeFn}>RoundService.new</span>()
    <span className={styles.codeKw}>local</span> self = setmetatable({}, RoundService)
    self.State = <span className={styles.codeStr}>"Intermission"</span>
    self.TimeRemaining = <span className={styles.codeNum}>15</span>
    <span className={styles.codeKw}>return</span> self
<span className={styles.codeKw}>end</span>

<span className={styles.codeKw}>function</span> <span className={styles.codeFn}>RoundService:StartLoop</span>()
    <span className={styles.codeComment}>-- Synced with Roblox Studio via Nexus Bridge</span>
    game:GetService(<span className={styles.codeStr}>"RunService"</span>).Heartbeat:Connect(<span className={styles.codeKw}>function</span>(dt)
        self:UpdateState(dt)
    <span className={styles.codeKw}>end</span>)
<span className={styles.codeKw}>end</span></code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. STUDIO BRIDGE SCREENSHOT
  if (normLabel.includes('STUDIO BRIDGE') || normLabel.includes('STUDIO')) {
    return (
      <div className={styles.largeMockupContainer}>
        <div className={styles.windowHeader}>
          <div className={styles.windowDots}>
            <span className={styles.dotRed} />
            <span className={styles.dotYellow} />
            <span className={styles.dotGreen} />
          </div>
          <span className={styles.windowTitle}>Roblox Studio Connector Plugin v2.4</span>
          <span className={styles.badgeSuccess}>CONNECTED TO STUDIO</span>
        </div>
        <div className={styles.studioBridgeGrid}>
          <div className={styles.bridgeInfoCard}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Place ID:</span>
              <code className={styles.infoValue}>13849182049 (Horror Arcade Place)</code>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Plugin Status:</span>
              <span className={styles.badgeConnected}>● Listening on localhost:3001</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Last Snapshot:</span>
              <span className={styles.infoValue}>Snapshot #48 (2 mins ago)</span>
            </div>
          </div>
          <div className={styles.treeViewCard}>
            <div className={styles.treeHeader}>ROBLOX OBJECT TREE</div>
            <div className={styles.treeNode}>📁 Workspace</div>
            <div className={styles.treeNodeSub}>└── 📁 MapGrid</div>
            <div className={styles.treeNodeSub}>    └── 🟦 ShiftRoom_01</div>
            <div className={styles.treeNode}>📁 ReplicatedStorage</div>
            <div className={styles.treeNodeSub}>└── ⚡ RemoteEvent ("PhaseChanged")</div>
            <div className={styles.treeNode}>📁 ServerScriptService</div>
            <div className={styles.treeNodeSub}>└── 📜 RoundManager (Luau)</div>
          </div>
        </div>
      </div>
    );
  }

  // 3. ASSET LIBRARY SCREENSHOT
  if (normLabel.includes('ASSET LIBRARY') || normLabel.includes('ASSET')) {
    return (
      <div className={styles.largeMockupContainer}>
        <div className={styles.windowHeader}>
          <div className={styles.windowDots}>
            <span className={styles.dotRed} />
            <span className={styles.dotYellow} />
            <span className={styles.dotGreen} />
          </div>
          <span className={styles.windowTitle}>Nexus Project Asset Library & Icon Generator</span>
          <span className={styles.badgeSuccess}>24 ASSETS READY</span>
        </div>
        <div className={styles.assetGallery}>
          <div className={styles.assetCard}>
            <div className={styles.assetIconPreview} style={{ background: 'radial-gradient(circle, #a855f7 0%, #1e1b4b 100%)' }}>
              <span className={styles.assetEmoji}>⚡</span>
            </div>
            <span className={styles.assetName}>Stamina_Boost.png</span>
            <span className={styles.assetSub}>Decal ID: 1049281...</span>
          </div>
          <div className={styles.assetCard}>
            <div className={styles.assetIconPreview} style={{ background: 'radial-gradient(circle, #38bdf8 0%, #0c4a6e 100%)' }}>
              <span className={styles.assetEmoji}>🛡️</span>
            </div>
            <span className={styles.assetName}>Shield_Aura.png</span>
            <span className={styles.assetSub}>Decal ID: 1049282...</span>
          </div>
          <div className={styles.assetCard}>
            <div className={styles.assetIconPreview} style={{ background: 'radial-gradient(circle, #f59e0b 0%, #451a03 100%)' }}>
              <span className={styles.assetEmoji}>🔑</span>
            </div>
            <span className={styles.assetName}>Arcade_Keycard.png</span>
            <span className={styles.assetSub}>Decal ID: 1049283...</span>
          </div>
          <div className={styles.assetCard}>
            <div className={styles.assetIconPreview} style={{ background: 'radial-gradient(circle, #10b981 0%, #064e3b 100%)' }}>
              <span className={styles.assetEmoji}>🧪</span>
            </div>
            <span className={styles.assetName}>Health_Potion.png</span>
            <span className={styles.assetSub}>Decal ID: 1049284...</span>
          </div>
        </div>
      </div>
    );
  }

  // 4. FULL WORKSPACE OVERVIEW (Default for Stack Lead Section)
  return (
    <div className={styles.largeMockupContainer}>
      <div className={styles.windowHeader}>
        <div className={styles.windowDots}>
          <span className={styles.dotRed} />
          <span className={styles.dotYellow} />
          <span className={styles.dotGreen} />
        </div>
        <span className={styles.windowTitle}>NexusRBX Integrated Studio & Agent Workspace</span>
        <span className={styles.badgePulse}>SYSTEMS READY</span>
      </div>
      <div className={styles.stackOverviewGrid}>
        <div className={styles.stackCol}>
          <span className={styles.stackColTitle}>1. AGENT & PROMPT</span>
          <div className={styles.promptMockBox}>
            "Build a round-based horror game with shifting rooms and mobile HUD controls."
          </div>
          <div className={styles.statusPill}>✓ Place Manifest Parsed</div>
        </div>
        <div className={styles.stackCol}>
          <span className={styles.stackColTitle}>2. LUAU GENERATOR</span>
          <div className={styles.miniCodeBlock}>
            <code>RoundService:StartPhase("Game")</code>
            <br />
            <code>HUD:UpdateTimer(180)</code>
          </div>
          <div className={styles.statusPill}>✓ Clean Code Diff</div>
        </div>
        <div className={styles.stackCol}>
          <span className={styles.stackColTitle}>3. STUDIO SYNC</span>
          <div className={styles.syncBox}>
            <span>Studio Connection: <strong>Active</strong></span>
            <br />
            <span>Applied changes: <strong>3 files</strong></span>
          </div>
          <div className={styles.statusPill}>✓ 1-Click Restore Snapshot</div>
        </div>
      </div>
    </div>
  );
}

export default ToolVisualMockup;
