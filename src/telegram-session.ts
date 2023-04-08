import { Context } from 'telegraf';
import { AppDb } from './db';
import { AppTelegramContextAdapter } from './telegram-context-adapter';
import { MessageSessionId, SessionMessage } from './telegram.types';

type AppContextAdaptor = AppTelegramContextAdapter;

// https://github.com/feathers-studio/telegraf-docs/blob/master/examples/session-bot.ts
export interface SessionData {
	messages?: Record<MessageSessionId, SessionMessage[]>;
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
			AppDb.writeHistory(userId, replyMessageId, allMessages);
		} else {
			AppDb.deleteHistory(userId, replyMessageId);
		}
	}

	public getMessages(ctxAdaptor: AppContextAdaptor) {
		const replyMessageId = this.getSessionMessagesByReplyId(ctxAdaptor);
		const userId = ctxAdaptor.getUserId();
		let history = ctxAdaptor.getSession()?.messages?.[replyMessageId];

		if (!history) {
			history = AppDb.readHistory(userId, replyMessageId);
		}

		console.log(history)

		return [...(history || [])];
	}

	private getSessionMessagesByReplyId(ctxAdaptor: AppContextAdaptor): MessageSessionId {
		return ctxAdaptor.getReplyToMessageId() ?? this.defaultId;
	}
}
