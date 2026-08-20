import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { defaultCopilotPreferences } from "./copilot-preferences-model";
import { SettingsDialog } from "./settings-dialog";

describe("SettingsDialog", () => {
  it("renders explicit context and connection controls without inventing profile data", () => {
    const html = renderToStaticMarkup(
      <SettingsDialog
        open
        preferences={defaultCopilotPreferences}
        onClose={vi.fn()}
        onUpdateUserContext={vi.fn()}
        onConnectionModeChange={vi.fn()}
        onSendOnEnterChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(html).toContain("Developer context");
    expect(html).toContain("Interface preview");
    expect(html).toContain("Live chat API");
    expect(html).toContain("Share only the context you want Liara to retain.");
    expect(html).not.toContain("Next.js</input>");
  });
});
