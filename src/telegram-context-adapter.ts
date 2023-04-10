import { AppContext } from './types/telegram.types';

export class AppTelegramContextAdapter {
	constructor(public ctx: AppContext) {
	}

	getSession() {
		if (!this.ctx.session) {
			this.ctx.session = {};
		}

		return this.ctx.session;
	}

	get telegram() {
		return this.ctx.telegram;
	}

	getText() {
		return this.ctx.update.message.text
	}

	getUserId() {
		return this.ctx.update.message.from.id;
	}

	getForwardFromChatId() {
		return this.ctx.update.message?.forward_from_chat;
	}

	getReplyToMessageId() {
		return this.ctx.update.message?.reply_to_message?.message_id;
	}

	getVoiceFileId() {
		return this.ctx.update.message.voice.file_id;
	}

	getMessageId() {
		return this.ctx.update.message.message_id;
	}
}

