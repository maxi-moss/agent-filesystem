const agentNamespaces = {
  "main-agent": ["/global/", "/jira/", "/memories/", "/news/", "/notes/", "/summaries/"],
  "memory-agent": ["/memories/", "/news/"],
  "news-agent": ["/news/"],
  "jira-agent": ["/jira/"],
  "jira-webhook": ["/jira/"],
} as const satisfies Record<string, readonly string[]>;

export type AgentName = keyof typeof agentNamespaces;

/**
 * Permission table indexed by access-scope name. "all" is a synthetic scope
 * (union of every agent's namespaces) used by the file-browser UI; every
 * other key is an agent name.
 */
export const accessScopes: Record<string, readonly string[]> = {
  ...agentNamespaces,
  all: [...new Set(Object.values(agentNamespaces).flat())].sort(),
};

/** Get namespaces for an agent. */
export const namespacesFor = (agent: AgentName): readonly string[] =>
  agentNamespaces[agent];

/** Extract a path's namespace (top-level directory). */
function resolveNamespace(path: string): string {
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) {
    throw new Error(`${path}: path must be inside a namespace`);
  }
  return `/${segments[0]}/`;
}

/**
 * Return the namespaces an agent has access to. Throws if the agent is not
 * registered in the access table.
 */
export function resolveAgentAccess(agent: string): readonly string[] {
  const access = accessScopes[agent];
  if (!access) {
    throw new Error(`${agent}: agent does not exist in access table`);
  }
  return access;
}

/** Check whether a path falls inside one of the given namespaces. */
export function isInNamespaces(
  path: string,
  namespaces: readonly string[],
): boolean {
  try {
    return namespaces.includes(resolveNamespace(path));
  } catch {
    return false;
  }
}

/**
 * Check that a path is accessible to an agent, throwing an error if not.
 * This should be called at the beginning of all filesystem commands that
 * operate on a specific path.
 */
export function assertAccessible(path: string, agent: string): void {
  const access = resolveAgentAccess(agent);
  if (!isInNamespaces(path, access)) {
    throw new Error(`Permission denied: ${path}`);
  }
}
