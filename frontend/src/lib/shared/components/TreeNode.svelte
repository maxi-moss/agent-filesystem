<script lang="ts">
	import type { DirectoryEntry } from '$lib/shared/api/files.js';

	interface Props {
		entry: DirectoryEntry;
		path: string;
		depth: number;
		isExpanded: boolean;
		isSelected: boolean;
		onclick: () => void;
	}

	let { entry, path, depth, isExpanded, isSelected, onclick }: Props = $props();

	const dirPath = $derived(entry.type === 'dir' ? path + '/' + entry.name.replace(/\/$/, '') : null);
</script>

<button
	class="group flex w-full cursor-pointer items-center gap-1.5 rounded-sm py-[3px] pr-2 font-mono text-[13px] transition-all duration-100
		{isSelected
		? 'bg-accent-dim text-accent'
		: 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}"
	style="padding-left: {depth * 16 + 8}px"
	onclick={onclick}
>
	{#if entry.type === 'dir'}
		<svg
			class="h-3.5 w-3.5 shrink-0 transition-transform duration-150 {isExpanded ? 'rotate-90' : ''}"
			viewBox="0 0 16 16"
			fill="currentColor"
		>
			<path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" />
		</svg>
		<svg class="h-4 w-4 shrink-0 text-accent opacity-60" viewBox="0 0 24 24" fill="currentColor">
			<path
				d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
			/>
		</svg>
	{:else}
		<span class="w-3.5 shrink-0"></span>
		<svg class="h-4 w-4 shrink-0 opacity-40" viewBox="0 0 24 24" fill="currentColor">
			<path
				d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"
			/>
		</svg>
	{/if}
	<span class="truncate">{entry.name.replace(/\/$/, '')}</span>
</button>
