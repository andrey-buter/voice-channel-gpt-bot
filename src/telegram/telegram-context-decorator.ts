import { Markup } from 'telegraf';
import { ExtraEditMessageText } from 'telegraf/typings/telegram-types';
import { ActionNamespaces, AppContext, AppLabels, TextToSpeechAction } from '../types/telegram.types';
import { AppTelegramContextAdapter } from './telegram-context-adapter';
import { TelegramSession } from './telegram-session';

export class AppTelegramContextDecorator {
  public readonly session: TelegramSession;
  public readonly adapter: AppTelegramContextAdapter;

  constructor(public ctx: AppContext) {
    this.adapter = new AppTelegramContextAdapter(ctx);
    this.session = new TelegramSession(this.adapter);
  }

  get telegram() {
    return this.adapter.telegram;
  }

  getForwardFromChatId() {
    return this.adapter.getForwardFromChatId();
  }

  getUserId() {
    return this.adapter.getUserId();
  }

  getReplyToMessageId() {
    return this.adapter.getReplyToMessageId();
  }

  getVoiceFileId() {
    return this.adapter.getVoiceFileId();
  }

  getText() {
    return this.adapter.getText();
  }

  // callback answer имеет таймаут и не живет вечно. Потому кнопки нельзя переназначать через какое-то время.
  async sendTextToSpeechQuestion() {
    const actionNamespace = ActionNamespaces.textToSpeech;

    return await this.ctx.sendMessage('What language should be voiced?', {
      reply_to_message_id: this.adapter.getMessageId(),
      ...Markup.inlineKeyboard([
        Markup.button.callback(AppLabels.en, `${actionNamespace}:${TextToSpeechAction.en}`),
        Markup.button.callback(AppLabels.ru, `${actionNamespace}:${TextToSpeechAction.ru}`),
        Markup.button.callback(AppLabels.noVoice, `${actionNamespace}:${TextToSpeechAction.noVoice}`),
      ]),
    });
  }

  async editMessage(text: string, extra: ExtraEditMessageText = {}) {
    return await this.ctx.telegram.editMessageText(
      this.adapter.getChatId(),
      this.adapter.getMessageId(),
      undefined,
      text,
      extra,
    );
  }

  async sendThreadConfig() {
    const config = this.session.getThreadConfig();

    await this.editMessage(`Thread settings: \nText-to-Speech: ${AppLabels[config.textToSpeech]}`);
  }
}
