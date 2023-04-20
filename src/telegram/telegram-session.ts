import { AppDb } from '../db';
import {
  MessageSessionId,
  SessionMessage,
  TextToSpeechAction,
  ThreadConfig,
  ThreadSessionData,
} from '../types/telegram.types';
import { log } from '../utils/log.utils';
import { AppTelegramContextAdapter } from './telegram-context-adapter';

export class TelegramSession {
  private readonly defaultId = 'direct-chat';

  constructor(private contextAdapter: AppTelegramContextAdapter) {}

  private updateCurrentThreadSession(
    updater: (threadSession: ThreadSessionData) => ThreadSessionData,
  ): ThreadSessionData {
    const replyMessageId = this.getThreadId();
    const session = this.contextAdapter.getSession();

    if (!session[replyMessageId]) {
      session[replyMessageId] = {};
    }

    session[replyMessageId] = updater(session[replyMessageId]);

    return session[replyMessageId];
  }

  public updateMessages(allMessages: SessionMessage[]) {
    const replyMessageId = this.getThreadId();
    const chatId = this.contextAdapter.getChatId();

    this.updateCurrentThreadSession(threadSession => {
      threadSession.messages = allMessages;
      return threadSession;
    });

    if (allMessages.length) {
      AppDb.writeThreadHistory(chatId, replyMessageId, allMessages);
    } else {
      AppDb.deleteThreadHistory(chatId, replyMessageId);
    }
  }

  public updateThreadConfig(newConfig: Partial<ThreadConfig>) {
    const replyMessageId = this.getThreadId();
    const chatId = this.contextAdapter.getChatId();

    const threadSession = this.updateCurrentThreadSession(threadSession => {
      threadSession.threadConfig = {
        textToSpeech: TextToSpeechAction.noVoice,
        threatName: '',
        audioRepeatingModeEnabled: false,
        ...(threadSession.threadConfig || {}),
        ...newConfig,
      };
      return threadSession;
    });

    AppDb.writeThreadConfig(chatId, replyMessageId, threadSession.threadConfig);
  }

  public getMessages() {
    const replyMessageId = this.getThreadId();
    const chatId = this.contextAdapter.getChatId();
    let history = this.contextAdapter.getSession()?.[replyMessageId]?.messages;

    if (!history) {
      history = AppDb.readThreadHistory(chatId, replyMessageId);
    }

    return [...(history || [])];
  }

  public getThreadConfig() {
    const replyMessageId = this.getThreadId();
    const chatId = this.contextAdapter.getChatId();
    const config = AppDb.readThreadConfig(chatId, replyMessageId);

    // for some cases, session is different
    // - User send message (with session-1)
    // - bot replies with button
    // - user clicks to button
    // - bot replies the message in the thread (for some reason it is session-2)
    // See Mistakes reply button

    // let config = this.contextAdapter.getSession()?.[replyMessageId]?.threadConfig;
    // if (!config) {
    //   config = AppDb.readThreadConfig(chatId, replyMessageId);
    // }

    return { ...(config || {}) } as ThreadConfig;
  }

  private getThreadId(): MessageSessionId {
    return this.contextAdapter.getThreadMessageId() || this.defaultId;
  }

  public disableAudioRepeatingMode() {
    this.updateThreadConfig({ audioRepeatingModeEnabled: false });
  }

  public enableAudioRepeatingMode() {
    this.updateThreadConfig({ audioRepeatingModeEnabled: true });
  }

  public isAudioRepeatingModeEnabled() {
    return !!this.getThreadConfig().audioRepeatingModeEnabled;
  }
}
