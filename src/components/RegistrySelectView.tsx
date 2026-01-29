/**
 * RegistrySelectView.tsx
 * Renders registry selection list.
 */

import { TextAttributes } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/solid";
import { For, createMemo } from "solid-js";
import type { Accessor } from "solid-js";
import type { RegistrySource } from "../registries";

const colors = {
  primary: "#F59E0B",
  text: "#D1CCC7",
  muted: "#9C958B",
  info: "#06B6D4",
  cursorBg: "#4A4642",
} as const;

interface RegistrySelectViewProps {
  sources: Accessor<RegistrySource[]>;
  cursor: Accessor<number>;
}

export function RegistrySelectView(props: RegistrySelectViewProps) {
  const terminalDimensions = useTerminalDimensions();
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
        <text fg={colors.info}>Opencode</text>
        <text fg={colors.muted}> Workflows Manager</text>
      </box>
      <box marginBottom={1}>
        <text fg={colors.muted}>↑↓ navigate | enter select | a about | esc exit</text>
      </box>
      <box flexDirection="column" flexGrow={1}>
        <For each={props.sources()}>
          {(source, index) => {
            const isCursor = createMemo(() => index() === props.cursor());
            const description = createMemo(() => {
              const reservedWidth = source.name.length + 1;
              const availableWidth = Math.max(0, contentWidth() - reservedWidth);
              if (availableWidth <= 1) return "";
              const trimmed = clampText(source.description, availableWidth - 1);
              return trimmed ? ` ${trimmed}` : "";
            });

            return (
              <box
                height={1}
                flexDirection="row"
                backgroundColor={isCursor() ? colors.cursorBg : undefined}
              >
                <text attributes={TextAttributes.BOLD} fg={colors.primary}>
                  {source.name}
                </text>
                {description() !== "" ? (
                  <text fg={colors.muted}>{description()}</text>
                ) : null}
              </box>
            );
          }}
        </For>
      </box>
    </>
  );
}
