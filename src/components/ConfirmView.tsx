/**
 * ConfirmView.tsx
 * Displays pending changes summary and sync warnings.
 * Shows items to be installed, updated, and removed before sync.
 */

import { TextAttributes } from "@opentui/core";
import { For, Show } from "solid-js";
import type { Accessor } from "solid-js";
import type { Changes } from "../types";

interface ConfirmViewProps {
  changes: Accessor<Changes>;
}

export function ConfirmView(props: ConfirmViewProps) {
  return (
    <box flexDirection="column">
      <text attributes={TextAttributes.BOLD}>Sync Summary:</text>

      <box marginTop={1}>
        <text>
          Warning: If the registry changed or you renamed files, you might end up with breadcrumb files.
        </text>
      </box>
      <box marginTop={1}>
        <text>
          Warning: Any customized files will be overwritten with the registry version.
        </text>
      </box>

      <Show when={props.changes().install.length > 0}>
        <text> Install ({props.changes().install.length}):</text>
        <For each={props.changes().install}>
          {(item) => <text>   + {item.name}</text>}
        </For>
      </Show>

      <Show when={props.changes().refresh.length > 0}>
        <text> Update ({props.changes().refresh.length}):</text>
        <For each={props.changes().refresh}>
          {(item) => <text>   ~ {item.name}</text>}
        </For>
      </Show>

      <Show when={props.changes().remove.length > 0}>
        <text> Remove ({props.changes().remove.length}):</text>
        <For each={props.changes().remove}>
          {(item) => <text>   - {item.name}</text>}
        </For>
      </Show>

      <Show
        when={
          props.changes().install.length === 0 &&
          props.changes().refresh.length === 0 &&
          props.changes().remove.length === 0
        }
      >
        <text>No changes to apply.</text>
      </Show>

      <box marginTop={1}>
        <text attributes={TextAttributes.BOLD}>
          Proceed with changes? (Enter to confirm, Esc to abort)
        </text>
      </box>
    </box>
  );
}
