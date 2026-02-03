/**
 * SelectionView.tsx
 * Renders the interactive item selection interface with hierarchical navigation.
 * Displays packs, standalone items, and selection state indicators.
 */

import { TextAttributes } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/solid";
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
  const terminalDimensions = useTerminalDimensions();
  const modePath = () =>
    props.installMode() === "global" ? "~/.config/opencode/" : ".opencode/";

  const contentWidth = createMemo(() => Math.max(0, terminalDimensions().width - 2));

  const clampText = (value: string, maxLength: number) => {
    if (maxLength <= 0) return "";
    if (value.length <= maxLength) return value;
    if (maxLength <= 3) return value.slice(0, maxLength);
    return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
  };

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
          up/down navigate | left/right expand | space select | tab mode | enter sync | a about | esc back
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

            // Check if pack is partially selected (some but not all items)
            const isPartiallySelected = createMemo(() => {
              if (item.type !== "pack" || !item.pack) return false;
              const selected = props.selectedItems();
              const packItems = item.pack.items;
              const selectedCount = packItems.filter(i => selected.has(i)).length;
              return selectedCount > 0 && selectedCount < packItems.length;
            });

            const indent = "  ".repeat(item.depth ?? 0);

            const chevron =
              item.type === "category" || item.type === "pack" || item.type === "folder"
                ? item.expanded
                  ? "▼ "
                  : "▶ "
                : "";

            // Checkbox: ● full, ◐ partial, ○ empty (reactive memo)
            const checkbox = createMemo(() =>
              item.type === "item" || item.type === "pack"
                ? isSelected()
                  ? "● "
                  : isPartiallySelected()
                    ? "◐ "
                    : "○ "
                : ""
            );

            const itemCount =
              item.type === "pack"
                ? ` (${props.installMode() === "global"
                  ? item.pack!.items.filter((i) => i.type !== "doc").length
                  : item.pack!.items.length})`
                : "";

            const typeLabel =
              item.type === "item" && item.item && item.parent?.startsWith("pack:")
                ? ` ${item.item.type}`
                : "";

            // Prefix: indent + chevron
            const prefix = `${indent}${chevron}`;

            const description = createMemo(() => {
              if (!item.description) return "";
              const reservedWidth =
                prefix.length +
                checkbox().length +
                item.title.length +
                itemCount.length +
                typeLabel.length;
              const availableWidth = Math.max(0, contentWidth() - reservedWidth);
              if (availableWidth <= 1) return "";
              const trimmed = clampText(item.description, availableWidth - 1);
              return trimmed ? ` ${trimmed}` : "";
            });

            // Determine checkbox color: green for selected or partial, muted for empty (reactive memo)
            const checkboxColor = createMemo(() =>
              isSelected() || isPartiallySelected() 
                ? colors.success 
                : colors.muted
            );

            return (
              <box
                height={1}
                flexDirection="row"
                backgroundColor={isCursor() ? colors.cursorBg : undefined}
              >
                <text fg={colors.muted}>
                  {prefix}
                </text>
                {checkbox() !== "" ? (
                  <text fg={checkboxColor()}>
                    {checkbox()}
                  </text>
                ) : null}
                <text
                  attributes={TextAttributes.BOLD}
                  fg={item.type === "category" ? colors.primary : colors.text}
                >
                  {item.title}
                </text>
                {itemCount !== "" ? (
                  <text fg={colors.info}>
                    {itemCount}
                  </text>
                ) : null}
                {typeLabel !== "" ? (
                  <text fg={colors.info}>
                    {typeLabel}
                  </text>
                ) : null}
                {description() !== "" ? (
                  <text fg={colors.muted}>
                    {description()}
                  </text>
                ) : null}
              </box>
            );
          }}
        </For>
      </box>
    </>
  );
}
