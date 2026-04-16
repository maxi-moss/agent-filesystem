<script lang="ts">
	import type { DirectoryEntry } from '$lib/shared/api/files.js';
	import FileTree from './FileTree.svelte';
	import TreeNode from './TreeNode.svelte';

	interface Props {
		path: string;
		depth?: number;
		children: Map<string, DirectoryEntry[]>;
		expanded: Set<string>;
		selectedPath: string | null;
		ontoggledir: (path: string) => void;
		onselectfile: (path: string) => void;
	}

	let {
		path,
		depth = 0,
		children,
		expanded,
		selectedPath,
		ontoggledir,
		onselectfile,
	}: Props = $props();

	const entries = $derived(children.get(path) ?? []);

	function resolvePath(entry: DirectoryEntry): string {
		const base = path === '/' ? '' : path;
		return entry.type === 'dir'
			? base + '/' + entry.name.replace(/\/$/, '')
			: base + '/' + entry.name;
	}
</script>

<div class="flex flex-col">
	{#each entries as entry (entry.name)}
		{@const entryPath = resolvePath(entry)}
		<TreeNode
			{entry}
			path={path}
			{depth}
			isExpanded={entry.type === 'dir' && expanded.has(entryPath)}
			isSelected={entryPath === selectedPath}
			onclick={() => {
				if (entry.type === 'dir') {
					ontoggledir(entryPath);
				} else {
					onselectfile(entryPath);
				}
			}}
		/>
		{#if entry.type === 'dir' && expanded.has(entryPath)}
			<FileTree
				path={entryPath}
				depth={depth + 1}
				{children}
				{expanded}
				{selectedPath}
				{ontoggledir}
				{onselectfile}
			/>
		{/if}
	{/each}
</div>
