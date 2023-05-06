import { AppContext } from '../types/telegram.types';
import { log } from '../utils/log.utils';

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

  getText(): string {
    const message = this.getMessageObj() as any;

    return message?.text || '';
  }

  getUserId() {
    const message = this.getMessageObj();

    return message.from.id;
  }

  getForwardFromChatId() {
    const message = this.getMessageObj() as any;

    return message?.forward_from_chat;
  }

  getReplyToMessageId() {
    const message = this.getMessageObj() as any;

    return message?.reply_to_message?.message_id;
  }

  getVoiceFileId() {
    const message = this.getMessageObj() as any;

    return message.voice.file_id;
  }

  getMessageObj() {
    const update = this.ctx.update;
    return update.message || update.edited_message || update.callback_query?.message;
  }

  getMessageId() {
    const message = this.getMessageObj();

    return message?.message_id;
  }

  getChatId() {
    const message = this.getMessageObj();
    return message?.chat.id;
  }

  isMainChatMessage() {
    return !!this.getForwardFromChatId();
  }

  getThreadMessageId() {
    const message = this.getMessageObj() as any;

    if (message.message_thread_id) {
      return message.message_thread_id;
    }

    if (this.isMainChatMessage()) {
      return message.message_id;
    }

    // непосредственный чат между юзером и ботом не имеет forward_from_chat объект
    return null;
  }
}
