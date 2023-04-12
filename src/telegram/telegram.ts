import * as fs from 'fs';
import { ChatCompletionRequestMessageRoleEnum } from 'openai/dist/api';
import path from 'path';
import { sanitize } from 'sanitize-filename-ts';
import { Context, Markup, session, Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { FilteredContext } from 'telegraf/src/context';
import { ExtraReplyMessage } from 'telegraf/src/telegram-types';
import { Update } from 'typegram';
import { AppFileSystem } from '../utils/file-system';
import { OpenAiEngine } from '../integrations/open-ai';
import { ENV_VARS } from '../env';
import { log, logError } from '../utils/log.utils';
import { convertOggToMp3, initConverter } from '../utils/mpeg.utils';
import { AppTelegramContextDecorator } from './telegram-context-decorator';
import { ActionNamespaces, AppContext, TelegramReplyMessage, TextToSpeechAction } from '../types/telegram.types';
import { TextToSpeechEngine } from '../integrations/text-to-speech';

const download = require('download');

type AppContextDecorator = AppTelegramContextDecorator;

export class TelegramBotMessageHandler {
  private readonly bot = new Telegraf<AppContext>(ENV_VARS.TELEGRAM_TOKEN);
  private readonly openAi = new OpenAiEngine();
  private readonly tts = new TextToSpeechEngine();
  private readonly allowedUserIds = ENV_VARS.USER_IDS;

  private readonly restrictedMessage = 'Sorry. You are not registered. Have a nice day!';

  private readonly startMessage = `
Hello. If you want to start a free conversation, just send a text or a voice message.
If you want to start teaching, type /teach
If you want to reset the conversation, type /reset
`;

  private readonly startTeach = `Let's talk`;
  //     private readonly startTeach = `
  // Hi, I will suggest a topic for conversation, and you will ask a question on it.
  // Then check my answer for grammatical errors and offer the correct option.
  // Then you ask the next question. Let's go!
  // `;

  private readonly mediaDir = ENV_VARS.TMP_MEDIA_DIR;

  constructor() {
    // AppFileSystem.createFileOrDir(this.mediaDir);

    this.bot.use(session());
    // this.bot.use(async (ctx, next) => {
    //   await next();
    // });
    // this.bot.use(Telegraf.log());
    this.bot.settings(async ctx => {
      await ctx.telegram.callApi('setMyCommands', {
        commands: [
          {
            command: '/teach',
            description: 'Start conversation',
          },
          {
            command: '/reset',
            description: 'Reset session',
          },
        ],
      });
    });
    this.bot.start(async (ctx: any) => {
      const ctxDecorator = new AppTelegramContextDecorator(ctx);
      await this.doForAllowedUserOrAction(ctxDecorator, () => this.replyLoadingState(ctxDecorator, this.startMessage));
    });
    this.bot.command('teach', async (ctx: AppContext) => {
      const ctxDecorator = new AppTelegramContextDecorator(ctx);
      await this.doForAllowedUserOrAction(ctxDecorator, () => this.replyLoadingState(ctxDecorator, this.startTeach));
    });
    this.bot.command('reset', (ctx: AppContext) => {
      const ctxDecorator = new AppTelegramContextDecorator(ctx);
      ctxDecorator.session.updateMessages([]);
    });

    // @ts-ignore
    this.bot.on(message('text'), async (ctx: AppContext) => {
      const ctxDecorator = new AppTelegramContextDecorator(ctx);
      await this.doForAllowedUserOrAction(ctxDecorator, () => this.onText(ctxDecorator));
    });
    // @ts-ignore
    this.bot.on(message('voice'), async (ctx: AppContext) => {
      const ctxDecorator = new AppTelegramContextDecorator(ctx);
      await this.doForAllowedUserOrAction(ctxDecorator, () => this.onVoice(ctxDecorator));
    });

    // action structure [actionNamespace]:[actionName]
    this.bot.action(/^(.*):(.*)$/, async (ctx: AppContext & { match: RegExpExecArray }) => {
      const actionNamespace = ctx.match[1];
      const actionName = ctx.match[2];
      const ctxDecorator = new AppTelegramContextDecorator(ctx as unknown as AppContext);

      await ctx.answerCbQuery(`Saved`);

      if (actionNamespace === ActionNamespaces.textToSpeech) {
        ctxDecorator.session.updateThreadConfig({
          textToSpeech: actionName as TextToSpeechAction,
        });
        await ctxDecorator.sendThreadConfig();
      }
    });

    this.bot.launch();

    initConverter();
  }

  public testLog() {
    log('Telegram is init!');
  }

  private async doForAllowedUserOrAction(ctxDecorator: AppContextDecorator, cb: (ctx: AppContextDecorator) => void) {
    if (!this.isAllowed(ctxDecorator)) {
      await this.reply(ctxDecorator, this.restrictedMessage);
      return;
    }

    // for main channel messages stream: don't react on a new post
    if (ctxDecorator.getForwardFromChatId()) {
      await this.sendFirstThreadMessage(ctxDecorator);
      return;
    }

    await cb(ctxDecorator);
  }

  private async sendFirstThreadMessage(ctxDecorator: AppContextDecorator) {
    return await ctxDecorator.sendTextToSpeechQuestion();
  }

  private isAllowed(ctxDecorator: AppContextDecorator) {
    return this.allowedUserIds.includes(ctxDecorator.getUserId());
  }

  private getReplyArgs(ctxDecorator: AppContextDecorator): ExtraReplyMessage | undefined {
    const replayToMessageId = ctxDecorator.getReplyToMessageId();
    if (!replayToMessageId) {
      return;
    }

    const args: ExtraReplyMessage = {
      reply_to_message_id: replayToMessageId,
    };

    return args;
  }

  private async onVoice(ctxDecorator: AppContextDecorator) {
    const loadingMessage = await this.replyLoadingState(ctxDecorator, `Transcribing...`);
    const fileLink = await this.bot.telegram.getFileLink(ctxDecorator.getVoiceFileId());
    const config = ctxDecorator.session.getThreadConfig();

    log(config);

    await download(fileLink.href, this.mediaDir);
    const filename = path.parse(fileLink.pathname).base;
    const filePath = `./${this.mediaDir}/${filename}`;
    const mp3filePath = `./${this.mediaDir}/${filename}`.replace('.oga', '.mp3');

    convertOggToMp3(filePath, mp3filePath, async () => {
      const stream = fs.createReadStream(mp3filePath);
      try {
        // @ts-ignore
        const response = await this.openAi.transcript(stream);
        const text = response.data?.text || '';

        await this.editLoadingReply(ctxDecorator, loadingMessage, `[Voice message]: ${text}`);
        await this.fixMistakesReply(ctxDecorator, text);

        await this.chat(ctxDecorator, text);
      } catch (error) {
        log(error.response.data);
        await this.editLoadingReply(
          ctxDecorator,
          loadingMessage,
          `[ERROR:Transcription] ${error.response.data.error.message}`,
        );
      }

      this.deleteFile(filePath);
      this.deleteFile(mp3filePath);
    });
  }

  private async fixMistakesReply(ctxDecorator: AppContextDecorator, text: string) {
    const loadingMessage = await this.replyLoadingState(ctxDecorator, `Fixing...`);
    const mistakesResp = await this.openAi.chat([
      {
        content: `Fix the sentence mistakes: ${text}`,
        role: ChatCompletionRequestMessageRoleEnum.User,
      },
    ]);

    const fixedText = mistakesResp.data.choices.map(choice => choice?.message?.content).join(' | ');

    await this.editLoadingReply(ctxDecorator, loadingMessage, `[Fixed message]: ${fixedText}`);
  }

  private async replyLoadingState(ctxDecorator: AppContextDecorator, message: string) {
    return await this.reply(ctxDecorator, message);
  }

  private async reply(ctxDecorator: AppContextDecorator, message: string) {
    // await ctx.replyWithMarkdownV2(this.escape(message), this.getReplyArgs(ctx));
    return (await ctxDecorator.ctx.reply(message, this.getReplyArgs(ctxDecorator))) as any as TelegramReplyMessage;
  }

  private async editLoadingReply(
    ctxDecorator: AppContextDecorator,
    editMessageObj: TelegramReplyMessage,
    text: string,
  ) {
    await ctxDecorator.telegram.editMessageText(editMessageObj.chat.id, editMessageObj.message_id, undefined, text);
  }

  private async deleteMessage(ctxDecorator: AppContextDecorator, messageId: number) {
    await ctxDecorator.ctx.deleteMessage(messageId);
  }

  private deleteFile(filePath: string) {
    AppFileSystem.deleteFileOrDir(filePath);
  }

  // private async onText(ctx: FilteredContext<MyContext, Extract<Update, 'Update.MessageUpdate'>>) {
  private async onText(ctxDecorator: AppContextDecorator) {
    await this.chat(ctxDecorator, ctxDecorator.getText());
  }

  private async chat(ctxDecorator: AppContextDecorator, userMessage: string) {
    const loadingMessage = await this.replyLoadingState(ctxDecorator, `Loading...`);
    const sessionMessages = ctxDecorator.session.getMessages();
    const config = ctxDecorator.session.getThreadConfig();

    sessionMessages.push({
      content: userMessage,
      role: ChatCompletionRequestMessageRoleEnum.User,
    });

    let text = '';

    try {
      const response = await this.openAi.chat(sessionMessages);
      text = response.data.choices.map(choice => choice?.message?.content).join(' | ');

      sessionMessages.push({
        content: text,
        role: ChatCompletionRequestMessageRoleEnum.Assistant,
      });

      ctxDecorator.session.updateMessages(sessionMessages);
      await this.editLoadingReply(ctxDecorator, loadingMessage, text);
    } catch (error) {
      logError(error);
      const text = `[ERROR:ChatGPT]: ${
        error.response?.data?.error?.message || error.response?.description || error.response
      }`;
      await this.editLoadingReply(ctxDecorator, loadingMessage, text);
    }

    if (config.textToSpeech === TextToSpeechAction.noVoice) {
      return;
    }

    try {
      const convertedFilePath = await this.tts.convert(text, config.textToSpeech);

      if (convertedFilePath) {
        await this.sendAudio(ctxDecorator, convertedFilePath, text);
        this.deleteFile(convertedFilePath);
      }
    } catch (error) {
      log(error);
      await this.reply(ctxDecorator, `[Text To Speech Error]: ${error}`);
    }
  }

  private async sendAudio(ctxDecorator: AppContextDecorator, filePath: string, text: string) {
    const readStream = fs.createReadStream(filePath);

    await ctxDecorator.ctx.sendAudio({ source: readStream, filename: sanitize(text) }, this.getReplyArgs(ctxDecorator));
  }
}
