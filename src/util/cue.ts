export type CueItem = {
    start: number;
    end: number;
    text: string;
    speaker?: number;
    misc?: boolean;
};

export function mergeCues(cues: CueItem[]) {
    // Merge cues so that they all have full sentences
    // e.g.
    // 00:00:00.000 --> 00:00:01.000
    // Hello
    // 00:00:01.000 --> 00:00:02.000
    // World

    // becomes
    // 00:00:00.000 --> 00:00:02.000
    // Hello World

    const mergedCues: CueItem[] = [];

    for (const cue of cues) {
        const lastMergedCue = mergedCues[mergedCues.length - 1];

        // Check if current cue doesn't start with a capital letter
        // If it doesn't, then it's probably a continuation of the previous cue
        if (cue.text[0].toUpperCase() !== cue.text[0]) {
            if (lastMergedCue) {
                lastMergedCue.end = cue.end;
                lastMergedCue.text += ' ' + cue.text;
            }
            continue;
        }
        mergedCues.push({ ...cue });
    }

    return mergedCues;
}

export function loadJson(jsonString: string): CueItem[] {
    const jsonData = JSON.parse(jsonString);
    if (jsonData.language) {
        // New format generated from transcripting script
        const segmentedData: {
            language: string;
            segments: {
                start: number;
                end: number;
                text: string;
                speakers: {
                    speaker: string,
                    talk_fraction: number
                }[];
            }[];
        } = jsonData;

        const cues: CueItem[] = [];
        for (const segment of segmentedData.segments) {
            const cue: CueItem = {
                start: segment.start * 1000,
                end: segment.end * 1000,
                text: segment.text
            };

            if (segment.speakers.length > 0) {
                cue.speaker = (+segment.speakers[0].speaker) + 1;
            }

            cues.push(cue);
        }

        return cues;
    }
    return jsonData;
}

export async function saveToJsonFile(cues: CueItem[], fileHandle: FileSystemFileHandle) {
    const json = JSON.stringify(cues, null, 4);
    const blob = new Blob([json], { type: 'application/json' });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
}

export async function saveAsInterviewText(cues: CueItem[], actorNames: string[], fileHandle: FileSystemFileHandle) {
    let text = "";
    let currentSpeaker = 0;

    for (const cue of cues) {
        if (cue.misc) {
            continue;
        }

        if (cue.speaker && cue.speaker != currentSpeaker) {
            currentSpeaker = cue.speaker;
            text += `\n\n${actorNames[currentSpeaker - 1]}: `;
        }

        text += cue.text + " ";
    }

    const blob = new Blob([text], { type: 'text/plain' });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
}

export function loadWebVTT(webVTTString: string) {
    const lines = webVTTString.split('\n');

    const webVTTTimeStampRegex =
        /^((?<fh>\d{2}):)?(?<fm>\d{2}):(?<fs>\d{2})\.(?<fms>\d{3}) --> ((?<th>\d{2}):)?(?<tm>\d{2}):(?<ts>\d{2})\.(?<tms>\d{3})$/;

    const cues: CueItem[] = [];

    let currentCue: CueItem = {
        start: 0,
        end: 0,
        text: ''
    };

    // eslint-disable-next-line prefer-const
    for (let [i, line] of lines.entries()) {
        line = line.trim();
        if (i == 0) {
            if (line != 'WEBVTT') throw new Error('Invalid WebVTT file');
            continue;
        }

        if (line == '') {
            continue;
        }

        const match = line.match(webVTTTimeStampRegex);
        if (match) {
            if (currentCue.text) {
                cues.push(currentCue);
                currentCue = {
                    start: 0,
                    end: 0,
                    text: ''
                };
            }

            const { fh, fm, fs, fms, th, tm, ts, tms } = match.groups as any;
            const start =
                (fh ? parseInt(fh) * 60 * 60 * 1000 : 0) +
                parseInt(fm) * 60 * 1000 +
                parseInt(fs) * 1000 +
                parseInt(fms);
            const end =
                (th ? parseInt(th) * 60 * 60 * 1000 : 0) +
                parseInt(tm) * 60 * 1000 +
                parseInt(ts) * 1000 +
                parseInt(tms);
            currentCue.start = start;
            currentCue.end = end;
            continue;
        }

        currentCue.text += line;
    }

    if (currentCue.text) {
        cues.push(currentCue);
    }

    return cues;
}