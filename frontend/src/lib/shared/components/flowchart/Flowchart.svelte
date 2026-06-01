<script lang="ts">
  import type { DisplayNode } from '$lib/shared/stores/agentRun.svelte.js';
  import CategoryNode from './CategoryNode.svelte';

  let { nodes }: { nodes: DisplayNode[] } = $props();
</script>

<div class="flex h-full w-full items-center overflow-x-auto p-8">
  <div class="flex items-center gap-0">
    {#each nodes as node, index (node.id)}
      {#if index > 0}
        <div
          class="h-px w-10 shrink-0 {node.status === 'active' ? 'bg-accent' : 'bg-border'}"
        ></div>
      {/if}
      <CategoryNode {node} />
    {/each}
  </div>
</div>
