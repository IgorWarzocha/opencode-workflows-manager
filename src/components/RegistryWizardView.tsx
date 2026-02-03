//Renders the multi-step registry creation wizard UI.
//Displays repository scanning results, metadata prompts, and post-generation actions.

import { TextAttributes } from "@opentui/core";
import { For, createMemo } from "solid-js";
import type { WizardNode } from "../registry-wizard/types";

const colors = {
  primary: "#F59E0B",
  text: "#D1CCC7",
  muted: "#9C958B",
  info: "#06B6D4",
  success: "#10B981",
} as const;

interface WizardSummary {
  packs: number;
  standalone: number;
  items: number;
}

interface RegistryWizardViewProps {
  step: "roots" | "tree" | "repo" | "description" | "about" | "about-text" | "scanning" | "done" | "open-files" | "open-pr";
  nodes: WizardNode[];
  cursor: number;
  scrollOffset: number;
  expanded: Set<string>;
  selected: Set<string>;
  rootsSelectionState?: Map<string, { selected: boolean; partial: boolean }>;
  rootsInput: string;
  typeOverrides: Map<string, "agent" | "skill" | "command" | "doc" | "pack">;
  repoUrl: string;
  aboutInline: boolean | null;
  name: string;
  description: string;
  registryDescription: string;
  summary: WizardSummary | null;
  existingPaths: Set<string>;
}

