import { AppFileSystem } from './file-system';
import { MessageSessionId, SessionMessage } from './telegram.types';

export class AppDb {
	private static readonly dir = 'db';

	static writeHistory(userId: number, threadId: MessageSessionId, data: SessionMessage[]) {
		const path = this.getHistoryFilePath(userId, threadId);

		AppFileSystem.writeJson(path, data);
	}

	static deleteHistory(userId: number, threadId: MessageSessionId) {
		const path = this.getHistoryFilePath(userId, threadId);

		AppFileSystem.deleteFileOrDir(path);
	}

	private static getHistoryFilePath(userId: number, threadId: MessageSessionId) {
		return `${this.dir}/${userId}/${threadId}.json`;
	}

	static readHistory(userId: number, threadId: MessageSessionId) {
		const path = this.getHistoryFilePath(userId, threadId);
		return AppFileSystem.readJson<SessionMessage[]>(path);
	}
}
