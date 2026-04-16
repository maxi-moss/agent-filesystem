<script lang="ts">
	import type { FileRow } from '$lib/shared/api/files.js';
	import { parseMarkdown } from '$lib/shared/markdown/parser.js';

	interface Props {
		file: FileRow | null;
		loading: boolean;
	}

	let { file, loading }: Props = $props();

	const renderedContent = $derived(file ? parseMarkdown(file.content) : '');

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}
</script>

<div class="flex h-full flex-col">
	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<div class="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent"></div>
		</div>
	{:else if file}
		<div class="flex items-center justify-between border-b border-border px-5 py-3">
			<span class="font-mono text-sm font-semibold text-accent">
				{file.path.split('/').pop()}
			</span>
			<span class="font-mono text-xs text-text-secondary">
				{formatDate(file.updated)}
			</span>
		</div>
		<div
			class="prose-invert flex-1 overflow-y-auto px-5 py-4 font-mono text-sm leading-relaxed text-text-primary"
		>
			{@html renderedContent}
		</div>
	{:else}
		<div class="flex flex-1 flex-col items-center justify-center gap-3 text-text-secondary">
			<svg class="h-12 w-12 opacity-20" viewBox="0 0 24 24" fill="currentColor">
				<path
					d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"
				/>
			</svg>
			<span class="font-mono text-xs uppercase tracking-widest">Select a file to preview</span>
		</div>
	{/if}
</div>
