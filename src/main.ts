import { Plugin } from "obsidian";

/** Minimal Phase 1 plugin entry point. Product workflows are added later. */
export default class BrainGoogleDriveSyncPlugin extends Plugin {
  async onload(): Promise<void> {
    // Phase 1 intentionally performs no synchronization or remote I/O.
  }
}
