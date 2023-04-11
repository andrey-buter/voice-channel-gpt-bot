import { AppFileSystem } from './utils/file-system';
import { MessageSessionId, SessionMessage, ThreadConfig, ThreadFileType } from './types/telegram.types';
import { log } from './utils/log.utils';

/**
 * Thread data:
 * первоначально планировал делать путь к файлам db/{userId}/{threadId}/{fileName}.json
 * Но т.к. в трэде первым пишет сообщение с кнопками бот, чтобы сохранить конфиг,
 * то конфиг записывался под id бота, а не юзера. И юзер к информации бота доступа не имеет.
 * Потому принято решение НЕ использовать userId и завязываться только на thread id
 * с ограничением, что всегда есть только 2 участника бот и юзер.
 * Если вдруг появится 3й участник, то все настройки унаследуются/будут доступны и ему.
 */
export class AppDb {
	private static readonly dir = 'db';

	static writeThreadFile<T>(type: ThreadFileType, chatId: number, threadId: MessageSessionId, data: T) {
		const path = this.getThreadFilePath(type, chatId, threadId);
		log(path)

		AppFileSystem.writeJson(path, data);
	}

	static writeThreadConfig(chatId: number, threadId: MessageSessionId, config: ThreadConfig) {
		this.writeThreadFile('config', chatId, threadId, config);
	}

	static writeThreadHistory(chatId: number, threadId: MessageSessionId, messages: SessionMessage[]) {
		this.writeThreadFile('history', chatId, threadId, messages);
	}

	static deleteThreadHistory(chatId: number, threadId: MessageSessionId) {
		this.deleteThreadFile('history', chatId, threadId);
	}

	static deleteThreadConfig(chatId: number, threadId: MessageSessionId) {
		this.deleteThreadFile('config', chatId, threadId);
	}

	static deleteThreadFile(type: ThreadFileType, chatId: number, threadId: MessageSessionId) {
		const path = this.getThreadFilePath(type, chatId, threadId);

		AppFileSystem.deleteFileOrDir(path);
	}

	static deleteThread(chatId: number, threadId: MessageSessionId) {
		this.deleteThreadHistory(chatId, threadId);
		this.deleteThreadConfig(chatId, threadId);
	}

	private static getThreadFilePath(type: ThreadFileType, chatId: number, threadId: MessageSessionId) {
		return `${this.dir}/${chatId}/thread-${threadId}/${type}.json`;
	}

	static readThreadFile<T>(type: ThreadFileType, chatId: number, threadId: MessageSessionId) {
		const path = this.getThreadFilePath(type, chatId, threadId);
		log(path)
		return AppFileSystem.readJson<T>(path);
	}

	static readThreadHistory(chatId: number, threadId: MessageSessionId) {
		return this.readThreadFile<SessionMessage[]>('history', chatId, threadId);
	}

	static readThreadConfig(chatId: number, threadId: MessageSessionId) {
		return this.readThreadFile<ThreadConfig>('config', chatId, threadId);
	}
}
