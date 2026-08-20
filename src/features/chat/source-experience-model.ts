import type { Citation } from "@/contracts";

export type SourceKind = "official-docs" | "official-repository" | "external-docs" | "project-context" | "analyzed-file";

export type AnalyzedFile = {
  id: string;
  path: string;
  descriptor?: string;
  technologies?: string[];
};

export type ProjectEvidence = {
  summary?: string;
  files: AnalyzedFile[];
  technologies?: string[];
  configurationReviewed?: boolean;
};

export type DocumentationSourceItem = {
  id: string;
  kind: "official-docs" | "official-repository";
  title: string;
  typeLabel: string;
  descriptor: string;
  trustLabel: string;
  citation: Citation;
};

export type ProjectSourceItem = {
  id: string;
  kind: "project-context";
  title: string;
  typeLabel: string;
  descriptor: string;
  trustLabel: string;
  evidence: ProjectEvidence;
};

export type SourceItem = DocumentationSourceItem | ProjectSourceItem;

function getDocumentationKind(citation: Citation): DocumentationSourceItem["kind"] {
  return new URL(citation.source.url).hostname === "docs.liara.ir"
    ? "official-docs"
    : "official-repository";
}

export function createSourceItems(citations: Citation[], projectEvidence?: ProjectEvidence): SourceItem[] {
  const documentationItems: DocumentationSourceItem[] = citations.map((citation) => {
    const kind = getDocumentationKind(citation);

    return {
      id: `citation:${citation.id}`,
      kind,
      title: citation.source.title,
      typeLabel: kind === "official-docs" ? "Official Docs" : "Official Repository",
      descriptor: citation.source.sectionHeading
        ?? citation.source.documentationPath
        ?? citation.source.serviceCategory
        ?? "Liara documentation",
      trustLabel: "Verified official",
      citation,
    };
  });

  if (!projectEvidence || projectEvidence.files.length === 0) {
    return documentationItems;
  }

  return [
    ...documentationItems,
    {
      id: "evidence:project-context",
      kind: "project-context",
      title: "Project context",
      typeLabel: "Project Context",
      descriptor: `${projectEvidence.files.length} analyzed ${projectEvidence.files.length === 1 ? "file" : "files"}`,
      trustLabel: "Analyzed locally",
      evidence: projectEvidence,
    },
  ];
}
