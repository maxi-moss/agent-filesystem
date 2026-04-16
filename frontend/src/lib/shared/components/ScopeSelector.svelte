<script lang="ts">
	import type { AccessScope } from '$lib/shared/api/files.js';

	interface Props {
		accessScopes: AccessScope[];
		currentAccessScope: string;
		onchange: (accessScope: string) => void;
	}

	let { accessScopes, currentAccessScope, onchange }: Props = $props();
</script>

<div class="flex items-center gap-2">
	<span class="text-text-secondary text-xs uppercase tracking-widest">Scope</span>
	<div class="flex gap-0.5 rounded-md border border-border bg-surface p-0.5">
		{#each accessScopes as scope}
			<button
				class="cursor-pointer rounded px-2.5 py-1 font-mono text-xs transition-all duration-150
					{currentAccessScope === scope.name
					? 'bg-accent text-surface font-semibold shadow-[0_0_12px_var(--color-accent-dim)]'
					: 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'}"
				onclick={() => onchange(scope.name)}
			>
				{scope.name}
			</button>
		{/each}
	</div>
</div>
