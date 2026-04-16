<script lang="ts">
	interface Props {
		path: string | null;
		onnavigate: (path: string) => void;
	}

	let { path, onnavigate }: Props = $props();

	const segments = $derived(() => {
		if (!path) return [];
		const parts = path.split('/').filter(Boolean);
		return parts.map((part, index) => ({
			name: part,
			path: '/' + parts.slice(0, index + 1).join('/'),
		}));
	});
</script>

<nav class="flex items-center gap-0.5 font-mono text-sm">
	<button
		class="cursor-pointer rounded px-1.5 py-0.5 text-accent transition-colors hover:bg-accent-dim"
		onclick={() => onnavigate('/')}
	>
		/
	</button>
	{#each segments() as segment}
		<span class="text-text-secondary">/</span>
		<button
			class="cursor-pointer rounded px-1.5 py-0.5 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
			onclick={() => onnavigate(segment.path)}
		>
			{segment.name}
		</button>
	{/each}
</nav>
