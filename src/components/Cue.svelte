<script lang="ts">
	import { mediaTime } from 'src/store';
	import type { CueItem } from 'src/util/cue';

	export let cue: CueItem;

	function msToTimeString(ms: number) {
		return `${Math.floor(ms / 1000 / 60 / 60)
			.toString()
			.padStart(2, '0')}:${Math.floor((ms / 1000 / 60) % 60)
			.toString()
			.padStart(2, '0')}:${Math.floor((ms / 1000) % 60)
			.toString()
			.padStart(2, '0')}.${Math.floor(ms % 1000)
			.toString()
			.padStart(3, '0')}`;
	}

	function isActive(curTime: number) {
		return curTime >= Math.floor(cue.start / 1000) && curTime < Math.floor(cue.end / 1000);
	}

	let textArea: HTMLTextAreaElement | undefined;
	mediaTime.subscribe((time) => {
		if (isActive(time)) {
			textArea?.focus();
		}
	});

	export function resizeTextArea() {
		if (!textArea) {
			return;
		}
		textArea.style.height = '0';
		textArea.style.height = textArea.scrollHeight + 'px';
	}

	function onActiveCue() {
		const isAlreadyActive = isActive($mediaTime);
		mediaTime.set(Math.floor(cue.start / 1000));
		if (textArea) {
			textArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
			if (!isAlreadyActive) {
				// move cursor to start, remove selection
				textArea.selectionStart = 0;
				textArea.selectionEnd = 0;
			}
		}
	}

	function onCommand(e: KeyboardEvent) {
		if (!isActive($mediaTime)) {
			return;
		}

		if (e.code.startsWith('Numpad') && e.code.length === 7) {
			const num = parseInt(e.code[6]);
			if (num == 0) {
				cue.speaker = undefined;
			} else {
				cue.speaker = num;
			}
			e.preventDefault();
		}

		// Ctrl + Number = Do the sme as above
		if (e.ctrlKey && e.code.startsWith('Digit') && e.code.length === 6) {
			const num = parseInt(e.code[5]);
			if (num == 0) {
				cue.speaker = undefined;
			} else {
				cue.speaker = num;
			}
			e.preventDefault();
		}

		// Numpad - = Mark this cue as misc
		if (e.code === 'NumpadSubtract' || (e.ctrlKey && e.code == 'Minus')) {
			cue.misc = !cue.misc;
			e.preventDefault();
		}

		// Ctrl + Shift + Space = Set this cue as active
		if (e.ctrlKey && e.shiftKey && e.code === 'Space') {
			onActiveCue();
			e.preventDefault();
		}
	}
</script>

<svelte:window on:keydown={onCommand} />

<div
	class="py-1 px-4 flex text-lg"
	class:bg-green-100={isActive($mediaTime)}
	class:text-gray-500={cue.misc}
	class:line-through={cue.misc}
>
	<div class="px-2">
		<span>{msToTimeString(cue.start)}</span>
	</div>
	<div class="px-2">
		<span>{msToTimeString(cue.end)}</span>
	</div>
	<div class="px-2 font-bold w-10">{cue.speaker ?? ''}</div>
	<div class="grow">
		<textarea
			bind:this={textArea}
			on:focus={onActiveCue}
			class="w-full p-1 max-w-prose"
			on:input={resizeTextArea}
			bind:value={cue.text}
		/>
	</div>
</div>
