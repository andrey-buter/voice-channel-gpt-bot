import { AppDb } from '../db';
import {
  MessageSessionId,
  SessionMessage,
  SpeechToTextAction,
  TextToSpeechAction,
  ThreadConfig,
} from '../types/telegram.types';
import { log } from '../utils/log.utils';
import { AppTelegramContextAdapter } from './telegram-context-adapter';


export class TelegramSession {
  private readonly defaultId = 'direct-chat';

  constructor(private contextAdapter: AppTelegramContextAdapter) {
  }

  public updateMessages(allMessages: SessionMessage[]) {
    const replyMessageId = this.getSessionMessagesByReplyId();
    const session = this.contextAdapter.getSession();
    const userId = this.contextAdapter.getUserId();

    if (!session[replyMessageId]) {
      session[replyMessageId] = {};
    }

    session[replyMessageId].messages = allMessages;

    if (allMessages.length) {
      AppDb.writeThreadHistory(userId, replyMessageId, allMessages);
    } else {
      AppDb.deleteThreadHistory(userId, replyMessageId);
    }
  }

  public updateThreadConfig(newConfig: Partial<ThreadConfig>) {
    const replyMessageId = this.getSessionMessagesByReplyId();
    const session = this.contextAdapter.getSession();
    const userId = this.contextAdapter.getUserId();

    if (!session[replyMessageId]) {
      session[replyMessageId] = {};
    }

    session[replyMessageId].threadConfig = {
      speechToText: SpeechToTextAction.en,
      textToSpeech: TextToSpeechAction.noVoice,
      ...(session[replyMessageId].threadConfig || {}),
      ...newConfig,
    };

    AppDb.writeThreadConfig(userId, replyMessageId, session[replyMessageId].threadConfig);
  }

  public getMessages() {
    const replyMessageId = this.getSessionMessagesByReplyId();
    const userId = this.contextAdapter.getUserId();
    let history = this.contextAdapter.getSession()?.[replyMessageId]?.messages;

    if (!history) {
      history = AppDb.readThreadHistory(userId, replyMessageId);
    }

    return [...(history || [])];
  }

  public getThreadConfig() {
    const replyMessageId = this.getSessionMessagesByReplyId();
    const userId = this.contextAdapter.getUserId();
    let config = this.contextAdapter.getSession()?.[replyMessageId]?.threadConfig;

    log(this.contextAdapter.getSession())
    log(userId)
    log(replyMessageId)

    if (!config) {
      config = AppDb.readThreadConfig(userId, replyMessageId);
    }

    log(config);

    return { ...(config || {}) } as ThreadConfig;
  }

  private getSessionMessagesByReplyId(): MessageSessionId {
    return this.contextAdapter.getReplyToMessageId() ?? this.defaultId;
  }
}
