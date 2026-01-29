//Orchestrates core application state and business logic for registry management.
//Handles loading registries, tracking item selection, and executing sync operations.

import { createSignal, createMemo, createEffect } from "solid-js";
import type { Registry, RegistryItem, Pack, AppStatus, Changes, InstallMode } from "../types";
import { getAllItems, findInstalledItems } from "../registry";
import { performSync } from "../sync";
import { loadRegistrySources, loadRegistryFromSource, loadLocalRegistry } from "../registries";
import type { RegistrySource } from "../registries";
import type { AppConfig } from "../registry-config";
import { buildVisibleItems } from "../utils/ui-builder";

export const useAppLogic = () => {
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
  const [installMode, setInstallMode] = createSignal<InstallMode>("global");

  type CursorFocus = {
    id: string;
    parent: string | null;
  };

  const [cursorFocus, setCursorFocus] = createSignal<CursorFocus | null>(null);

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

  const returnToSelection = () => {
    setIsAboutOpen(false);
    setIsAppAboutOpen(false);
    setSyncLogs([]);
    setStatus("selecting");
  };

  const refreshSelectionForMode = async (mode: InstallMode) => {
    const reg = registry();
    const config = appConfig();
    if (!reg || !config) return;
    const allItems = getAllItems(reg);
    const installed = await findInstalledItems(allItems, mode, config);
    setInitialSelection(installed);
    setSelectedItems(new Set(installed));
  };

  const loadInitialData = async (isLocal: boolean) => {
    if (isLocal) {
      const local = await loadLocalRegistry();
      if (!local) return;
      setAppConfig(local.config);
      setRegistry(local.registry);
      setInstallMode("local");
      const allItems = getAllItems(local.registry);
      const installed = await findInstalledItems(allItems, "local", local.config);
      setInitialSelection(installed);
      setSelectedItems(new Set(installed));
      setStatus("selecting");
      return;
    }

    const sources = await loadRegistrySources();
    setRegistrySources(sources);
  };

  const visibleItems = createMemo(() => {
    const reg = registry();
    if (!reg) return [];
    return buildVisibleItems(reg, expandedCategory(), expandedPack(), installMode());
  });

  createEffect(() => {
    const items = visibleItems();
    const current = items[cursor()];
    if (current) {
      setCursorFocus({ id: current.id, parent: current.parent ?? null });
    }
  });

  createEffect(() => {
    const items = visibleItems();
    if (items.length === 0) {
      if (cursor() !== 0) setCursor(0);
      return;
    }

    const focus = cursorFocus();
    if (!focus) {
      if (cursor() >= items.length) setCursor(items.length - 1);
      return;
    }

    const exactIdx = items.findIndex((item) => item.id === focus.id);
    if (exactIdx !== -1) {
      if (exactIdx !== cursor()) setCursor(exactIdx);
      return;
    }

    if (focus.parent) {
      const parentIdx = items.findIndex((item) => item.id === focus.parent);
      if (parentIdx !== -1) {
        setCursor(parentIdx);
        return;
      }
    }

    if (cursor() >= items.length) setCursor(items.length - 1);
  });

  const getPackSelectableItems = (pack: Pack) =>
    installMode() === "global"
      ? pack.items.filter((item) => item.type !== "doc")
      : pack.items;

  const isPackSelected = (pack: Pack) =>
    getPackSelectableItems(pack).every((i) => selectedItems().has(i));

  const togglePack = (pack: Pack) => {
    const next = new Set(selectedItems());
    const selectable = getPackSelectableItems(pack);
    if (isPackSelected(pack)) {
      selectable.forEach((i) => next.delete(i));
    } else {
      selectable.forEach((i) => next.add(i));
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

  const handleRegistrySelection = async (sourceIndex: number) => {
    const sources = registrySources();
    const target = sources[sourceIndex - 1];
    if (!target) return;
    
    const loaded = await loadRegistryFromSource(target);
    if (!loaded) return;
    
    setAppConfig(loaded.config);
    setRegistry(loaded.registry);
    const allItems = getAllItems(loaded.registry);
    const installed = await findInstalledItems(allItems, installMode(), loaded.config);
    setInitialSelection(installed);
    setSelectedItems(new Set(installed));
    setStatus("selecting");
  };

  return {
    registry, setRegistry,
    appConfig, setAppConfig,
    registrySources, setRegistrySources,
    registryCursor, setRegistryCursor,
    cursor, setCursor,
    expandedCategory, setExpandedCategory,
    expandedPack, setExpandedPack,
    selectedItems, setSelectedItems,
    initialSelection,
    status, setStatus,
    isAboutOpen, setIsAboutOpen,
    isAppAboutOpen, setIsAppAboutOpen,
    syncLogs, setSyncLogs,
    installMode, setInstallMode,
    visibleItems,
    isPackSelected,
    togglePack,
    toggleItem,
    changes,
    executeSync,
    resetToRegistryMenu,
    returnToSelection,
    loadInitialData,
    handleRegistrySelection,
    refreshSelectionForMode
  };
};
