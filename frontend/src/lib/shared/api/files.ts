export interface FileRow {
  path: string;
  content: string;
  created: string;
  updated: string;
}

export interface DirectoryEntry {
  name: string;
  type: "file" | "dir";
}

export interface AccessScope {
  name: string;
  namespaces: string[];
}

export async function getFile(path: string, accessScope: string): Promise<FileRow> {
  const params = new URLSearchParams({ path, accessScope });
  const response = await fetch(`/api/files?${params}`);
  if (!response.ok) throw new Error(`Failed to fetch file: ${path}`);
  return response.json();
}

export async function listDirectory(
  path: string,
  accessScope: string,
): Promise<{ path: string; children: DirectoryEntry[] }> {
  const params = new URLSearchParams({ path, accessScope });
  const response = await fetch(`/api/files/directory?${params}`);
  if (!response.ok) throw new Error(`Failed to list directory: ${path}`);
  return response.json();
}

export async function getAccessScopes(): Promise<AccessScope[]> {
  const response = await fetch("/api/files/access-scopes");
  if (!response.ok) throw new Error("Failed to fetch access scopes");
  return response.json();
}
