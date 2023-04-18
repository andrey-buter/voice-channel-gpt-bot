import fs from 'fs';
import https from 'https';

// https://sebhastian.com/nodejs-download-file/
export async function downloadFile(url: string, path: string) {
	return new Promise<void>(resolve => {
		https.get(url, (res) => {
			const writeStream = fs.createWriteStream(path);

			res.pipe(writeStream);

			writeStream.on("finish", () => {
				writeStream.close();
				console.log("Download Completed");
				resolve();
			});
		});
	})
}
