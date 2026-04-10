import * as db from "../../filesystem/db.js";

interface TreeNode {
  children: Map<string, TreeNode>;
}

export function buildFiletree(): string {
  const rows = db.queryByPrefix("/");
  if (rows.length === 0) return "/ (empty)";

  const root: TreeNode = { children: new Map() };

  for (const row of rows) {
    const segments = row.path.split("/").filter(Boolean);
    let current = root;
    for (const segment of segments) {
      if (!current.children.has(segment)) {
        current.children.set(segment, { children: new Map() });
      }
      current = current.children.get(segment)!;
    }
  }

  const lines: string[] = ["/"];
  renderNode(root, "", lines);
  return lines.join("\n");
}

function renderNode(node: TreeNode, prefix: string, lines: string[]): void {
  const entries = [...node.children.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );

  for (let i = 0; i < entries.length; i++) {
    const [name, child] = entries[i]!;
    const isLast = i === entries.length - 1;
    const connector = isLast ? "└── " : "├── ";
    const isDir = child.children.size > 0;
    lines.push(prefix + connector + name + (isDir ? "/" : ""));

    if (isDir) {
      const childPrefix = prefix + (isLast ? "    " : "│   ");
      renderNode(child, childPrefix, lines);
    }
  }
}
