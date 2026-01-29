/**
 * SelectionView.tsx
 * Renders the interactive item selection interface with hierarchical navigation.
 * Displays packs, standalone items, and selection state indicators.
 */

import { TextAttributes } from "@opentui/core";
import { For, createMemo } from "solid-js";
import type { Accessor } from "solid-js";
import type { UIItem, RegistryItem, Pack, InstallMode } from "../types";

interface SelectionViewProps {
  items: Accessor<UIItem[]>;
  cursor: Accessor<number>;
  selectedItems: Accessor<Set<RegistryItem>>;
  isPackSelected: (pack: Pack) => boolean;
  installMode: Accessor<InstallMode>;
  title: string;
}

export function SelectionView(props: SelectionViewProps) {
  return (
    <>
      <box flexDirection="row" marginBottom={1}>
        <text attributes={TextAttributes.BOLD}>{props.title}</text>
        <text attributes={TextAttributes.DIM}> | </text>
        <text attributes={TextAttributes.BOLD}>{props.selectedItems().size}</text>
        <text attributes={TextAttributes.DIM}> selected | </text>
        <text attributes={TextAttributes.BOLD}>
          {props.installMode() === "global" ? "Global" : "Local"}
        </text>
        <text attributes={TextAttributes.DIM}>
          {props.installMode() === "global"
            ? " (~/.config/opencode/)"
            : " (.opencode/)"}
        </text>
      </box>
      <box marginBottom={1}>
        <text attributes={TextAttributes.DIM}>
          j/k: Nav | h/l: Drill | Space: Toggle | Tab: Mode | Enter: Sync
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
                  ? "v "
                  : "> "
                : "";

            const checkbox =
              item.type === "item" || item.type === "pack"
                ? isSelected()
                  ? "[x] "
                  : "[ ] "
                : "";

            const itemCount =
              item.type === "pack" ? ` (${item.pack!.items.length})` : "";

            const typeLabel =
              item.type === "item" && item.item && item.parent?.startsWith("pack:")
                ? `(${item.item.type}) `
                : "";

            const description = item.description ?? "";

            const suffix = typeLabel || description ? ` ${typeLabel}${description}` : "";

            const nameText = `${indent}${chevron}${checkbox}${item.title}`;

            return (
              <box height={1} flexDirection="row">
                <text
                  attributes={
                    isCursor()
                      ? TextAttributes.INVERSE | TextAttributes.BOLD
                      : TextAttributes.BOLD
                  }
                >
                  {nameText}
                </text>
                <text attributes={isCursor() ? TextAttributes.INVERSE : undefined}>
                  {itemCount}
                </text>
                <text
                  attributes={
                    isCursor()
                      ? TextAttributes.INVERSE | TextAttributes.ITALIC
                      : TextAttributes.ITALIC
                  }
                >
                  {suffix}
                </text>
              </box>
            );
          }}
        </For>
      </box>
    </>
  );
}
