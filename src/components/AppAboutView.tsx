/**
 * AppAboutView.tsx
 * Displays basic information about the app.
 */

import { TextAttributes } from "@opentui/core";

const colors = {
  primary: "#F59E0B",
  text: "#D1CCC7",
  muted: "#9C958B",
  info: "#06B6D4",
} as const;

export function AppAboutView() {
  return (
    <box flexDirection="column" flexGrow={1} maxWidth={58}>
      <box marginBottom={2} flexDirection="row">
        <text fg={colors.info}>Opencode</text>
        <text fg={colors.muted}> Workflows</text>
        <text fg={colors.primary}> Manager</text>
      </box>

      <box marginBottom={1}>
        <text fg={colors.text}>
          A universal workflow registry manager for Opencode. Browse curated registries,
          install items locally or globally, and keep workflows up to date.
        </text>
      </box>

      <box marginBottom={1}>
        <text fg={colors.text}>
          Registries are fetched from GitHub and can be customized with registry.toml.
        </text>
      </box>

      <box marginBottom={1}>
        <text fg={colors.primary} attributes={TextAttributes.BOLD}>
          Open, inspect, remix.
        </text>
      </box>

      <box marginTop={1}>
        <text fg={colors.muted}>Press any key to return...</text>
      </box>
    </box>
  );
}
