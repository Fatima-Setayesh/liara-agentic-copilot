import Image from "next/image";
import { CircuitBoard, ScanSearch } from "lucide-react";

import styles from "./streaming-states.module.css";

export function ResponseSkeleton() {
  return (
    <section className={styles.responseSkeleton} aria-label="Liara is preparing a response">
      <span className={styles.signalSweep} aria-hidden="true" />
      <header className={styles.skeletonHeader}>
        <span className={styles.skeletonAvatar} aria-hidden="true">
          <Image src="/liara-logo.png" alt="" width={24} height={24} />
        </span>
        <span className={styles.skeletonHeading}>
          <strong>Establishing response context</strong>
          <small>Liara is assembling a grounded answer</small>
        </span>
        <ScanSearch size={17} strokeWidth={1.7} aria-hidden="true" />
      </header>

      <div className={styles.telemetryLanes} aria-hidden="true">
        <span style={{ "--lane-width": "88%", "--lane-delay": "0ms" } as React.CSSProperties} />
        <span style={{ "--lane-width": "73%", "--lane-delay": "110ms" } as React.CSSProperties} />
        <span style={{ "--lane-width": "94%", "--lane-delay": "220ms" } as React.CSSProperties} />
        <span style={{ "--lane-width": "61%", "--lane-delay": "330ms" } as React.CSSProperties} />
      </div>

      <div className={styles.skeletonModule} aria-hidden="true">
        <span className={styles.moduleIcon}><CircuitBoard size={16} strokeWidth={1.6} /></span>
        <span className={styles.moduleLines}>
          <i />
          <i />
          <i />
        </span>
        <span className={styles.moduleSignal} />
      </div>

      <footer className={styles.skeletonFooter}>
        <span className={styles.liveSignal} aria-hidden="true"><i /></span>
        <span>Secure context channel active</span>
      </footer>
    </section>
  );
}
