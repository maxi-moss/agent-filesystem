<script lang="ts">
  import type { DisplayNode } from '$lib/shared/stores/agentRun.svelte.js';

  let { node }: { node: DisplayNode } = $props();
</script>

<div
  title={node.error ?? ''}
  class="min-w-[150px] rounded-lg border-2 bg-surface-raised px-4 py-3 text-center text-sm font-bold text-text-primary
    {node.status === 'active' ? 'border-accent shadow-[0_0_12px_var(--color-accent-dim)]' : ''}
    {node.status === 'done' ? 'border-border' : ''}
    {node.status === 'error' ? 'border-red-500' : ''}"
>
  <span>{node.label}</span>
  {#if node.status === 'error' && node.error}
    <div class="mt-1 truncate text-xs font-normal text-red-400">{node.error}</div>
  {/if}
</div>
