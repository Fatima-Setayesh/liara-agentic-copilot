import { TypingCursor } from "./typing-cursor";
import styles from "./streaming-states.module.css";

type StreamingMessageProps = {
  text: string;
  progress: number;
  range: readonly [number, number];
  streaming: boolean;
};

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function StreamingMessage({ text, progress, range, streaming }: StreamingMessageProps) {
  if (!streaming) return <>{text}</>;

  const [start, end] = range;
  const localProgress = clamp((progress - start) / (end - start));
  const characters = Array.from(text);
  const visibleCharacterCount = Math.ceil(characters.length * localProgress);
  const visibleText = characters.slice(0, visibleCharacterCount).join("");
  const isActive = localProgress > 0 && localProgress < 1;

  return (
    <span className={styles.streamingMessage} aria-hidden="true">
      {visibleText}
      <TypingCursor visible={isActive} />
    </span>
  );
}
