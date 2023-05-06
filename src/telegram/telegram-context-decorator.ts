import fs from 'fs';
import { sanitize } from 'sanitize-filename-ts';
import { Markup } from 'telegraf';
import { ExtraReplyMessage } from 'telegraf/src/telegram-types';
import { ExtraEditMessageText } from 'telegraf/typings/telegram-types';
import {
  ActionNamespaces,
  AppContext,
  AppLabels,
  ReplyMistakeAction,
  ReplyMistakesLabel, SpeechToTextAction,
  TelegramReplyMessage,
  TextToSpeechAction,
} from '../types/telegram.types';
import { log } from '../utils/log.utils';
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

  isMainChatMessage() {
    return this.adapter.isMainChatMessage();
  }

  async sendSpeechToTextQuestion() {
  	const actionNamespace = ActionNamespaces.speechToText;

  	return await this.ctx.sendMessage('What language should be recognized?', {
  		reply_to_message_id: this.adapter.getMessageId(),
  		...Markup.inlineKeyboard([
  			Markup.button.callback(AppLabels.en, `${actionNamespace}:${SpeechToTextAction.en}`),
  			Markup.button.callback(AppLabels.ru, `${actionNamespace}:${SpeechToTextAction.ru}`),
  		]),
  	});
  }

  // callback answer имеет таймаут и не живет вечно. Потому кнопки нельзя переназначать через какое-то время.
  async sendTextToSpeechQuestion() {
    const actionNamespace = ActionNamespaces.textToSpeech;

    return await this.editMessage('What language should be voiced?', {
      // reply_to_message_id: this.adapter.getMessageId(),
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

    await this.editMessage(`Thread settings: \nSpeech-to-Text: ${AppLabels[config.speechToText]}\nText-to-Speech: ${AppLabels[config.textToSpeech]}`);
  }

  public async editLoadingReply(editMessageObj: TelegramReplyMessage, text: string, extra?: ExtraEditMessageText) {
    await this.telegram.editMessageText(editMessageObj.chat.id, editMessageObj.message_id, undefined, text, extra);
  }

  public async reply(message: string) {
    // await ctx.replyWithMarkdownV2(this.escape(message), this.getReplyArgs(ctx));
    try {
      return (await this.ctx.reply(message, this.getReplyArgs())) as any as TelegramReplyMessage;
    } catch (e) {
      log('reply', e);
    }
  }

  private getReplyArgs(): ExtraReplyMessage | undefined {
    const replayToMessageId = this.getReplyToMessageId();
    if (!replayToMessageId) {
      return;
    }

    const args: ExtraReplyMessage = {
      reply_to_message_id: replayToMessageId,
    };

    return args;
  }

  public async deleteMessage(messageId: number) {
    await this.ctx.deleteMessage(messageId);
  }

  public async replyLoadingState(message: string) {
    return await this.reply(message);
  }

  public async sendAudio(filePath: string, text: string) {
    const readStream = fs.createReadStream(filePath);

    try {
      await this.ctx.sendAudio({ source: readStream, filename: sanitize(text) }, this.getReplyArgs());
    } catch (e) {
      log('sendAudio', e);
    }
  }

  public async sendFirstThreadMessage() {
    this.saveThreadTextToConfig();
    return await this.sendSpeechToTextQuestion();
  }

  public saveThreadTextToConfig() {
    this.session.updateThreadConfig({
      threatName: this.adapter.getText(),
    });
  }

  public async fixMistakesReply(editMessageObj: TelegramReplyMessage, text: string) {
    let extra: ExtraEditMessageText = {};
    const correctMessageWordsRegExp = /(?<=\b(correct|no mistakes)\b\s+)\w+/gi;

    if (!correctMessageWordsRegExp.test(text)) {
      extra = Markup.inlineKeyboard([
        Markup.button.callback(
          ReplyMistakesLabel.recordCorrectVersion,
          `${ActionNamespaces.replyMistake}:${ReplyMistakeAction.action}`,
        ),
      ]);
    }

    await this.editLoadingReply(editMessageObj, `[${ReplyMistakesLabel.fixedMessage}]: ${text}`, extra);
  }

  public getCommandAttributes() {
    const commands = this.getText().split(' ');
    commands.shift();
    return commands;
  }
}
