import {
  listDirectory,
  getFile,
  getAccessScopes,
  type DirectoryEntry,
  type FileRow,
  type AccessScope,
} from "$lib/shared/api/files.js";

class FileSystemStore {
  accessScopes = $state<AccessScope[]>([]);
  currentAccessScope = $state("all");
  selectedPath = $state<string | null>(null);
  selectedFile = $state<FileRow | null>(null);
  expanded = $state(new Set<string>(["/"]));
  children = $state(new Map<string, DirectoryEntry[]>());
  loading = $state(false);
  private eventSource: EventSource | null = null;

  async initialize() {
    this.accessScopes = await getAccessScopes();
    await this.loadDirectory("/");
    this.connectSSE();
  }

  async setAccessScope(accessScope: string) {
    this.currentAccessScope = accessScope;
    this.selectedPath = null;
    this.selectedFile = null;
    this.expanded = new Set<string>(["/"]);
    this.children = new Map();
    await this.loadDirectory("/");
  }

  async loadDirectory(path: string) {
    try {
      const result = await listDirectory(path, this.currentAccessScope);
      this.children.set(path, result.children);
      this.children = new Map(this.children);
    } catch {
      this.children.set(path, []);
      this.children = new Map(this.children);
    }
  }

  async toggleDirectory(path: string) {
    const next = new Set(this.expanded);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
      if (!this.children.has(path)) {
        await this.loadDirectory(path);
      }
    }
    this.expanded = next;
  }

  async selectFile(path: string) {
    this.selectedPath = path;
    this.loading = true;
    try {
      this.selectedFile = await getFile(path, this.currentAccessScope);
    } catch {
      this.selectedFile = null;
    } finally {
      this.loading = false;
    }
  }

  private connectSSE() {
    this.eventSource = new EventSource("/api/files/events");
    this.eventSource.addEventListener("change", (event) => {
      const data = JSON.parse(event.data) as { type: string; path: string };
      const parentPath = data.path.substring(0, data.path.lastIndexOf("/") + 1) || "/";
      const normalizedParent = parentPath === "/" ? "/" : parentPath.replace(/\/$/, "");

      if (this.children.has(normalizedParent) || this.children.has(parentPath)) {
        const dirToRefresh = this.children.has(normalizedParent) ? normalizedParent : parentPath;
        this.loadDirectory(dirToRefresh);
      }

      if (data.path === this.selectedPath) {
        this.selectFile(data.path);
      }
    });
  }

  destroy() {
    this.eventSource?.close();
  }
}

export const fsStore = new FileSystemStore();
