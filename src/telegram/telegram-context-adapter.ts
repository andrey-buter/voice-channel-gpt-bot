import { AppContext } from '../types/telegram.types';

export class AppTelegramContextAdapter {
  constructor(public ctx: AppContext) {}

  get telegram() {
    return this.ctx.telegram;
  }

  getSession() {
    if (!this.ctx.session) {
      this.ctx.session = {};
    }

    return this.ctx.session;
  }

  getText() {
    return this.ctx.update.message.text;
  }

  getUserId() {
    const message = this.getMessageObj();

    return message.from.id;
  }

  getForwardFromChatId() {
    return this.ctx.update.message?.forward_from_chat;
  }

  getReplyToMessageId() {
    const message = this.getMessageObj() as any;

    return message?.reply_to_message?.message_id;
  }

  getVoiceFileId() {
    return this.ctx.update.message.voice.file_id;
  }

  getMessageObj() {
    return this.ctx.update.message || this.ctx.update.callback_query?.message;
  }

  getMessageId() {
    const message = this.getMessageObj();

    return message?.message_id;
  }

  getChatId() {
    const message = this.getMessageObj();
    return message?.chat.id;
  }
}