export function RegistryWizardView(props: RegistryWizardViewProps) {
  return (
    <box flexDirection="column" flexGrow={1}>
      <box marginBottom={1} flexDirection="row">
        <text fg={colors.info}>Opencode</text>
        <text fg={colors.muted}> Workflows</text>
        <text fg={colors.primary}> Manager</text>
      </box>

      <box marginBottom={1}>
        <text fg={colors.muted}>Registry creation wizard</text>
      </box>

      <box marginBottom={1}>
        <text fg={colors.muted}>Recommended structure: /agents /commands /skills /docs</text>
      </box>

      {props.step === "roots" ? (
        <box flexDirection="column">
          <text fg={colors.text}>Select root folders. Space toggles. A selects all. Enter continues.</text>
          <box marginTop={1} flexDirection="column">
            <For each={props.nodes}>
              {(node, index) => {
                const isCursor = () => index() + props.scrollOffset === props.cursor;
                const state = createMemo(() => props.rootsSelectionState?.get(node.id));
                const checked = createMemo(() => state()?.selected ?? props.selected.has(node.id));
                const partial = createMemo(() => state()?.partial ?? false);
                const checkbox = createMemo(() => checked() ? "● " : partial() ? "◐ " : "○ ");
                const indent = "  ".repeat(node.depth);
                const chevron = node.type === "group"
                  ? node.childrenLoaded && node.children.length === 0
                    ? "■ "
                    : props.expanded.has(node.id)
                      ? "▼ "
                      : "▶ "
                  : "";
                const checkboxColor = createMemo(() => checked() || partial() ? colors.success : colors.muted);
                return (
                  <box height={1} flexDirection="row" backgroundColor={isCursor() ? "#4A4642" : undefined}>
                    <text fg={colors.muted}>{indent}</text>
                    <text fg={checkboxColor()}>{checkbox()}</text>
                    {chevron !== "" ? <text fg={colors.muted}>{chevron}</text> : null}
                    <text fg={colors.text}>{node.label}</text>
                  </box>
                );
              }}
            </For>
          </box>
        </box>
      ) : null}

      {props.step === "tree" ? (
        <box flexDirection="column">
          <text fg={colors.text}>Select what to include. Space toggles. A selects all. Tab cycles type. Enter continues.</text>
          <box marginTop={1} flexDirection="column">
            <For each={props.nodes}>
              {(node, index) => {
                const isCursor = () => index() + props.scrollOffset === props.cursor;
                const checked = createMemo(() => props.selected.has(node.id));
                const checkbox = createMemo(() => checked() ? "● " : "○ ");
                const indent = "  ".repeat(node.depth);
                const displayType = createMemo(() => {
                  const repoPath = node.item?.repoPath ?? node.id.replace(/^path:/, "");
                  return props.typeOverrides.get(repoPath) ?? node.item?.type;
                });
                const typeLabel = createMemo(() => displayType() ? ` ${displayType()}` : "");
                const isExisting = createMemo(() => {
                  const repoPath = node.item?.repoPath ?? node.id.replace(/^path:/, "");
                  return props.existingPaths.has(repoPath);
                });
                const chevron = node.type === "group" || node.type === "folder"
                  ? node.childrenLoaded && node.children.length === 0
                    ? "■ "
                    : props.expanded.has(node.id)
                      ? "▼ "
                      : "▶ "
                  : "";
                const isPack = () => displayType() === "pack";
                const labelColor = () => isPack() ? colors.info : colors.text;
                
                return (
                  <box height={1} flexDirection="row" backgroundColor={isCursor() ? "#4A4642" : undefined}>
                    <text fg={colors.muted}>{indent}</text>
                    <text fg={checked() ? colors.success : colors.muted}>{checkbox()}</text>
                    {chevron !== "" ? <text fg={colors.muted}>{chevron}</text> : null}
                    <text fg={labelColor()}>{node.label}</text>
                    {typeLabel() !== "" ? <text fg={colors.info}>{typeLabel()}</text> : null}
                    {isExisting() ? <text fg={colors.muted}> [Included]</text> : null}
                  </box>
                );
              }}
            </For>
          </box>
        </box>
      ) : null}

      {props.step === "repo" ? (
        <box flexDirection="column">
          <text fg={colors.text}>Paste your GitHub repo URL, then press Enter.</text>
          <box marginTop={1}>
            <text fg={colors.primary} attributes={TextAttributes.BOLD}>
              {props.repoUrl || "_"}
            </text>
          </box>
        </box>
      ) : null}

      {props.step === "description" ? (
        <box flexDirection="column">
          <text fg={colors.text}>Enter a short registry description, then press Enter.</text>
          <box marginTop={1}>
            <text fg={colors.primary} attributes={TextAttributes.BOLD}>
              {props.registryDescription || "_"}
            </text>
          </box>
        </box>
      ) : null}

      {props.step === "about" ? (
        <box flexDirection="column">
          <text fg={colors.text}>Add about text now? (y/n)</text>
          <box marginTop={1}>
            <text fg={colors.primary} attributes={TextAttributes.BOLD}>
              {props.aboutInline === null ? "_" : props.aboutInline ? "Yes" : "No"}
            </text>
          </box>
        </box>
      ) : null}

      {props.step === "about-text" ? (
        <box flexDirection="column">
          <text fg={colors.text}>Enter about text, then press Enter.</text>
          <box marginTop={1}>
            <text attributes={TextAttributes.BOLD} fg={colors.primary}>
              {props.description || "_"}
            </text>
          </box>
        </box>
      ) : null}

      {props.step === "scanning" ? (
        <box flexDirection="column">
          <text fg={colors.info}>Scanning repository and generating files...</text>
        </box>
      ) : null}

      {props.step === "done" ? (
        <box flexDirection="column">
          <text fg={colors.success} attributes={TextAttributes.BOLD}>
            Registry files generated.
          </text>
          {props.summary ? (
            <box marginTop={1} flexDirection="column">
              <text fg={colors.text}>Packs: {props.summary.packs}</text>
              <text fg={colors.text}>Standalone: {props.summary.standalone}</text>
              <text fg={colors.text}>Items: {props.summary.items}</text>
            </box>
          ) : null}
          <box marginTop={1}>
            <text fg={colors.muted}>
              Upload registry.json and registry.toml to your repo, then open a PR to include it.
            </text>
          </box>
          <box marginTop={1}>
            <text fg={colors.muted}>
              Edit registry.toml and registry.json to refine descriptions for conciseness and display.
            </text>
          </box>
          <box marginTop={1}>
            <text fg={colors.muted}>
              Registry list entry: {props.repoUrl} — {props.registryDescription || "(add a short description)"}
            </text>
          </box>
        </box>
      ) : null}

      {props.step === "open-files" ? (
        <box flexDirection="column">
          <text fg={colors.muted}>Open generated files in your editor? (y/n)</text>
        </box>
      ) : null}

      {props.step === "open-pr" ? (
        <box flexDirection="column">
          <text fg={colors.muted}>
            Submit a PR here: https://github.com/IgorWarzocha/opencode-workflows-manager/pulls
          </text>
          <box marginTop={1}>
            <text fg={colors.muted}>Open the PR page in your browser? (y/n)</text>
          </box>
        </box>
      ) : null}
    </box>
  );
}
