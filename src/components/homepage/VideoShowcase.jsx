import React from "react";
import styles from "./HomepageCinematic.module.css";

export default function VideoShowcase() {
  return (
    <section id="proof" className={styles.videoSection} aria-labelledby="video-showcase-heading">
      <div className={styles.sectionHeading}>
        <h2 id="video-showcase-heading">See what creators build with NexusRBX</h2>
        <p>
          Real gameplay, custom systems, and Roblox Studio project results captured directly from live test environments.
        </p>
      </div>

      <div className={styles.videoGrid}>
        <article className={styles.videoCard}>
          <div className={styles.videoWrapper}>
            <video
              className={styles.videoElement}
              src="/assets/videos/p6.mp4"
              autoPlay
              loop
              muted
              playsInline
              controls
              aria-label="Video demo of 3D platforming traversal and gameplay mechanics"
            />
          </div>
          <div className={styles.videoMeta}>
            <h3>3D Traversal & Platforming Systems</h3>
            <p>Character mechanics, custom movement controllers, and interactive level elements in action.</p>
          </div>
        </article>

        <article className={styles.videoCard}>
          <div className={styles.videoWrapper}>
            <video
              className={styles.videoElement}
              src="/assets/videos/p8.mp4"
              autoPlay
              loop
              muted
              playsInline
              controls
              aria-label="Video demo of competitive arena match logic and multiplayer rounds"
            />
          </div>
          <div className={styles.videoMeta}>
            <h3>Multiplayer Arena & Match Logic</h3>
            <p>Round state machines, team scoring, server validation, and active match loops.</p>
          </div>
        </article>
      </div>
    </section>
  );
}
