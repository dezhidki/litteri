<script lang="ts">
	import Cue from 'src/components/Cue.svelte';
	import {
		loadJson,
		loadWebVTT,
		mergeCues,
		saveAsInterviewText,
		saveToJsonFile,
		type CueItem
	} from 'src/util/cue';
	import { each } from 'svelte/internal';
	import { mediaTime } from '../store';

	let videoFiles: FileList | null = null;
	let videoUrl: string | null = null;
	let textFiles: FileList | null = null;
	let allCues: CueItem[] = [];
	let mediaPaused = true;
	let cueElements: Record<number, Cue> = {};

	let actorNames: string[] = Array.from({ length: 9 }, (_) => '');

	$: {
		if (videoFiles && videoFiles.length > 0) {
			const file = videoFiles[0];
			const url = URL.createObjectURL(file);
			videoUrl = url;
		}

		if (textFiles && textFiles.length > 0) {
			const file = textFiles[0];
			const reader = new FileReader();
			reader.onload = (e) => {
				if (!e.target) return;
				const text = e.target.result;
				if (typeof text === 'string') {
					const ext = file.name.split('.').pop();
					if (ext === 'json') {
						allCues = loadJson(text);
					} else if (ext === 'vtt') {
						allCues = loadWebVTT(text);
					}
				}
			};
			reader.readAsText(file);

			textFiles = null;
		}
	}

	function doMergeCues() {
		allCues = mergeCues(allCues);
	}

	function resizeTextboxes() {
		for (const cue of Object.values(cueElements)) {
			cue?.resizeTextArea();
		}
	}

	async function exportAsInterview() {
		// Open file picker
		const file = await window.showSaveFilePicker({
			types: [
				{
					description: 'Text',
					accept: {
						'text/plain': ['.txt']
					}
				}
			]
		});

		await saveAsInterviewText(allCues, actorNames, file);
	}

	let saveFileHandle: FileSystemFileHandle | null = null;
	let saved = false;

	async function saveAsJson() {
		if (!saveFileHandle) {
			// open file picker
			const file = await window.showSaveFilePicker({
				types: [
					{
						description: 'JSON',
						accept: {
							'text/json': ['.json']
						}
					}
				]
			});
			saveFileHandle = file;
		}

		await saveToJsonFile(allCues, saveFileHandle);
		saved = true;
		setTimeout(() => {
			saved = false;
		}, 2000);
	}

	function onCommand(e: KeyboardEvent) {
		// Ctrl + Spacebar = play/pause
		if (e.ctrlKey && !e.shiftKey && e.code === 'Space') {
			e.preventDefault();
			mediaPaused = !mediaPaused;
		}

		// Ctrl + S = save
		if (e.ctrlKey && !e.shiftKey && e.code === 'KeyS') {
			e.preventDefault();
			saveAsJson();
		}
	}
</script>

<svelte:window on:keydown={onCommand} />

<div class="body">
	<div class="loader p-2">
		<label for="videoFile">Video: </label>
		<input
			type="file"
			accept="video/*,audio/*"
			id="videoFile"
			name="videoFile"
			bind:files={videoFiles}
		/>
		<label for="textFile">Subtitles: </label>
		<input type="file" accept=".vtt,.json" id="textFile" name="textFile" bind:files={textFiles} />
		<button class="bg-green-500 p-1 rounded-sm hover:bg-green-700 text-white" on:click={saveAsJson}
			>Save (JSON)</button
		>
		{#if saved}
			<span>Saved!</span>
		{/if}
	</div>
	<div class="buttons p-2">
		<button class="bg-slate-300 p-1 rounded-sm hover:bg-slate-400" on:click={doMergeCues}
			>Merge Cues</button
		>
		<button class="bg-slate-300 p-1 rounded-sm hover:bg-slate-400" on:click={resizeTextboxes}
			>Resize all textboxes</button
		>
		<button class="bg-slate-300 p-1 rounded-sm hover:bg-slate-400" on:click={exportAsInterview}
			>Export interview</button
		>
	</div>
	<div class="names">
		{#each actorNames as name, i}
			<div>
				<label for={`actor${i + 1}`}>Actor {i + 1}: </label>
				<input
					type="text"
					id={`actor${i + 1}`}
					name={`actor${i + 1}`}
					bind:value={actorNames[i]}
					placeholder={`Actor ${i + 1}`}
				/>
			</div>
		{/each}
	</div>
	<div class="video">
		<video src={videoUrl} controls bind:currentTime={$mediaTime} bind:paused={mediaPaused}>
			<track kind="captions" />
		</video>
	</div>
	<div class="main">
		{#if allCues.length > 0}
			{#each allCues as cue (cue.start)}
				<Cue bind:this={cueElements[cue.start]} {cue} />
			{/each}
		{:else}
			<div>No cues</div>
		{/if}
	</div>
</div>

<style>
	.body {
		@apply max-h-screen;
		display: grid;
		grid-template-columns: auto auto 1fr;
		grid-template-rows: auto auto 1fr;
		grid-template-areas:
			'loader names .'
			'buttons names video'
			'main main main';
	}

	.names {
		grid-area: names;
	}

	.loader {
		grid-area: loader;
		display: flex;
	}

	.buttons {
		grid-area: buttons;
	}

	.video {
		grid-area: video;
	}

	.main {
		@apply overflow-y-auto;

		grid-area: main;
		display: flex;
		flex-direction: column;
	}
</style>
