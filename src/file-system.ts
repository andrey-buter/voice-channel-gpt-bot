import fs from 'fs';
import { ensureFileSync, removeSync, writeJsonSync, readJsonSync } from 'fs-extra';

export class AppFileSystem {
	static deleteFileOrDir(path: string) {
		removeSync(path);
	}

	static writeFile(path: string, data: string) {
		ensureFileSync(path);

		fs.writeFileSync(path, data);
	}

	static writeJson(path: string, data: unknown) {
		writeJsonSync(path, data);
	}

	static readJson<T = unknown>(path: string) {
		ensureFileSync(path);
		const data = this.readFile(path);

		if (!data) {
			this.deleteFileOrDir(path);
			return null;
		}

		return JSON.parse(data) as T;
	}

	static readFile(path: string) {
		ensureFileSync(path);
		return fs.readFileSync(path, {
			encoding: 'utf-8'
		});
	}
}
