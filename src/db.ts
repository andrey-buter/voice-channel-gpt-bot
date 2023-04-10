import { AppFileSystem } from './file-system';
import { MessageSessionId, SessionMessage, ThreadConfig, ThreadFileType } from './types/telegram.types';

export class AppDb {
	private static readonly dir = 'db';

	static writeThreadFile<T>(type: ThreadFileType, userId: number, threadId: MessageSessionId, data: T) {
		const path = this.getThreadFilePath(type, userId, threadId);

		AppFileSystem.writeJson(path, data);
	}

	static writeThreadConfig(userId: number, threadId: MessageSessionId, config: ThreadConfig) {
		this.writeThreadFile('config', userId, threadId, config);
	}

	static writeThreadHistory(userId: number, threadId: MessageSessionId, messages: SessionMessage[]) {
		this.writeThreadFile('history', userId, threadId, messages);
	}

	static deleteThreadHistory(userId: number, threadId: MessageSessionId) {
		this.deleteThreadFile('history', userId, threadId);
	}

	static deleteThreadConfig(userId: number, threadId: MessageSessionId) {
		this.deleteThreadFile('config', userId, threadId);
	}

	static deleteThreadFile(type: ThreadFileType, userId: number, threadId: MessageSessionId) {
		const path = this.getThreadFilePath(type, userId, threadId);

		AppFileSystem.deleteFileOrDir(path);
	}

	static deleteThread(userId: number, threadId: MessageSessionId) {
		this.deleteThreadHistory(userId, threadId);
		this.deleteThreadConfig(userId, threadId);
	}

	private static getThreadFilePath(type: ThreadFileType, userId: number, threadId: MessageSessionId) {
		return `${this.dir}/${userId}/thread-${threadId}/${type}.json`;
	}

	static readThreadFile<T>(type: ThreadFileType, userId: number, threadId: MessageSessionId) {
		const path = this.getThreadFilePath(type, userId, threadId);
		return AppFileSystem.readJson<T>(path);
	}

	static readThreadHistory(userId: number, threadId: MessageSessionId) {
		return this.readThreadFile<SessionMessage[]>('history', userId, threadId);
	}

	static readThreadConfig(userId: number, threadId: MessageSessionId) {
		return this.readThreadFile<ThreadConfig>('config', userId, threadId);
	}
}
