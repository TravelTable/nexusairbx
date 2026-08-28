"use client";

import { useEffect, useMemo, useState } from "react";
import { detectCompanionPlatform, fetchCompanionManifest } from "../../lib/companionDownloads";
import styles from "./ConnectorReleaseCard.module.css";

const TILE_ROWS = 20;
const TILE_COLUMNS = 22;
const TILE_ANIMATION_DURATION = 14;

function DecorativeTilesBackground() {
  const tiles = useMemo(
    () =>
      Array.from({ length: TILE_ROWS }, (_, rowIndex) =>
        Array.from({ length: TILE_COLUMNS }, (_, columnIndex) => ({
          key: `tile-${rowIndex}-${columnIndex}`,
          delay: ((rowIndex * 17 + columnIndex * 29) % 140) / 10,
        }))
      ),
    []
  );

  return (
    <div aria-hidden="true" className={styles.tiles}>
      {tiles.map((row, rowIndex) => (
        <div className={styles.tileRow} key={`line-${rowIndex}`}>
          {row.map((tile) => (
            <span className={styles.tile} key={tile.key}>
              <span
                className={styles.tileGlow}
                style={{
                  animationDelay: `${tile.delay}s`,
                  animationDuration: `${TILE_ANIMATION_DURATION}s`,
                }}
              />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function ConnectorReleaseCard() {
  const [release, setRelease] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchCompanionManifest({ signal: controller.signal })
      .then((manifest) => {
        const platform = detectCompanionPlatform({
          userAgent: window.navigator.userAgent,
          platform: window.navigator.userAgentData?.platform || window.navigator.platform,
        });
        const selectedPlatform = platform || "windows";
        setRelease({ version: manifest.version, url: manifest.platforms[selectedPlatform].url });
      })
      .catch(() => setRelease(null));
    return () => controller.abort();
  }, []);

  return (
    <article className={styles.card} aria-label="Nexus Connector release">
      <DecorativeTilesBackground />
      <div className={styles.copy}>
        <div className={styles.titleRow}>
          <h2>Nexus Connector</h2>
          <span>{release ? `v${release.version} out now` : "v0.2.15 out now"}</span>
        </div>
        <p>Connect Nexus to Roblox Studio through the local MCP bridge.</p>
      </div>
      <a className={styles.download} href={release?.url || "/downloads"}>
        Download
      </a>
    </article>
  );
}
