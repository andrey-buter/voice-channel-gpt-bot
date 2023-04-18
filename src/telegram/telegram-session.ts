import { AppDb } from '../db';
import { MessageSessionId, SessionMessage, TextToSpeechAction, ThreadConfig } from '../types/telegram.types';
import { log } from '../utils/log.utils';
import { AppTelegramContextAdapter } from './telegram-context-adapter';

export class TelegramSession {
  private readonly defaultId = 'direct-chat';

  constructor(private contextAdapter: AppTelegramContextAdapter) {}

  public updateMessages(allMessages: SessionMessage[]) {
    const replyMessageId = this.getSessionMessagesByReplyId();
    const session = this.contextAdapter.getSession();
    const chatId = this.contextAdapter.getChatId();

    if (!session[replyMessageId]) {
      session[replyMessageId] = {};
    }

    session[replyMessageId].messages = allMessages;

    if (allMessages.length) {
      AppDb.writeThreadHistory(chatId, replyMessageId, allMessages);
    } else {
      AppDb.deleteThreadHistory(chatId, replyMessageId);
    }
  }

  public updateThreadConfig(newConfig: Partial<ThreadConfig>) {
    const replyMessageId = this.getSessionMessagesByReplyId();
    const session = this.contextAdapter.getSession();
    const chatId = this.contextAdapter.getChatId();

    if (!session[replyMessageId]) {
      session[replyMessageId] = {};
    }

    session[replyMessageId].threadConfig = {
      textToSpeech: TextToSpeechAction.noVoice,
      threatName: '',
      ...(session[replyMessageId].threadConfig || {}),
      ...newConfig,
    };

    AppDb.writeThreadConfig(chatId, replyMessageId, session[replyMessageId].threadConfig);
  }

  // messages count add because of error: This model's maximum context length is 4097 tokens.
  public getMessages(messagesCount: number = 0) {
    const replyMessageId = this.getSessionMessagesByReplyId();
    const chatId = this.contextAdapter.getChatId();
    let history = this.contextAdapter.getSession()?.[replyMessageId]?.messages;

    if (!history) {
      history = AppDb.readThreadHistory(chatId, replyMessageId);
    }

    const messages = [...(history || [])];

    if (messagesCount === 0) {
      return messages;
    }

    return [...messages].splice(messagesCount * -1);
  }

  public getThreadConfig() {
    const replyMessageId = this.getSessionMessagesByReplyId();
    const chatId = this.contextAdapter.getChatId();
    let config = this.contextAdapter.getSession()?.[replyMessageId]?.threadConfig;

    if (!config) {
      config = AppDb.readThreadConfig(chatId, replyMessageId);
    }

    return { ...(config || {}) } as ThreadConfig;
  }

  private getSessionMessagesByReplyId(): MessageSessionId {
    return this.contextAdapter.getThreadMessageId() || this.defaultId;
  }
}
