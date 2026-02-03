//Manages state and logic for the Registry Creation Wizard.
//Handles directory scanning, tree navigation, and metadata collection for new registries.

import { createSignal, createMemo } from "solid-js";
import path from "path";
import type { WizardNode } from "../registry-wizard/types";
import type { RegistryItem, ItemType } from "../types";
import { scanWizardTree, flattenWizardTree, buildRegistryFromSelection, scanRootTree } from "../registry-wizard/scan";
import { writeRegistryFiles } from "../registry-wizard/write";
import { listDirectories, shouldSkipDir } from "../registry-wizard/fs-utils";

export type WizardStep = "roots" | "tree" | "repo" | "description" | "about" | "about-text" | "scanning" | "done" | "open-files" | "open-pr";

export const useRegistryWizard = (rows: number, onDone: () => void) => {
  const [step, setStep] = createSignal<WizardStep>("roots");
  const [nodes, setNodes] = createSignal<WizardNode[]>([]);
  const [flatNodes, setFlatNodes] = createSignal<WizardNode[]>([]);
  const [cursor, setCursor] = createSignal(0);
  const [scroll, setScroll] = createSignal(0);
  const [expanded, setExpanded] = createSignal<Set<string>>(new Set());
  const [selected, setSelected] = createSignal<Set<string>>(new Set());
  const [repoUrl, setRepoUrl] = createSignal("");
  const [aboutInline, setAboutInline] = createSignal<boolean | null>(null);
  const [aboutText, setAboutText] = createSignal("");
  const [registryDescription, setRegistryDescription] = createSignal("");
  const [typeOverrides, setTypeOverrides] = createSignal<Map<string, ItemType | "pack">>(new Map());
  
  const [roots, setRoots] = createSignal<WizardNode[]>([]);
  const [rootsSelected, setRootsSelected] = createSignal<Set<string>>(new Set());
  const [rootsCursor, setRootsCursor] = createSignal(0);
  const [rootsScroll, setRootsScroll] = createSignal(0);
  const [rootsExpanded, setRootsExpanded] = createSignal<Set<string>>(new Set());
  const rootsFlat = createMemo(() => flattenWizardTree(roots(), rootsExpanded()));
  const rootsSelectionState = createMemo(() => {
    type State = { selected: boolean; partial: boolean };
    const map = new Map<string, State>();

    const walk = (node: WizardNode): State => {
      const explicitSelected = rootsSelected().has(node.id);
      const hasChildren = node.type === "group" && node.children.length > 0;
      if (!hasChildren) {
        const state = { selected: explicitSelected, partial: false } satisfies State;
        map.set(node.id, state);
        return state;
      }

      let anySelected = false;
      let allSelected = true;
      for (const child of node.children) {
        const childState = walk(child);
        if (childState.selected || childState.partial) anySelected = true;
        if (!childState.selected || childState.partial) allSelected = false;
      }

      const selected = explicitSelected || allSelected;
      const partial = !selected && anySelected;
      const state = { selected, partial } satisfies State;
      map.set(node.id, state);
      return state;
    };

    roots().forEach(walk);
    return map;
  });
  
  const [summary, setSummary] = createSignal<{ packs: number; standalone: number; items: number } | null>(null);

  const adjustScroll = (nextCursor: number, currentScroll: number, setScrollFn: (s: number) => void, listLength: number) => {
    let nextScroll = currentScroll;
    if (nextCursor < currentScroll) {
      nextScroll = nextCursor;
    } else if (nextCursor >= currentScroll + rows) {
      nextScroll = nextCursor - rows + 1;
    }
    
    const maxScroll = Math.max(0, listLength - rows);
    nextScroll = Math.max(0, Math.min(nextScroll, maxScroll));
    
    if (nextScroll !== currentScroll) {
      setScrollFn(nextScroll);
    }
  };

  const startWizard = async () => {
    const rootsTree = await scanRootTree(process.cwd());
    setNodes([]);
    setFlatNodes([]);
    setSelected(new Set<string>());
    setRoots([]);
    setRootsSelected(new Set<string>());
    setRootsCursor(0);
    setRootsScroll(0);
    setRootsExpanded(new Set<string>());
    setCursor(0);
    setScroll(0);
    setRepoUrl("");
    setRegistryDescription("");
    setAboutInline(null);
    setAboutText("");
    setTypeOverrides(new Map());

    const rootNodes = rootsTree.length > 0
      ? rootsTree
      : ["agents", "commands", "skills", "docs"].map((dir) => ({
          id: `root:${dir}`,
          label: dir,
          type: "group",
          depth: 0,
          children: [],
        } as WizardNode));
    
    setRoots(rootNodes);
    const expandedRoots = new Set<string>();
    setRootsExpanded(expandedRoots);
    setRootsSelected(new Set<string>());
    setSummary(null);
    setStep("roots");
  };

  const updateRootChildren = (nodes: WizardNode[], targetId: string, children: WizardNode[]): WizardNode[] => {
    return nodes.map((node) => {
      if (node.id === targetId) {
        return { ...node, children, childrenLoaded: true };
      }
      if (node.children.length === 0) return node;
      const nextChildren = updateRootChildren(node.children, targetId, children);
      if (nextChildren === node.children) return node;
      return { ...node, children: nextChildren };
    });
  };

  const loadRootChildren = async (node: WizardNode): Promise<WizardNode[]> => {
    if (node.type !== "group") return roots();
    if (node.childrenLoaded) return roots();
    const relativePath = node.id.replace(/^root:/, "");
    const fullPath = path.join(process.cwd(), relativePath);
    const childNames = await listDirectories(fullPath);
    const children = childNames
      .filter((name) => !shouldSkipDir(name))
      .map((name) => ({
        id: `root:${path.posix.join(relativePath, name)}`,
        label: name,
        type: "group",
        depth: node.depth + 1,
        children: [],
        childrenLoaded: false,
      } satisfies WizardNode));

    let updatedRoots: WizardNode[] | null = null;
    setRoots((prev) => {
      const next = updateRootChildren(prev, node.id, children);
      updatedRoots = next;
      return next;
    });

    if (rootsSelected().has(node.id)) {
      setRootsSelected((prev) => {
        const next = new Set(prev);
        children.forEach((child) => next.add(child.id));
        return next;
      });
    }

    return updatedRoots ?? roots();
  };

  const handleRootsInput = (input: string) => {
    const flat = rootsFlat();
    const current = flat[rootsCursor()];
    if (input === "up" || input === "k") {
      const next = Math.max(0, rootsCursor() - 1);
      setRootsCursor(next);
      adjustScroll(next, rootsScroll(), setRootsScroll, flat.length);
    } else if (input === "down" || input === "j") {
      const next = Math.min(flat.length - 1, rootsCursor() + 1);
      setRootsCursor(next);
      adjustScroll(next, rootsScroll(), setRootsScroll, flat.length);
    } else if ((input === "right" || input === "l") && current?.type === "group") {
      const nextExpanded = new Set(rootsExpanded());
      if (nextExpanded.has(current.id)) {
        const next = Math.min(rootsCursor() + 1, flat.length - 1);
        setRootsCursor(next);
        adjustScroll(next, rootsScroll(), setRootsScroll, flat.length);
        return;
      }
      void loadRootChildren(current).then((updatedRoots) => {
        nextExpanded.add(current.id);
        setRootsExpanded(nextExpanded);
        const updated = flattenWizardTree(updatedRoots, nextExpanded);
        const nextIdx = updated.findIndex(n => n.id === current.id);
        const targetIdx = nextIdx !== -1 ? nextIdx : rootsCursor();
        setRootsCursor(targetIdx);
        adjustScroll(targetIdx, rootsScroll(), setRootsScroll, updated.length);
      });
    } else if ((input === "left" || input === "h") && current) {
      const nextExpanded = new Set(rootsExpanded());
      if (current.type === "group" && nextExpanded.has(current.id)) {
        nextExpanded.delete(current.id);
        setRootsExpanded(nextExpanded);
        const updated = flattenWizardTree(roots(), nextExpanded);
        const nextIdx = updated.findIndex(n => n.id === current.id);
        const targetIdx = nextIdx !== -1 ? nextIdx : Math.max(0, Math.min(rootsCursor(), updated.length - 1));
        setRootsCursor(targetIdx);
        adjustScroll(targetIdx, rootsScroll(), setRootsScroll, updated.length);
      } else {
        const parts = current.id.split(":");
        if (parts.length < 2) return;
        const pathParts = parts[1]?.split("/");
        if (!pathParts || pathParts.length <= 1) return;
        const parentPath = pathParts.slice(0, -1).join("/");
        const parentId = `${parts[0]}:${parentPath}`;
        const parentIdx = flat.findIndex(n => n.id === parentId);
        if (parentIdx !== -1) {
          setRootsCursor(parentIdx);
          adjustScroll(parentIdx, rootsScroll(), setRootsScroll, flat.length);
        }
      }
    } else if (input === "a") {
      const list = rootsFlat();
      const next = new Set(rootsSelected());
      const shouldSelectAll = list.some((node) => !next.has(node.id));
      if (shouldSelectAll) {
        list.forEach((node) => next.add(node.id));
      } else {
        next.clear();
      }
      setRootsSelected(next);
    } else if (input === "space") {
      if (!current) return;
      const next = new Set(rootsSelected());
      const toggleNode = (node: WizardNode, shouldSelect: boolean) => {
        if (shouldSelect) next.add(node.id); else next.delete(node.id);
        node.children.forEach((child) => toggleNode(child, shouldSelect));
      };

      const shouldSelect = !next.has(current.id);
      toggleNode(current, shouldSelect);
      setRootsSelected(next);
    } else if (input === "return") {
      const selectedPaths = Array.from(rootsSelected())
        .map((id) => id.replace(/^root:/, "").replace(/\\/g, "/"))
        .map((id) => id.replace(/^\/+|\/+$/g, ""))
        .filter((id) => id.length > 0);

      const sorted = [...new Set(selectedPaths)].sort((a, b) => a.length - b.length);
      const reduced: string[] = [];
      for (const pathValue of sorted) {
        const covered = reduced.some((root) => pathValue === root || pathValue.startsWith(`${root}/`));
        if (!covered) reduced.push(pathValue);
      }

      const rootSelections = new Set(reduced);
      setStep("scanning");
      scanWizardTree(process.cwd(), Array.from(rootSelections)).then(async tree => {
        const expandedIds = new Set<string>();
        const walk = (n: WizardNode) => { if (n.type === "group") { expandedIds.add(n.id); n.children.forEach(walk); } };
        tree.forEach(walk);
        setExpanded(expandedIds);
        const flat = flattenWizardTree(tree, expandedIds);
        const selectedIds = new Set<string>();
        flat.forEach(n => selectedIds.add(n.id));
        
        setNodes(tree);
        setFlatNodes(flat);
        setSelected(selectedIds);
        setCursor(0);
        setScroll(0);
        setStep("tree");
      });
    }
  };

  const handleTreeInput = (input: string) => {
    const flat = flatNodes();
    const current = flat[cursor()];
    if (input === "up" || input === "k") {
      const next = Math.max(0, cursor() - 1);
      setCursor(next);
      adjustScroll(next, scroll(), setScroll, flat.length);
    } else if (input === "down" || input === "j") {
      const next = Math.min(flat.length - 1, cursor() + 1);
      setCursor(next);
      adjustScroll(next, scroll(), setScroll, flat.length);
    } else if (input === "right" || input === "l") {
      if (!current || current.type !== "group") return;
      const nextExpanded = new Set(expanded());
      if (nextExpanded.has(current.id)) {
        const next = Math.min(cursor() + 1, flat.length - 1);
        setCursor(next);
        adjustScroll(next, scroll(), setScroll, flat.length);
        return;
      }
      nextExpanded.add(current.id);
      setExpanded(nextExpanded);
      const updated = flattenWizardTree(nodes(), nextExpanded);
      setFlatNodes(updated);
      const nextIdx = updated.findIndex(n => n.id === current.id);
      const targetIdx = nextIdx !== -1 ? nextIdx : cursor();
      setCursor(targetIdx);
      adjustScroll(targetIdx, scroll(), setScroll, updated.length);
    } else if (input === "left" || input === "h") {
      if (!current) return;
      const nextExpanded = new Set(expanded());
      if (current.type === "group" && nextExpanded.has(current.id)) {
        nextExpanded.delete(current.id);
        setExpanded(nextExpanded);
        const updated = flattenWizardTree(nodes(), nextExpanded);
        setFlatNodes(updated);
        const nextIdx = updated.findIndex(n => n.id === current.id);
        const targetIdx = nextIdx !== -1 ? nextIdx : Math.max(0, Math.min(cursor(), updated.length - 1));
        setCursor(targetIdx);
        adjustScroll(targetIdx, scroll(), setScroll, updated.length);
      } else {
        const parts = current.id.split(":");
        if (parts.length < 2) return;
        const pathParts = parts[1]?.split("/");
        if (!pathParts || pathParts.length <= 1) return;
        const parentPath = pathParts.slice(0, -1).join("/");
        const parentId = `${parts[0]}:${parentPath}`;
        const parentIdx = flat.findIndex(n => n.id === parentId);
        if (parentIdx !== -1) {
          setCursor(parentIdx);
          adjustScroll(parentIdx, scroll(), setScroll, flat.length);
        }
      }
    } else if (input === "a") {
      const list = flatNodes();
      const next = new Set(selected());
      const shouldSelectAll = list.some((node) => !next.has(node.id));
      if (shouldSelectAll) {
        list.forEach((node) => next.add(node.id));
      } else {
        next.clear();
      }
      setSelected(next);
    } else if (input === "space" && current) {
      const next = new Set(selected());
      const toggleNode = (node: WizardNode, checked: boolean) => {
        if (checked) next.delete(node.id); else next.add(node.id);
        node.children.forEach(child => toggleNode(child, checked));
      };
      toggleNode(current, next.has(current.id));
      setSelected(next);
    } else if (input === "tab") {
      if (current?.item) {
        const cycle = ["agent", "skill", "command", "doc"] as const;
        const overrides = new Map(typeOverrides());
        const currentType = overrides.get(current.item.repoPath) ?? current.item.type ?? "doc";
        const idx = cycle.indexOf(currentType as typeof cycle[number]);
        const nextType = cycle[(idx + 1) % cycle.length] as RegistryItem["type"];
        overrides.set(current.item.repoPath, nextType);
        setTypeOverrides(overrides);
      } else if (current?.type === "group" || current?.type === "folder") {
        const overrides = new Map(typeOverrides());
        const repoPath = current.id.replace(/^path:/, "");
        const currentType = overrides.get(repoPath);
        if (currentType === "pack") {
          overrides.delete(repoPath);
        } else {
          overrides.set(repoPath, "pack");
        }
        setTypeOverrides(overrides);
      }
    } else if (input === "return") {
      setStep("repo");
    }
  };

  const handleTextInput = (input: string, getter: () => string, setter: (v: string) => void, onNext: () => void) => {
    if (input === "return") {
      if (getter().trim().length > 0) onNext();
    } else if (input === "backspace") {
      setter(getter().slice(0, -1));
    } else if (input === "space") {
      setter(getter() + " ");
    } else if (input.length === 1) {
      setter(getter() + input);
    }
  };

  const finalize = () => {
    const selectedItems = flatNodes()
      .filter(n => n.type === "item" && selected().has(n.id) && n.item && !n.id.startsWith("structure:"))
      .map(n => n.item!);
    
    const rootLabels = new Set(roots().filter(n => rootsSelected().has(n.id)).map(n => n.label));
    const registry = buildRegistryFromSelection(selectedItems, rootLabels, typeOverrides());
    const repoUrlStr = repoUrl().trim();
    const repoName = repoUrlStr.split("/").filter(Boolean).pop() ?? "Opencode Workflows";

    writeRegistryFiles(process.cwd(), {
      name: repoName,
      description: aboutText().trim(),
      repoUrl: repoUrlStr,
      aboutInline: aboutInline() === true,
    }, registry).then(() => {
      setSummary({
        packs: registry.packs.length,
        standalone: registry.standalone.length,
        items: registry.packs.reduce((s, p) => s + p.items.length, 0) + registry.standalone.length,
      });
      setStep("open-files");
    });
  };

  return {
    step, setStep,
    nodes, flatNodes,
    cursor, setCursor,
    scroll, setScroll,
    expanded, selected,
    repoUrl, setRepoUrl,
    aboutInline, setAboutInline,
    aboutText, setAboutText,
    registryDescription, setRegistryDescription,
    typeOverrides,
    roots, rootsSelected,
    rootsFlat,
    rootsSelectionState,
    rootsCursor, rootsScroll,
    rootsExpanded,
    summary,
    startWizard,
    handleRootsInput,
    handleTreeInput,
    handleTextInput,
    finalize
  };
};
