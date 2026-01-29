/**
 * ConfirmView.tsx
 * Displays pending changes summary and sync warnings.
 * Shows items to be installed, updated, and removed before sync.
 */

import { TextAttributes } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/solid";
import { For, Show, createMemo } from "solid-js";
import type { Accessor } from "solid-js";
import type { Changes, RegistryItem } from "../types";

const colors = {
  primary: "#F59E0B",
  text: "#D1CCC7",
  muted: "#9C958B",
  info: "#06B6D4",
  success: "#10B981",
  warning: "#F97316",
  danger: "#EF4444",
} as const;

interface ConfirmViewProps {
  changes: Accessor<Changes>;
}

export function ConfirmView(props: ConfirmViewProps) {
  useTerminalDimensions();

  const columnLayout = createMemo(() => ({ colWidth: 20, gap: 1 }));

  const getPackName = (item: RegistryItem): string => {
    let parts: string[];
    try {
      const url = new URL(item.path);
      const pathParts = url.pathname.split("/").filter(Boolean);
      if (url.hostname === "raw.githubusercontent.com" && pathParts.length >= 3) {
        parts = pathParts.slice(3);
      } else if (url.hostname === "github.com" && pathParts.length >= 4) {
        const branchIndex = pathParts.indexOf("blob") !== -1 ? pathParts.indexOf("blob") + 1 : 2;
        parts = pathParts.slice(branchIndex + 1);
      } else {
        parts = pathParts;
      }
    } catch {
      parts = item.path.split("/").filter(Boolean);
    }

    const agentsIdx = parts.indexOf("agents");
    if (agentsIdx !== -1 && parts.length > agentsIdx + 1) {
      return parts[agentsIdx + 1] ?? "(root)";
    }
    if (parts.length >= 1) return parts[0] ?? "(root)";
    return "(root)";
  };

  const buildSectionRows = (items: RegistryItem[]) => {
    const packs = Array.from(new Set(items.map(getPackName))).filter((name) => name !== "(root)").sort();
    const agents = items.filter((item) => item.type === "agent").map((item) => item.name).sort();
    const skills = items.filter((item) => item.type === "skill").map((item) => item.name).sort();
    const commands = items.filter((item) => item.type === "command").map((item) => item.name).sort();

    const maxRows = Math.max(packs.length, agents.length, skills.length, commands.length);
    const rows = [] as Array<{ pack: string; agent: string; skill: string; command: string }>;
    for (let i = 0; i < maxRows; i += 1) {
      rows.push({
        pack: packs[i] ?? "",
        agent: agents[i] ?? "",
        skill: skills[i] ?? "",
        command: commands[i] ?? "",
      });
    }
    return rows;
  };

  const renderRow = (
    values: [string, string, string, string],
    options?: { header?: boolean }
  ) => {
    const { colWidth, gap } = columnLayout();
    const gapText = " ".repeat(gap);
    const [pack, agent, skill, command] = values;
    const fg = options?.header ? colors.info : colors.text;
    const attributes = options?.header ? TextAttributes.BOLD : undefined;
    const wrapMode = options?.header ? "none" : "word";
    return (
      <box height={1} flexDirection="row">
        <box width={colWidth}>
          <text fg={fg} attributes={attributes} wrapMode={wrapMode}>{pack}</text>
        </box>
        <text fg={colors.muted}>{gapText}</text>
        <box width={colWidth}>
          <text fg={fg} attributes={attributes} wrapMode={wrapMode}>{agent}</text>
        </box>
        <text fg={colors.muted}>{gapText}</text>
        <box width={colWidth}>
          <text fg={fg} attributes={attributes} wrapMode={wrapMode}>{skill}</text>
        </box>
        <text fg={colors.muted}>{gapText}</text>
        <box width={colWidth}>
          <text fg={fg} attributes={attributes} wrapMode={wrapMode}>{command}</text>
        </box>
      </box>
    );
  };

  return (
    <box flexDirection="column">
      <text attributes={TextAttributes.BOLD} fg={colors.primary}>
        Sync Summary
      </text>

      <Show when={props.changes().install.length + props.changes().refresh.length > 0}>
        <box marginTop={1} maxWidth={58}>
          <text fg={colors.info} wrapMode="word">
            {`You're about to fetch ${props.changes().install.length + props.changes().refresh.length} files from GitHub. Depending on how many you're trying to fetch, it might take a while. The system is designed to prevent rate limit scenarios.`}
          </text>
        </box>
      </Show>

      <box marginTop={1} maxWidth={58}>
        <text fg={colors.warning} wrapMode="word">
          Warning: If the registry changed or you renamed files, you might end up with breadcrumb files.
        </text>
      </box>
      <box marginTop={1} maxWidth={58}>
        <text fg={colors.danger} wrapMode="word">
          Warning: Any customized files will be overwritten with the registry version.
        </text>
      </box>

      <Show when={props.changes().install.length > 0}>
        <box marginTop={1}>
          <text fg={colors.success} attributes={TextAttributes.BOLD}>
            Install ({props.changes().install.length})
          </text>
        </box>
        <box marginTop={1}>
          {renderRow(["Packs", "Agents", "Skills", "Commands"], { header: true })}
        </box>
        <For each={buildSectionRows(props.changes().install)}>
          {(row) => renderRow([row.pack, row.agent, row.skill, row.command])}
        </For>
      </Show>

      <Show when={props.changes().refresh.length > 0}>
        <box marginTop={1}>
          <text fg={colors.info} attributes={TextAttributes.BOLD}>
            Update ({props.changes().refresh.length})
          </text>
        </box>
        <box marginTop={1}>
          {renderRow(["Packs", "Agents", "Skills", "Commands"], { header: true })}
        </box>
        <For each={buildSectionRows(props.changes().refresh)}>
          {(row) => renderRow([row.pack, row.agent, row.skill, row.command])}
        </For>
      </Show>

      <Show when={props.changes().remove.length > 0}>
        <box marginTop={1}>
          <text fg={colors.danger} attributes={TextAttributes.BOLD}>
            Remove ({props.changes().remove.length})
          </text>
        </box>
        <box marginTop={1}>
          {renderRow(["Packs", "Agents", "Skills", "Commands"], { header: true })}
        </box>
        <For each={buildSectionRows(props.changes().remove)}>
          {(row) => renderRow([row.pack, row.agent, row.skill, row.command])}
        </For>
      </Show>

      <Show
        when={
          props.changes().install.length === 0 &&
          props.changes().refresh.length === 0 &&
          props.changes().remove.length === 0
        }
      >
        <text fg={colors.muted}>No changes to apply.</text>
      </Show>

      <box marginTop={1}>
        <text attributes={TextAttributes.BOLD} fg={colors.primary}>
          Proceed with changes? (Enter to confirm, Esc to abort)
        </text>
      </box>
    </box>
  );
}
