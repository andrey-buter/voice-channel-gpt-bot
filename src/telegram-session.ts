import { AppDb } from './db';
import { AppTelegramContextAdapter } from './telegram-context-adapter';
import { MessageSessionId, SessionMessage, ThreadConfig } from './types/telegram.types';
import { log } from './utils/log.utils';

type AppContextAdaptor = AppTelegramContextAdapter;

// https://github.com/feathers-studio/telegraf-docs/blob/master/examples/session-bot.ts
export interface SessionData {
	messages?: Record<MessageSessionId, SessionMessage[]>;
	threadConfig?: ThreadConfig;
}

export class TelegramSession {
	private readonly defaultId = 'direct-chat';

	public updateMessages(ctxAdaptor: AppContextAdaptor, allMessages: SessionMessage[]) {
		const replyMessageId = this.getSessionMessagesByReplyId(ctxAdaptor);
		const session = ctxAdaptor.getSession();
		const userId = ctxAdaptor.getUserId();

		if (!session.messages) {
			session.messages = {}
		}

		session.messages[replyMessageId] = allMessages;

		if (allMessages.length) {
			AppDb.writeThreadHistory(userId, replyMessageId, allMessages);
		} else {
			AppDb.deleteThreadHistory(userId, replyMessageId);
		}
	}

	public updateThreadConfig(ctxAdaptor: AppContextAdaptor, newConfig: ThreadConfig) {
		const replyMessageId = this.getSessionMessagesByReplyId(ctxAdaptor);
		const session = ctxAdaptor.getSession();
		const userId = ctxAdaptor.getUserId();

		if (!session.threadConfig) {
			session.threadConfig = {}
		}

		session.threadConfig[replyMessageId] = newConfig;

		if (Object.values(newConfig).length) {
			AppDb.writeThreadConfig(userId, replyMessageId, newConfig);
		} else {
			AppDb.deleteThreadConfig(userId, replyMessageId);
		}
	}

	public getMessages(ctxAdaptor: AppContextAdaptor) {
		const replyMessageId = this.getSessionMessagesByReplyId(ctxAdaptor);
		const userId = ctxAdaptor.getUserId();
		let history = ctxAdaptor.getSession()?.messages?.[replyMessageId];

		if (!history) {
			history = AppDb.readThreadHistory(userId, replyMessageId);
		}

		return [...(history || [])];
	}

	public getThreadConfig(ctxAdaptor: AppContextAdaptor) {
		const replyMessageId = this.getSessionMessagesByReplyId(ctxAdaptor);
		const userId = ctxAdaptor.getUserId();
		let config = ctxAdaptor.getSession()?.threadConfig?.[replyMessageId];

		if (!config) {
			config = AppDb.readThreadConfig(userId, replyMessageId);
		}

		return { ...(config || {}) };
	}

	private getSessionMessagesByReplyId(ctxAdaptor: AppContextAdaptor): MessageSessionId {
		return ctxAdaptor.getReplyToMessageId() ?? this.defaultId;
	}
}
