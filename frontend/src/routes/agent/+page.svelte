<script lang="ts">
  import { onDestroy } from 'svelte';
  import { agentRunStore } from '$lib/shared/stores/agentRun.svelte.js';
  import Flowchart from '$lib/shared/components/flowchart/Flowchart.svelte';

  onDestroy(() => agentRunStore.destroy());

  function submit(event: SubmitEvent) {
    event.preventDefault();
    agentRunStore.start();
  }
</script>

<div class="flex h-screen flex-col bg-surface font-mono text-text-primary">
  <header class="flex items-center gap-4 border-b border-border bg-surface-raised px-5 py-3">
    <h1 class="text-sm font-bold tracking-wide">
      <span class="text-accent">agent</span>
      <span class="text-text-secondary">/</span> loop
    </h1>
    <a href="/" class="text-xs text-text-secondary hover:text-text-primary">← files</a>
    <span class="ml-auto text-xs uppercase tracking-wide text-text-secondary">{agentRunStore.status}</span>
  </header>

  <form onsubmit={submit} class="flex gap-2 border-b border-border bg-surface-raised px-5 py-3">
    <input
      class="flex-1 rounded border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
      placeholder="Ask the agent to remember or recall something…"
      bind:value={agentRunStore.prompt}
      disabled={agentRunStore.status === 'running'}
    />
    <button
      type="submit"
      class="rounded bg-accent px-4 py-2 text-sm font-bold text-surface disabled:opacity-50"
      disabled={agentRunStore.status === 'running' || !agentRunStore.prompt.trim()}
    >Run</button>
  </form>

  <main class="min-h-0 flex-1">
    {#if agentRunStore.nodes.length}
      <Flowchart nodes={agentRunStore.nodes} />
    {:else}
      <div class="flex h-full items-center justify-center text-sm text-text-secondary">
        No active run. Enter a prompt to start.
      </div>
    {/if}
  </main>
</div>
