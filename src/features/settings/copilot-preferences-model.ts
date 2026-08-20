import { z } from "zod";

import { userContextSchema, type UserContext } from "../../contracts";

export const copilotPreferencesSchema = z.strictObject({
  userContext: userContextSchema,
  connectionMode: z.enum(["preview", "live"]),
  sendOnEnter: z.boolean(),
});

export type ConnectionMode = z.infer<typeof copilotPreferencesSchema>["connectionMode"];
export type CopilotPreferences = z.infer<typeof copilotPreferencesSchema>;

export const defaultCopilotPreferences: CopilotPreferences = {
  userContext: { answerDepth: "detailed" },
  connectionMode: "preview",
  sendOnEnter: true,
};

export function parseStoredCopilotPreferences(value: string | null): CopilotPreferences | null {
  if (!value) return null;

  try {
    const result = copilotPreferencesSchema.safeParse(JSON.parse(value));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function normalizeUserContext(context: UserContext): UserContext {
  return userContextSchema.parse(Object.fromEntries(
    Object.entries(context).filter(([, value]) => value !== "" && value !== undefined),
  ));
}
