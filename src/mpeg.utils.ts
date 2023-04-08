

import fs from 'fs';
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path
const ffmpeg = require('fluent-ffmpeg')

export function initConverter() {
	ffmpeg.setFfmpegPath(ffmpegPath);
}

export function convertOggToMp3(oggFilePath: string, mp3filePath: string, onSuccess: () => void) {
	const outStream = fs.createWriteStream(mp3filePath);

	ffmpeg()
		.input(oggFilePath)
		.audioQuality(96)
		.toFormat("mp3")
		.on('error', error => console.log(`Encoding Error: ${error.message}`))
		.on('exit', () => console.log('Audio recorder exited'))
		.on('close', () => console.log('Audio recorder closed'))
		.on('end', async () => {
			console.log('Audio Transcoding succeeded !');

			await onSuccess();
		})
		.pipe(outStream, { end: true });
}
