//Entry point for the Opencode Workflow Selector TUI application.
//Orchestrates keyboard navigation and view transitions using specialized hooks.

import { render, useKeyboard, useTerminalDimensions } from "@opentui/solid";
import { onMount, Show } from "solid-js";

import { SelectionView, ConfirmView, SyncView, AboutView, RegistrySelectView, AppAboutView, RegistryWizardView } from "./components";
import { useAppLogic } from "./hooks/useAppLogic";
import { useRegistryWizard } from "./hooks/useRegistryWizard";

const App = () => {
  const terminalDimensions = useTerminalDimensions();
  const wizardRows = () => Math.max(5, terminalDimensions().height - 12);
  const isAdminMode = process.argv.includes("--admin");
  
  const app = useAppLogic();
  const wizard = useRegistryWizard(wizardRows(), app.resetToRegistryMenu);

  onMount(() => {
    app.loadInitialData(isAdminMode);
  });

  useKeyboard((key: { name: string; ctrl?: boolean }) => {
    const rawName = key.name;
    const lowered = rawName.toLowerCase();
    const input = rawName === " " || lowered === "space" || lowered === "spacebar"
      ? "space"
      : lowered;

    //Global exit
    if (key.ctrl && input === "c") {
      process.exit(0);
    }

    //Modal overlaps
    if (app.isAboutOpen()) {
      app.setIsAboutOpen(false);
      return;
    }
    if (app.isAppAboutOpen()) {
      app.setIsAppAboutOpen(false);
      return;
    }

    //Registry Selection View
    if (app.status() === "selecting-registry") {
      const sources = app.registrySources();
      const offset = isAdminMode ? 1 : 0;
      const totalItems = sources.length + offset;
      
      if (input === "a") {
        app.setIsAppAboutOpen(true);
      } else if (input === "up" || input === "k") {
        app.setRegistryCursor((prev) => Math.max(0, prev - 1));
      } else if (input === "down" || input === "j") {
        app.setRegistryCursor((prev) => Math.min(totalItems - 1, prev + 1));
      } else if (input === "return") {
        if (isAdminMode && app.registryCursor() === 0) {
          wizard.startWizard().then(() => app.setStatus("creating-registry"));
        } else {
          const sourceIndex = app.registryCursor() - offset + 1;
          if (sourceIndex > 0) app.handleRegistrySelection(sourceIndex);
        }
      } else if (input === "escape") {
        app.resetToRegistryMenu();
      }
      return;
    }

    //Wizard View
    if (app.status() === "creating-registry") {
      if (input === "escape") {
        app.resetToRegistryMenu();
        return;
      }

      const step = wizard.step();
      if (step === "roots") {
        wizard.handleRootsInput(input);
      } else if (step === "tree") {
        wizard.handleTreeInput(input);
      } else if (step === "repo") {
        wizard.handleTextInput(input, wizard.repoUrl, wizard.setRepoUrl, () => wizard.setStep("description"));
      } else if (step === "description") {
        wizard.handleTextInput(input, wizard.registryDescription, wizard.setRegistryDescription, () => wizard.setStep("about"));
      } else if (step === "about") {
        if (input === "y") {
          wizard.setAboutInline(true);
          wizard.setStep("about-text");
        } else if (input === "n") {
          wizard.setAboutInline(false);
          wizard.setStep("scanning");
          wizard.finalize();
        }
      } else if (step === "about-text") {
        wizard.handleTextInput(input, wizard.aboutText, wizard.setAboutText, () => {
          wizard.setStep("scanning");
          wizard.finalize();
        });
      } else if (step === "open-files") {
        if (input === "y") {
          const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
          Bun.spawn([opener, "registry.json"], { cwd: process.cwd() });
          Bun.spawn([opener, "registry.toml"], { cwd: process.cwd() });
        }
        wizard.setStep("open-pr");
      } else if (step === "open-pr") {
        if (input === "y") {
          const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
          Bun.spawn([opener, "https://github.com/IgorWarzocha/opencode-workflows-manager/pulls"], { cwd: process.cwd() });
        }
        wizard.setStep("done");
      } else if (step === "done") {
        app.resetToRegistryMenu();
        app.loadInitialData(true);
      }
      return;
    }

    //Confirmation and Sync Views
    if (app.status() === "confirming") {
      if (input === "return") {
        app.setStatus("syncing");
        app.executeSync();
      } else if (input === "escape") {
        app.returnToSelection();
      }
      return;
    }

    if (app.status() === "done") {
      if (input === "return") process.exit(0);
      if (input === "escape") app.returnToSelection();
      return;
    }

    //Main Selection View
    if (app.status() === "selecting") {
      if (input === "a") {
        app.setIsAboutOpen(true);
        return;
      }

      const items = app.visibleItems();
      const currentItem = items[app.cursor()];

      if (input === "up" || input === "k") {
        app.setCursor((prev) => Math.max(0, prev - 1));
      } else if (input === "down" || input === "j") {
        app.setCursor((prev) => Math.min(items.length - 1, prev + 1));
      } else if ((input === "right" || input === "l") && currentItem) {
        if (currentItem.type === "category") {
          app.setExpandedCategory(currentItem.id);
          app.setExpandedPack(null);
        } else if (currentItem.type === "pack" && currentItem.pack) {
          app.setExpandedPack(currentItem.pack.name);
        }
      } else if ((input === "left" || input === "h") && currentItem) {
        if (currentItem.type === "category") {
          app.setExpandedCategory(null);
        } else if (currentItem.type === "pack") {
          if (app.expandedPack() === currentItem.pack?.name) app.setExpandedPack(null);
          else app.setCursor(items.findIndex((i) => i.id === "packs"));
        } else if (currentItem.type === "item" && currentItem.parent) {
          app.setCursor(items.findIndex((i) => i.id === currentItem.parent));
        }
      } else if (input === "space" && currentItem) {
        if (currentItem.type === "item" && currentItem.item) {
          app.toggleItem(currentItem.item);
        } else if (currentItem.type === "pack" && currentItem.pack) {
          app.togglePack(currentItem.pack);
        }
      } else if (input === "return") {
        app.setStatus("confirming");
      } else if (input === "tab") {
        const nextMode = app.installMode() === "global" ? "local" : "global";
        app.setInstallMode(nextMode);
        void app.refreshSelectionForMode(nextMode);
      } else if (input === "escape") {
        app.resetToRegistryMenu();
      }
    }
  });

  return (
    <box flexDirection="column" padding={1} flexGrow={1}>
      <Show when={app.status() === "selecting-registry" && !app.isAppAboutOpen()}>
        <RegistrySelectView sources={app.registrySources} cursor={app.registryCursor} showAdminOption={isAdminMode} />
      </Show>

      <Show when={app.status() === "selecting-registry" && app.isAppAboutOpen()}>
        <AppAboutView />
      </Show>

      <Show when={app.status() === "creating-registry"}>
        <RegistryWizardView
          step={wizard.step()}
          nodes={wizard.step() === "roots"
            ? wizard.rootsFlat().slice(wizard.rootsScroll(), wizard.rootsScroll() + wizardRows())
            : wizard.flatNodes().slice(wizard.scroll(), wizard.scroll() + wizardRows())}
          cursor={wizard.step() === "roots" ? wizard.rootsCursor() : wizard.cursor()}
          scrollOffset={wizard.step() === "roots" ? wizard.scroll() : wizard.scroll()}
          expanded={wizard.step() === "roots" ? wizard.rootsExpanded() : wizard.expanded()}
          selected={wizard.step() === "roots" ? wizard.rootsSelected() : wizard.selected()}
          rootsSelectionState={wizard.step() === "roots" ? wizard.rootsSelectionState() : undefined}
          rootsInput={wizard.roots().map((node) => node.label).join(", ")}
          typeOverrides={wizard.typeOverrides()}
          repoUrl={wizard.repoUrl()}
          aboutInline={wizard.aboutInline()}
          name=""
          description={wizard.aboutText()}
          registryDescription={wizard.registryDescription()}
          summary={wizard.summary()}
          existingPaths={wizard.existingPaths()}
        />
      </Show>

      <Show when={app.status() === "selecting" && !app.isAboutOpen() && app.appConfig()}>
        <SelectionView
          items={app.visibleItems}
          cursor={app.cursor}
          selectedItems={app.selectedItems}
          isPackSelected={app.isPackSelected}
          installMode={app.installMode}
          title={`${app.appConfig()!.ui.brand}'s ${app.appConfig()!.ui.product}`}
        />
      </Show>

      <Show when={app.status() === "confirming"}>
        <ConfirmView changes={app.changes} />
      </Show>

      <Show when={app.status() === "syncing" || app.status() === "done"}>
        <SyncView status={app.status} logs={app.syncLogs} />
      </Show>

      <Show when={app.isAboutOpen() && app.appConfig()}>
        <AboutView config={app.appConfig()!} />
      </Show>
    </box>
  );
};

render(App);
