/**
 * AboutView.tsx
 * Displays information about Howaboua's Opencode Workflows.
 */

import { TextAttributes } from "@opentui/core";

const colors = {
  primary: "#F59E0B",
  text: "#D1CCC7",
  muted: "#9C958B",
  info: "#06B6D4",
  success: "#10B981",
} as const;

export function AboutView() {
  const linkUrl = "https://github.com/IgorWarzocha/opencode-workflows-manager";
  
  return (
    <box flexDirection="column" flexGrow={1} maxWidth={58}>
      <box marginBottom={2} flexDirection="row">
        <text fg={colors.info}>Howaboua</text>
        <text fg={colors.muted}>'s </text>
        <text fg={colors.primary}>Opencode Workflows</text>
      </box>

      <box marginBottom={1}>
        <text fg={colors.text}>
          We've all seen massive repositories full of skills and agents that nobody ever uses... But I bet you haven't seen any like these. I treat prompts like code. RFC 2119 keywords everywhere along with XML tags make for much more controlled experience with unwieldy models.
        </text>
      </box>

      <box marginBottom={1}>
        <text fg={colors.text}>
          I actually update these because I use them every day. For 10 hours a day. I'm an automation freak. Coding is a byproduct. Something fails more than once? It will get updated.
        </text>
      </box>

      <box marginBottom={1}>
        <text fg={colors.text}>
          It's not the fish, it's the fishing rod <span style={{ fg: colors.muted }}>(I swear I wrote it by hand)</span>. These packs enable you to one-shot a plugin, or... create a repo like this for yourself.
        </text>
      </box>

      <box marginBottom={1}>
        <text fg={colors.primary} attributes={TextAttributes.BOLD}>
          Markdown Is All You Need™
        </text>
      </box>

      <box marginBottom={1}>
        <text fg={colors.muted}>
          Oh, ps. This CLI is configurable. Steal it.
        </text>
      </box>

      <box marginBottom={1}>
        <text fg={colors.info}>
          {linkUrl}
        </text>
      </box>
      <box marginBottom={1}>
        <text fg={colors.muted}>
          I couldn't get the link to be clickable, lol. Sorry.
        </text>
      </box>

      <box marginTop={1}>
        <text fg={colors.muted}>
          Press any key to return...
        </text>
      </box>
    </box>
  );
}
