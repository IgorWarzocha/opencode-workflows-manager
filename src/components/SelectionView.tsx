/**
 * SelectionView.tsx
 * Renders the interactive item selection interface with hierarchical navigation.
 * Displays packs, standalone items, and selection state indicators.
 */

import { TextAttributes } from "@opentui/core";
import { For, createMemo } from "solid-js";
import type { Accessor } from "solid-js";
import type { UIItem, RegistryItem, Pack, InstallMode } from "../types";

// Claude theme dark palette
const colors = {
  primary: "#F59E0B",      // Amber accent
  text: "#D1CCC7",         // Light tan
  muted: "#9C958B",        // Muted tan
  success: "#10B981",      // Green
  info: "#06B6D4",         // Cyan
  cursorBg: "#4A4642",     // Subtle highlight bg
} as const;

interface SelectionViewProps {
  items: Accessor<UIItem[]>;
  cursor: Accessor<number>;
  selectedItems: Accessor<Set<RegistryItem>>;
  isPackSelected: (pack: Pack) => boolean;
  installMode: Accessor<InstallMode>;
  title: string;
}

export function SelectionView(props: SelectionViewProps) {
  const modePath = () =>
    props.installMode() === "global" ? "~/.config/opencode/" : ".opencode/";

  return (
    <>
      <box marginBottom={1} flexDirection="row">
        <text fg={colors.info}>Howaboua</text>
        <text fg={colors.muted}>'s </text>
        <text fg={colors.primary}>Opencode Workflows</text>
        <text fg={colors.muted}> · </text>
        <text fg={colors.info}>{props.selectedItems().size}</text>
        <text fg={colors.muted}> selected · </text>
        <text fg={colors.info}>{props.installMode() === "global" ? "Global" : "Local"}</text>
        <text fg={colors.muted}> {modePath()}</text>
      </box>
      <box marginBottom={1}>
        <text fg={colors.muted}>
          ↑↓ navigate · ←→ expand · space select · tab mode · enter sync
        </text>
      </box>

      <box flexDirection="column" flexGrow={1}>
        <For each={props.items()}>
          {(item, index) => {
            const isCursor = createMemo(() => index() === props.cursor());

            const isSelected = createMemo(() =>
              item.type === "item"
                ? props.selectedItems().has(item.item!)
                : item.type === "pack"
                  ? props.isPackSelected(item.pack!)
                  : false
            );

            const indent =
              item.type === "category"
                ? ""
                : item.type === "pack"
                  ? "  "
                  : item.parent === "agents" || item.parent === "commands"
                    ? "  "
                    : "    ";

            const chevron =
              item.type === "category" || item.type === "pack"
                ? item.expanded
                  ? "▼ "
                  : "▶ "
                : "";

            const checkbox =
              item.type === "item" || item.type === "pack"
                ? isSelected()
                  ? "● "
                  : "○ "
                : "";

            const itemCount =
              item.type === "pack" ? ` (${item.pack!.items.length})` : "";

            const typeLabel =
              item.type === "item" && item.item && item.parent?.startsWith("pack:")
                ? ` ${item.item.type}`
                : "";

            const description = item.description ? ` ${item.description}` : "";

            // Prefix: indent + chevron
            const prefix = `${indent}${chevron}`;

            // Determine checkbox color
            const checkboxColor = isSelected() ? colors.success : colors.muted;

            return (
              <box
                height={1}
                flexDirection="row"
                backgroundColor={isCursor() ? colors.cursorBg : undefined}
              >
                <text fg={colors.muted}>
                  {prefix}
                </text>
                <text fg={checkboxColor}>
                  {checkbox}
                </text>
                <text
                  attributes={TextAttributes.BOLD}
                  fg={item.type === "category" ? colors.primary : colors.text}
                >
                  {item.title}
                </text>
                <text fg={colors.info}>
                  {itemCount}
                </text>
                <text fg={colors.info}>
                  {typeLabel}
                </text>
                <text fg={colors.muted}>
                  {description}
                </text>
              </box>
            );
          }}
        </For>
      </box>
    </>
  );
}
