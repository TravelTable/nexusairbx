import React from 'react';
import styles from './VisualMockups.module.css';

export function ProofVisualMockup({ label, compact = false }) {
  const normLabel = (label || '').toUpperCase();

  // 1. GAMEPLAY BEFORE / AFTER
  if (normLabel.includes('GAMEPLAY BEFORE') || normLabel.includes('GAMEPLAY')) {
    return (
      <div className={styles.mockupContainer} data-mockup="gameplay">
        <div className={styles.windowHeader}>
          <div className={styles.windowDots}>
            <span className={styles.dotRed} />
            <span className={styles.dotYellow} />
            <span className={styles.dotGreen} />
          </div>
          <span className={styles.windowTitle}>Game World Transformation</span>
          <span className={styles.badgePulse}>LIVE PLAYTEST</span>
        </div>
        <div className={styles.gameplaySplit}>
          <div className={styles.splitBefore}>
            <span className={styles.tag}>BEFORE</span>
            <div className={styles.wireframeStage}>
              <svg viewBox="0 0 120 80" className={styles.svgWireframe}>
                <rect x="10" y="55" width="100" height="8" rx="2" fill="none" stroke="currentColor" strokeDasharray="2 2" />
                <rect x="25" y="35" width="20" height="20" fill="none" stroke="currentColor" strokeDasharray="2 2" />
                <circle cx="75" cy="45" r="10" fill="none" stroke="currentColor" strokeDasharray="2 2" />
              </svg>
              <span className={styles.subtext}>Blockout & Draft</span>
            </div>
          </div>
          <div className={styles.splitDivider} />
          <div className={styles.splitAfter}>
            <span className={styles.tagGlow}>AFTER NEXUS</span>
            <div className={styles.renderedStage}>
              <svg viewBox="0 0 120 80" className={styles.svgRendered}>
                <defs>
                  <linearGradient id="neonGlow" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#c084fc" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                  <linearGradient id="platformGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#1e1b4b" />
                  </linearGradient>
                </defs>
                {/* Glowing platform */}
                <rect x="8" y="52" width="104" height="12" rx="4" fill="url(#platformGlow)" stroke="#818cf8" strokeWidth="1.5" />
                {/* Floating portal sphere */}
                <circle cx="75" cy="36" r="14" fill="url(#neonGlow)" opacity="0.85" />
                <circle cx="75" cy="36" r="18" fill="none" stroke="#e879f9" strokeWidth="1" strokeDasharray="4 2" />
                {/* Player character silhouette */}
                <rect x="30" y="32" width="12" height="20" rx="3" fill="#f43f5e" />
                <circle cx="36" cy="26" r="5" fill="#fda4af" />
              </svg>
              <span className={styles.subtextGlow}>Lit 3D Scene + Luau Systems</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. STUDIO CHANGE REVIEW / DIFF
  if (normLabel.includes('STUDIO CHANGE') || normLabel.includes('REVIEW')) {
    return (
      <div className={styles.mockupContainer} data-mockup="diff">
        <div className={styles.windowHeader}>
          <div className={styles.windowDots}>
            <span className={styles.dotRed} />
            <span className={styles.dotYellow} />
            <span className={styles.dotGreen} />
          </div>
          <span className={styles.windowTitle}>ServerScriptService / RoundManager.luau</span>
          <span className={styles.badgeDiff}>+24 -8</span>
        </div>
        <div className={styles.codeDiffBody}>
          <div className={styles.diffLineUnchanged}>
            <span className={styles.lineNum}>12</span>
            <code>local ReplicatedStorage = game:GetService("ReplicatedStorage")</code>
          </div>
          <div className={styles.diffLineRemoved}>
            <span className={styles.lineNum}>13</span>
            <code>- local legacyTimer = 30 -- unhandled edge case</code>
          </div>
          <div className={styles.diffLineAdded}>
            <span className={styles.lineNum}>14</span>
            <code>+ local RoundService = require(script.RoundService)</code>
          </div>
          <div className={styles.diffLineAdded}>
            <span className={styles.lineNum}>15</span>
            <code>+ RoundService.StartPhase("Teleporting", {"{"} players = ActiveList {"}"})</code>
          </div>
          <div className={styles.diffLineUnchanged}>
            <span className={styles.lineNum}>16</span>
            <code>RoundService.OnPhaseChanged:Connect(function(phase)</code>
          </div>
        </div>
      </div>
    );
  }

  // 3. MOBILE UI RESULT
  if (normLabel.includes('MOBILE UI') || normLabel.includes('MOBILE')) {
    return (
      <div className={styles.mockupContainer} data-mockup="mobile">
        <div className={styles.windowHeader}>
          <div className={styles.windowDots}>
            <span className={styles.dotRed} />
            <span className={styles.dotYellow} />
            <span className={styles.dotGreen} />
          </div>
          <span className={styles.windowTitle}>Touch & Mobile Viewport</span>
          <span className={styles.badgeSuccess}>RESPONSIVE</span>
        </div>
        <div className={styles.mobileFrame}>
          <div className={styles.mobileScreen}>
            {/* Top Bar HUD */}
            <div className={styles.mobileHudTop}>
              <div className={styles.statPill}>
                <span className={styles.iconHp}>❤️</span>
                <div className={styles.barHp}><div className={styles.barHpFill} style={{ width: '85%' }} /></div>
              </div>
              <div className={styles.coinPill}>🪙 1,450</div>
            </div>
            {/* On-screen Controls */}
            <div className={styles.mobileControls}>
              <div className={styles.virtualJoystick}>
                <div className={styles.joystickKnob} />
              </div>
              <div className={styles.actionButtons}>
                <div className={styles.btnAction}>JUMP</div>
                <div className={styles.btnActionPrimary}>DASH</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. ROUND SYSTEM RESULT
  if (normLabel.includes('ROUND SYSTEM') || normLabel.includes('ROUND')) {
    return (
      <div className={styles.mockupContainer} data-mockup="round">
        <div className={styles.windowHeader}>
          <div className={styles.windowDots}>
            <span className={styles.dotRed} />
            <span className={styles.dotYellow} />
            <span className={styles.dotGreen} />
          </div>
          <span className={styles.windowTitle}>RoundStateAutomaton.luau</span>
          <span className={styles.badgePulse}>STATE MACHINE</span>
        </div>
        <div className={styles.nodeFlow}>
          <div className={`${styles.flowNode} ${styles.flowNodeDone}`}>
            <span className={styles.nodeStatus}>✓</span>
            <span className={styles.nodeName}>Intermission</span>
            <span className={styles.nodeTime}>15s</span>
          </div>
          <div className={styles.flowArrow}>➔</div>
          <div className={`${styles.flowNode} ${styles.flowNodeActive}`}>
            <span className={styles.nodeStatusActive}>●</span>
            <span className={styles.nodeName}>In-Game</span>
            <span className={styles.nodeTime}>180s</span>
          </div>
          <div className={styles.flowArrow}>➔</div>
          <div className={styles.flowNode}>
            <span className={styles.nodeStatusIdle}>○</span>
            <span className={styles.nodeName}>Victory</span>
            <span className={styles.nodeTime}>10s</span>
          </div>
        </div>
      </div>
    );
  }

  // 5. CREATOR DASHBOARD
  if (normLabel.includes('CREATOR DASHBOARD') || normLabel.includes('DASHBOARD')) {
    return (
      <div className={styles.mockupContainer} data-mockup="dashboard">
        <div className={styles.windowHeader}>
          <div className={styles.windowDots}>
            <span className={styles.dotRed} />
            <span className={styles.dotYellow} />
            <span className={styles.dotGreen} />
          </div>
          <span className={styles.windowTitle}>Nexus Analytics & Studio Metrics</span>
          <span className={styles.badgeSuccess}>UPTIME 99.9%</span>
        </div>
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Concurrent Players</span>
            <span className={styles.metricValue}>1,284</span>
            <span className={styles.metricTrend}>↑ +14% this hour</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Script Exec Time</span>
            <span className={styles.metricValue}>0.42 ms</span>
            <span className={styles.metricTrendGood}>✓ 60 FPS Target</span>
          </div>
        </div>
        <div className={styles.svgChartWrap}>
          <svg viewBox="0 0 200 40" className={styles.svgChart}>
            <path d="M0 35 Q 30 15, 60 25 T 120 10 T 180 20 L 200 8 L 200 40 L 0 40 Z" fill="url(#chartGrad)" opacity="0.3" />
            <path d="M0 35 Q 30 15, 60 25 T 120 10 T 180 20 L 200 8" fill="none" stroke="#a855f7" strokeWidth="2" />
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    );
  }

  // 6. PROJECT TEST RECORD (Default Fallback for Proof Rail)
  return (
    <div className={styles.mockupContainer} data-mockup="test">
      <div className={styles.windowHeader}>
        <div className={styles.windowDots}>
          <span className={styles.dotRed} />
          <span className={styles.dotYellow} />
          <span className={styles.dotGreen} />
        </div>
        <span className={styles.windowTitle}>Automated Test Runner</span>
        <span className={styles.badgeSuccess}>7 / 7 PASSED</span>
      </div>
      <div className={styles.testConsole}>
        <div className={styles.testLine}>
          <span className={styles.testCheck}>✓</span>
          <span>studioToolProtocol.test.js</span>
          <span className={styles.testTime}>12ms</span>
        </div>
        <div className={styles.testLine}>
          <span className={styles.testCheck}>✓</span>
          <span>RoundService.spec.luau</span>
          <span className={styles.testTime}>8ms</span>
        </div>
        <div className={styles.testLine}>
          <span className={styles.testCheck}>✓</span>
          <span>InventoryDataStore.spec.luau</span>
          <span className={styles.testTime}>19ms</span>
        </div>
        <div className={styles.testFooter}>
          <span>Snapshot hash: <code>a8f912c</code></span>
          <span className={styles.testBadgeClean}>VERIFIED CLEAN</span>
        </div>
      </div>
    </div>
  );
}

export default ProofVisualMockup;
