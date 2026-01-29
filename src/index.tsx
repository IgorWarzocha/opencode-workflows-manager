/**
 * index.tsx
 * Entry point for the Opencode Workflow Selector TUI application.
 * Orchestrates keyboard navigation, selection state, and sync operations.
 */

import { render, useKeyboard } from "@opentui/solid";
import { TextAttributes } from "@opentui/core";
import { createSignal, createMemo, onMount, Show } from "solid-js";

import type { Registry, RegistryItem, Pack, UIItem, AppStatus, Changes, InstallMode } from "./types";
import { getAllItems, findInstalledItems } from "./registry";
import { performSync } from "./sync";
import { loadRegistrySources, loadRegistryFromSource } from "./registries";
import type { RegistrySource } from "./registries";
import type { AppConfig } from "./registry-config";
import { SelectionView, ConfirmView, SyncView, AboutView, RegistrySelectView, AppAboutView } from "./components";

function buildVisibleItems(
  registry: Registry,
  expandedCategory: string | null,
  expandedPack: string | null
): UIItem[] {
  const items: UIItem[] = [];

  const packsExpanded = expandedCategory === "packs";
  items.push({
    type: "category",
    id: "packs",
    title: "Packs",
    expanded: packsExpanded,
    description: "Collection of specialized agent toolkits",
  });

  if (packsExpanded) {
    for (const pack of registry.packs) {
      const packExpanded = expandedPack === pack.name;
      items.push({
        type: "pack",
        id: `pack:${pack.name}`,
        title: pack.name,
        expanded: packExpanded,
        parent: "packs",
        pack,
        description: pack.description,
      });
      if (packExpanded) {
        for (const item of pack.items) {
          items.push({
            type: "item",
            id: `item:${pack.name}:${item.name}`,
            title: item.name,
            item,
            parent: `pack:${pack.name}`,
            description: item.description,
          });
        }
      }
    }
  }

  const standaloneCategories = [
    { id: "agents", title: "Agents", filter: "agent", desc: "Global orchestration and speed agents" },
    { id: "commands", title: "Commands", filter: "command", desc: "Repository maintenance utility commands" },
  ] as const;

  for (const cat of standaloneCategories) {
    const isExpanded = expandedCategory === cat.id;
    items.push({
      type: "category",
      id: cat.id,
      title: cat.title,
      expanded: isExpanded,
      description: cat.desc,
    });
    if (isExpanded) {
      const filtered = registry.standalone.filter((s) => s.type === cat.filter);
      for (const item of filtered) {
        items.push({
          type: "item",
          id: `${cat.id}:${item.name}`,
          title: item.name,
          item,
          parent: cat.id,
          description: item.description,
        });
      }
    }
  }

  return items;
}

