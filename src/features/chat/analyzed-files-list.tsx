import { Check, FileCode2, Files } from "lucide-react";

import type { AnalyzedFile } from "./source-experience-model";
import styles from "./sources-section.module.css";

type AnalyzedFilesListProps = {
  files: AnalyzedFile[];
};

function getFileName(path: string) {
  return path.split(/[\\/]/).at(-1) ?? path;
}

function getDirectory(path: string) {
  const normalized = path.replace(/\\/g, "/");
  const separatorIndex = normalized.lastIndexOf("/");
  return separatorIndex === -1 ? "project root" : normalized.slice(0, separatorIndex);
}

export function AnalyzedFilesList({ files }: AnalyzedFilesListProps) {
  return (
    <section className={styles.analyzedFiles} aria-label="Analyzed files">
      <header>
        <span aria-hidden="true"><Files size={16} strokeWidth={1.8} /></span>
        <div>
          <h4>Analyzed files</h4>
          <small>{files.length} {files.length === 1 ? "file" : "files"} grounded this response</small>
        </div>
      </header>
      <ul>
        {files.map((file) => (
          <li key={file.id}>
            <span className={styles.fileScanStatus} aria-hidden="true"><Check size={12} strokeWidth={2.2} /></span>
            <span className={styles.fileIdentity}>
              <strong><FileCode2 size={13} aria-hidden="true" />{getFileName(file.path)}</strong>
              <small title={file.path}>{getDirectory(file.path)}</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
