import { ChatCompletionRequestMessage } from 'openai/api';
import { Context } from 'telegraf';

export type SessionMessage = ChatCompletionRequestMessage;

// Define your own context type
export interface MyContext extends Context<any> {
	session?: SessionData;
}

type MessageSessionId = string | number;

// https://github.com/feathers-studio/telegraf-docs/blob/master/examples/session-bot.ts
export interface SessionData {
	messages?: Record<MessageSessionId, SessionMessage[]>;
}

export class TelegramSession {
	private readonly defaultId = 'direct-chat';

	public updateMessages(ctx: MyContext, allMessages: SessionMessage[]) {
		const id = this.getSessionMessagesByReplyId(ctx);

		if (!ctx.session) {
			ctx.session = {
				messages: {},
			}
		}

		ctx.session.messages[id] = allMessages;
	}

	public getMessages(ctx: MyContext) {
		const id = this.getSessionMessagesByReplyId(ctx);

		return [...(ctx?.session?.messages?.[id] || [])];
	}

	private getSessionMessagesByReplyId(ctx: MyContext): MessageSessionId {
		const message = ctx.update.message;
		return message.reply_to_message ? message.reply_to_message.message_id : this.defaultId;
	}
}
