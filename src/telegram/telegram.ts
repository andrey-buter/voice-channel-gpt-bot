import download from 'download';
import * as fs from 'fs';
import * as https from 'https';
import { ChatCompletionRequestMessageRoleEnum } from 'openai/dist/api';
import path from 'path';
import { sanitize } from 'sanitize-filename-ts';
import { session, Telegraf } from 'telegraf';
import { message, editedMessage } from 'telegraf/filters';
import { ExtraReplyMessage } from 'telegraf/src/telegram-types';
import { URL } from 'url';
import { AppFileSystem } from '../utils/file-system';
import { OpenAiEngine } from '../integrations/open-ai';
import { ENV_VARS } from '../env';
import { log, logError } from '../utils/log.utils';
import { convertOggToMp3, initConverter } from '../utils/mpeg.utils';
import { AppTelegramContextDecorator } from './telegram-context-decorator';
import { ActionNamespaces, AppContext, TextToSpeechAction } from '../types/telegram.types';
import { TextToSpeechEngine } from '../integrations/text-to-speech';

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

    this.getCertificate();

    this.bot.use(session());
    // this.bot.use(async (ctx, next) => {
    //   await next();
    // });
    // this.bot.use(Telegraf.log());
    this.bot.settings(async ctx => {
      await ctx.telegram.callApi('setMyCommands', {
        commands: [
          {
            command: '/start',
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
      await this.doForAllowedUserOrAction(ctxDecorator, () => ctxDecorator.replyLoadingState(this.startMessage));
    });
    this.bot.command('teach', async (ctx: AppContext) => {
      const ctxDecorator = new AppTelegramContextDecorator(ctx);
      await this.doForAllowedUserOrAction(ctxDecorator, () => ctxDecorator.replyLoadingState(this.startTeach));
    });
    this.bot.command('reset', (ctx: AppContext) => {
      const ctxDecorator = new AppTelegramContextDecorator(ctx);
      ctxDecorator.session.updateMessages([]);
    });

    // @ts-ignore
    this.bot.on(editedMessage('text'), async (ctx: AppContext) => {
      const ctxDecorator = new AppTelegramContextDecorator(ctx);

      if (!this.isAllowed(ctxDecorator)) {
        return;
      }

      // for main channel messages stream (i.e. for thread): don't react on a new post
      if (ctxDecorator.isMainChatMessage()) {
        ctxDecorator.saveThreadTextToConfig();
        return;
      }
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
      await ctxDecorator.reply(this.restrictedMessage);
      return;
    }

    // for main channel messages stream (i.e. for thread): don't react on a new post
    if (ctxDecorator.isMainChatMessage()) {
      await ctxDecorator.sendFirstThreadMessage();
      return;
    }

    await cb(ctxDecorator);
  }

  private isAllowed(ctxDecorator: AppContextDecorator) {
    return this.allowedUserIds.includes(ctxDecorator.getUserId());
  }

  private async onVoice(ctxDecorator: AppContextDecorator) {
    const loadingMessage = await ctxDecorator.replyLoadingState(`Transcribing...`);
    let fileLink: URL;



    try {
      fileLink = await ctxDecorator.telegram.getFileLink(ctxDecorator.getVoiceFileId());
    } catch (e) {
      log('onVoice', e);
      return;
    }

    try {
      await download(fileLink.href, this.mediaDir, {
        cert: ''
      });
    } catch (e) {
      log('download', e);
      return;
    }
    const filename = path.parse(fileLink.pathname).base;
    const filePath = `./${this.mediaDir}/${filename}`;
    const mp3filePath = `./${this.mediaDir}/${filename}`.replace('.oga', '.mp3');

    convertOggToMp3(filePath, mp3filePath, async () => {
      const stream = fs.createReadStream(mp3filePath);
      try {
        // @ts-ignore
        const response = await this.openAi.transcript(stream);
        const text = response.data?.text || '';

        await ctxDecorator.editLoadingReply(loadingMessage, `[Voice message]: ${text}`);
        await this.fixMistakesReply(ctxDecorator, text);

        await this.chat(ctxDecorator, text);
      } catch (error) {
        log(error.response.data);
        await ctxDecorator.editLoadingReply(
          loadingMessage,
          `[ERROR:Transcription] ${error.response.data.error.message}`,
        );
      }

      this.deleteFile(filePath);
      this.deleteFile(mp3filePath);
    });
  }

  private async fixMistakesReply(ctxDecorator: AppContextDecorator, text: string) {
    const loadingMessage = await ctxDecorator.replyLoadingState(`Fixing...`);
    const mistakesResp = await this.openAi.chat([
      {
        content: `Fix the sentence mistakes: ${text}`,
        role: ChatCompletionRequestMessageRoleEnum.User,
      },
    ]);

    const fixedText = mistakesResp.data.choices.map(choice => choice?.message?.content).join(' | ');

    await ctxDecorator.editLoadingReply(loadingMessage, `[Fixed message]: ${fixedText}`);
  }

  private deleteFile(filePath: string) {
    AppFileSystem.deleteFileOrDir(filePath);
  }

  // private async onText(ctx: FilteredContext<MyContext, Extract<Update, 'Update.MessageUpdate'>>) {
  private async onText(ctxDecorator: AppContextDecorator) {
    await this.chat(ctxDecorator, ctxDecorator.getText());
  }

  private async chat(ctxDecorator: AppContextDecorator, userMessage: string) {
    const loadingMessage = await ctxDecorator.replyLoadingState(`Loading...`);
    const sessionMessages = ctxDecorator.session.getMessages();
    const config = ctxDecorator.session.getThreadConfig();

    sessionMessages.push({
      content: userMessage,
      role: ChatCompletionRequestMessageRoleEnum.User,
    });

    let text = '';

    try {
      // messages count add because of error: This model's maximum context length is 4097 tokens.
      const response = await this.openAi.chat([...sessionMessages].slice(-8));
      text = response.data.choices.map(choice => choice?.message?.content).join(' | ');

      sessionMessages.push({
        content: text,
        role: ChatCompletionRequestMessageRoleEnum.Assistant,
      });

      ctxDecorator.session.updateMessages(sessionMessages);
      await ctxDecorator.editLoadingReply(loadingMessage, text);
    } catch (error) {
      logError(error);
      const text = `[ERROR:ChatGPT]: ${
        error.response?.data?.error?.message || error.response?.description || error.response
      }`;
      await ctxDecorator.editLoadingReply(loadingMessage, text);
    }

    if (config.textToSpeech === TextToSpeechAction.noVoice) {
      return;
    }

    try {
      const convertedFilePath = await this.tts.convert(text, config.textToSpeech);

      if (convertedFilePath) {
        await ctxDecorator.sendAudio(convertedFilePath, text);
        this.deleteFile(convertedFilePath);
      }
    } catch (error) {
      log(error);
      await ctxDecorator.reply(`[Text To Speech Error]: ${error}`);
    }
  }

  private getCertificate() {
    const options = {
      host: 'google.com',
      port: 443,
      method: 'GET'
    };

    const req = https.request(options, function(res) {
      console.log((res.connection as any).getPeerCertificate());
    });

    req.end();
  }
}
