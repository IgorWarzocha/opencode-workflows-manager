/**
 * AboutView.tsx
 * Displays information about Howaboua's Opencode Workflows.
 */

import { TextAttributes } from "@opentui/core";
import type { AppConfig } from "../registry-config";

const colors = {
  primary: "#F59E0B",
  text: "#D1CCC7",
  muted: "#9C958B",
  info: "#06B6D4",
  success: "#10B981",
} as const;

interface AboutViewProps {
  config: AppConfig;
}

export function AboutView(props: AboutViewProps) {
  const about = () => props.config.ui.about;
  
  return (
    <box flexDirection="column" flexGrow={1} maxWidth={58}>
      <box marginBottom={2} flexDirection="row">
        <text fg={colors.info}>Howaboua</text>
        <text fg={colors.muted}>'s </text>
        <text fg={colors.primary}>Opencode Workflows</text>
      </box>

      {about().lines.map((line) => (
        <box marginBottom={1}>
          <text fg={colors.text}>{line}</text>
        </box>
      ))}

      <box marginBottom={1}>
        <text fg={colors.primary} attributes={TextAttributes.BOLD}>
          {about().emphasis}
        </text>
      </box>

      <box marginBottom={1}>
        <text fg={colors.muted}>
          Oh, ps. This CLI is configurable. Steal it.
        </text>
      </box>

      <box marginBottom={1}>
        <text fg={colors.info}>
          {about().link}
        </text>
      </box>
      <box marginBottom={1}>
        <text fg={colors.muted}>
          {about().linkNote}
        </text>
      </box>

      <box marginTop={1}>
        <text fg={colors.muted}>
          {about().footer}
        </text>
      </box>
    </box>
  );
}
