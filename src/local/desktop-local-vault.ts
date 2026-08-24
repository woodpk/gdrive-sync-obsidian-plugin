import type { App, DataAdapter } from "obsidian";
import { DesktopExternalReferenceGuard } from "./desktop-external-reference-guard";
import { LocalPlatformCapabilityError, ObsidianLocalVaultAdapter, type LocalAdapterOptions } from "./obsidian-local-vault";

interface DesktopDataAdapter extends DataAdapter {
  getBasePath(): string;
}

function isDesktopDataAdapter(adapter: DataAdapter): adapter is DesktopDataAdapter {
  return typeof (adapter as Partial<DesktopDataAdapter>).getBasePath === "function";
}

export function createDesktopLocalVaultAdapter(
  app: App,
  options: Omit<LocalAdapterOptions, "externalReferenceGuard"> = {}
): ObsidianLocalVaultAdapter {
  const adapter = app.vault.adapter;
  if (!isDesktopDataAdapter(adapter)) {
    throw new LocalPlatformCapabilityError(
      "desktop-filesystem-boundary",
      "Desktop local-vault construction requires Obsidian FileSystemAdapter.getBasePath()."
    );
  }
  return new ObsidianLocalVaultAdapter(app, {
    ...options,
    externalReferenceGuard: new DesktopExternalReferenceGuard(adapter.getBasePath())
  });
}
