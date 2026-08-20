import styles from "./streaming-states.module.css";

type TypingCursorProps = {
  visible: boolean;
};

export function TypingCursor({ visible }: TypingCursorProps) {
  if (!visible) return null;

  return <span className={styles.typingCursor} aria-hidden="true" />;
}
