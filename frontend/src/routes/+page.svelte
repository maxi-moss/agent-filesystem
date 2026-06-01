<script lang="ts">
	import { onMount } from 'svelte';
	import { fsStore } from '$lib/shared/stores/fs.svelte.js';
	import ScopeSelector from '$lib/shared/components/ScopeSelector.svelte';
	import Breadcrumb from '$lib/shared/components/Breadcrumb.svelte';
	import FileTree from '$lib/shared/components/FileTree.svelte';
	import FilePreview from '$lib/shared/components/FilePreview.svelte';

	onMount(() => {
		fsStore.initialize();
		return () => fsStore.destroy();
	});
</script>

<div class="flex h-screen flex-col bg-surface font-mono text-text-primary">
	<header
		class="flex items-center justify-between border-b border-border bg-surface-raised px-5 py-3"
	>
		<div class="flex items-center gap-4">
			<h1 class="text-sm font-bold tracking-wide text-text-primary">
				<span class="text-accent">agent</span>
				<span class="text-text-secondary">/</span>
				fs
			</h1>
			<a href="/agent" class="text-xs text-text-secondary hover:text-text-primary">agent loop →</a>
			<div class="h-4 w-px bg-border"></div>
			<Breadcrumb
				path={fsStore.selectedPath}
				onnavigate={(path) => {
					fsStore.toggleDirectory(path);
				}}
			/>
		</div>
		<ScopeSelector
			accessScopes={fsStore.accessScopes}
			currentAccessScope={fsStore.currentAccessScope}
			onchange={(accessScope) => fsStore.setAccessScope(accessScope)}
		/>
	</header>

	<div class="flex min-h-0 flex-1">
		<aside
			class="w-72 shrink-0 overflow-y-auto border-r border-border bg-surface-raised p-2"
		>
			<FileTree
				path="/"
				children={fsStore.children}
				expanded={fsStore.expanded}
				selectedPath={fsStore.selectedPath}
				ontoggledir={(path) => fsStore.toggleDirectory(path)}
				onselectfile={(path) => fsStore.selectFile(path)}
			/>
		</aside>

		<main class="flex-1 overflow-hidden bg-surface">
			<FilePreview file={fsStore.selectedFile} loading={fsStore.loading} />
		</main>
	</div>
</div>