const App = () => {
  const [registry, setRegistry] = createSignal<Registry | null>(null);
  const [appConfig, setAppConfig] = createSignal<AppConfig | null>(null);
  const [registrySources, setRegistrySources] = createSignal<RegistrySource[]>([]);
  const [registryCursor, setRegistryCursor] = createSignal(0);
  const [cursor, setCursor] = createSignal(0);
  const [expandedCategory, setExpandedCategory] = createSignal<string | null>("packs");
  const [expandedPack, setExpandedPack] = createSignal<string | null>(null);
  const [selectedItems, setSelectedItems] = createSignal<Set<RegistryItem>>(new Set());
  const [initialSelection, setInitialSelection] = createSignal<Set<RegistryItem>>(new Set());
  const [status, setStatus] = createSignal<AppStatus>("selecting-registry");
  const [isAboutOpen, setIsAboutOpen] = createSignal(false);
  const [isAppAboutOpen, setIsAppAboutOpen] = createSignal(false);
  const [syncLogs, setSyncLogs] = createSignal<string[]>([]);
  // TODO: Tighten up install mode - add proper mode persistence and path validation
  // This comment MUST stay until install paths are properly abstracted
  const [installMode, setInstallMode] = createSignal<InstallMode>("global");

  const resetToRegistryMenu = () => {
    setIsAboutOpen(false);
    setIsAppAboutOpen(false);
    setRegistry(null);
    setAppConfig(null);
    setCursor(0);
    setExpandedCategory("packs");
    setExpandedPack(null);
    setSelectedItems(new Set<RegistryItem>());
    setInitialSelection(new Set<RegistryItem>());
    setSyncLogs([]);
    setStatus("selecting-registry");
  };

  onMount(async () => {
    const sources = await loadRegistrySources();
    setRegistrySources(sources);
    if (sources.length === 0) return;
  });

  const visibleItems = createMemo(() => {
    const reg = registry();
    if (!reg) return [];
    return buildVisibleItems(reg, expandedCategory(), expandedPack());
  });

  const isPackSelected = (pack: Pack) => pack.items.every((i) => selectedItems().has(i));

  const togglePack = (pack: Pack) => {
    const next = new Set(selectedItems());
    if (isPackSelected(pack)) {
      pack.items.forEach((i) => next.delete(i));
    } else {
      pack.items.forEach((i) => next.add(i));
    }
    setSelectedItems(next);
  };

  const toggleItem = (item: RegistryItem) => {
    const next = new Set(selectedItems());
    if (next.has(item)) {
      next.delete(item);
    } else {
      next.add(item);
    }
    setSelectedItems(next);
  };

  const changes = createMemo<Changes>(() => ({
    install: Array.from(selectedItems()).filter((i) => !initialSelection().has(i)),
    refresh: Array.from(selectedItems()).filter((i) => initialSelection().has(i)),
    remove: Array.from(initialSelection()).filter((i) => !selectedItems().has(i)),
  }));

  const executeSync = async () => {
    const config = appConfig();
    if (!config) return;
    await performSync(changes(), installMode(), config, (msg) => {
      setSyncLogs((prev) => [...prev, msg]);
    });
    setStatus("done");
  };

  useKeyboard((key: { name: string; ctrl?: boolean }) => {
    const input = key.name.toLowerCase();

    if (isAboutOpen()) {
      setIsAboutOpen(false);
      if (input === "a") return;
    }

    if (isAppAboutOpen()) {
      setIsAppAboutOpen(false);
      if (input === "a") return;
    }

    if (status() !== "selecting") {
      if (status() === "selecting-registry") {
        const sources = registrySources();
        if (input === "a") {
          setIsAppAboutOpen(true);
          return;
        }
        if (input === "up" || input === "k") {
          setRegistryCursor((prev) => Math.max(0, prev - 1));
          return;
        }
        if (input === "down" || input === "j") {
          setRegistryCursor((prev) => Math.min(sources.length - 1, prev + 1));
          return;
        }
        if (input === "return") {
          const target = sources[registryCursor()];
          if (!target) return;
          loadRegistryFromSource(target).then((loaded) => {
            if (!loaded) return;
            setAppConfig(loaded.config);
            setRegistry(loaded.registry);
            const allItems = getAllItems(loaded.registry);
            findInstalledItems(allItems, installMode(), loaded.config).then((installed) => {
              setInitialSelection(installed);
              setSelectedItems(new Set(installed));
            });
            setStatus("selecting");
          });
        }
        if (input === "escape") {
          resetToRegistryMenu();
          return;
        }
        if (key.ctrl && input === "c") {
          process.exit(0);
        }
        return;
      }
      if (input === "return") {
        if (status() === "confirming") {
          setStatus("syncing");
          executeSync();
        } else if (status() === "done") {
          process.exit(0);
        }
      }
      if (input === "escape") {
        resetToRegistryMenu();
        return;
      }
      if (key.ctrl && input === "c") {
        process.exit(0);
      }
      return;
    }

    if (input === "a") {
      setIsAboutOpen(true);
      return;
    }

    const items = visibleItems();
    const currentItem = items[cursor()];

    if (input === "up" || input === "k") {
      setCursor((prev) => Math.max(0, prev - 1));
    }

    if (input === "down" || input === "j") {
      setCursor((prev) => Math.min(items.length - 1, prev + 1));
    }

    if ((input === "right" || input === "l") && currentItem) {
      const targetId = currentItem.id;
      if (currentItem.type === "category") {
        setExpandedCategory(currentItem.id);
        setExpandedPack(null);
      } else if (currentItem.type === "pack" && currentItem.pack) {
        setExpandedPack(currentItem.pack.name);
      }
      const newItems = visibleItems();
      const newIdx = newItems.findIndex((i) => i.id === targetId);
      if (newIdx !== -1) setCursor(newIdx);
    }

    if ((input === "left" || input === "h") && currentItem) {
      const targetId = currentItem.id;
      if (currentItem.type === "category") {
        setExpandedCategory(null);
      } else if (currentItem.type === "pack") {
        if (currentItem.pack && expandedPack() === currentItem.pack.name) {
          setExpandedPack(null);
        } else {
          const newItems = visibleItems();
          const idx = newItems.findIndex((i) => i.id === "packs");
          if (idx !== -1) setCursor(idx);
          return;
        }
      } else if (currentItem.type === "item" && currentItem.parent) {
        const newItems = visibleItems();
        const idx = newItems.findIndex((i) => i.id === currentItem.parent);
        if (idx !== -1) setCursor(idx);
        return;
      }
      const newItems = visibleItems();
      const newIdx = newItems.findIndex((i) => i.id === targetId);
      if (newIdx !== -1) setCursor(newIdx);
    }

    if (input === "space" && currentItem) {
      if (currentItem.type === "item" && currentItem.item) {
        toggleItem(currentItem.item);
      } else if (currentItem.type === "pack" && currentItem.pack) {
        togglePack(currentItem.pack);
      }
    }

    if (input === "return") {
      setStatus("confirming");
    }

    if (input === "tab") {
      const newMode = installMode() === "global" ? "local" : "global";
      setInstallMode(newMode);
      const reg = registry();
      const config = appConfig();
      if (reg) {
        const allItems = getAllItems(reg);
        if (!config) return;
        findInstalledItems(allItems, newMode, config).then((installed) => {
          setInitialSelection(installed);
          setSelectedItems(new Set(installed));
        });
      }
    }

    if (input === "escape") {
      resetToRegistryMenu();
      return;
    }
    if (key.ctrl && input === "c") {
      process.exit(0);
    }
  });

  return (
    <box flexDirection="column" padding={1} flexGrow={1}>
      <Show when={status() === "selecting-registry" && !isAppAboutOpen()}>
        <RegistrySelectView sources={registrySources} cursor={registryCursor} />
      </Show>

      <Show when={status() === "selecting-registry" && isAppAboutOpen()}>
        <AppAboutView />
      </Show>

      <Show when={status() === "selecting" && !isAboutOpen() && appConfig()}>
        <SelectionView
          items={visibleItems}
          cursor={cursor}
          selectedItems={selectedItems}
          isPackSelected={isPackSelected}
          installMode={installMode}
          title={`${appConfig()!.ui.brand}'s ${appConfig()!.ui.product}`}
        />
      </Show>

      <Show when={status() === "confirming"}>
        <ConfirmView changes={changes} />
      </Show>

      <Show when={status() === "syncing" || status() === "done"}>
        <SyncView status={status} logs={syncLogs} />
      </Show>

      <Show when={isAboutOpen() && appConfig()}>
        <AboutView config={appConfig()!} />
      </Show>
    </box>
  );
};

render(App);
