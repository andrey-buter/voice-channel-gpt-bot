import * as fs from 'fs';
import { ChatCompletionRequestMessageRoleEnum } from 'openai/dist/api';
import path from 'path';
import { Context, session, Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { FilteredContext } from 'telegraf/src/context';
import { ExtraReplyMessage } from 'telegraf/src/telegram-types';
import { Update } from 'typegram';
import { AppFileSystem } from './file-system';
import { OpenAiEngine } from './open-ai';
import { ENV_VARS } from "./env";
import { convertOggToMp3, initConverter } from './mpeg.utils';
import { AppTelegramContextAdapter } from './telegram-context-adapter';
import { TelegramSession } from './telegram-session';
import { AppContext, TelegramReplyMessage } from './telegram.types';
import { TextToSpeechEngine } from './text-to-speech';

const download = require('download');

type AppContextAdaptor = AppTelegramContextAdapter;

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
    private readonly session = new TelegramSession();

    constructor() {
        this.bot.use(session());
        this.bot.settings(async ctx => {
            await ctx.telegram.setMyCommands([
                {
                    command: "/teach",
                    description: "Start conversation",
                },
                {
                    command: "/reset",
                    description: "Reset session",
                },
            ]);
        });
        this.bot.start(async (ctx: any) => {
            const ctxAdapter = new AppTelegramContextAdapter(ctx);
            await this.doForAllowedUserOrAction(ctxAdapter, () => this.replyLoading(ctxAdapter, this.startMessage));
        });
        this.bot.command('teach', async (ctx: AppContext) => {
            const ctxAdapter = new AppTelegramContextAdapter(ctx);
            await this.doForAllowedUserOrAction(ctxAdapter, () => this.replyLoading(ctxAdapter, this.startTeach));
        });
        this.bot.command('reset', (ctx: AppContext) => {
            const ctxAdapter = new AppTelegramContextAdapter(ctx);
            this.session.updateMessages(ctxAdapter, []);
        });

        // @ts-ignore
        this.bot.on(message('text'), async (ctx: AppContext) => {
            const ctxAdapter = new AppTelegramContextAdapter(ctx);
            await this.doForAllowedUserOrAction(ctxAdapter, () => this.onText(ctxAdapter));
        });
        // @ts-ignore
        this.bot.on(message('voice'), async (ctx: AppContext) => {
            const ctxAdapter = new AppTelegramContextAdapter(ctx);
            await this.doForAllowedUserOrAction(ctxAdapter, () => this.onVoice(ctxAdapter))
        });

        this.bot.launch();

        initConverter();

    }

    public testLog() {
        console.log('Telegram is init!');
    }

    private async doForAllowedUserOrAction(ctxAdaptor: AppContextAdaptor, cb: (ctx: AppContextAdaptor) => void) {
        // for main channel messages stream: don't react on a new post
        if (ctxAdaptor.getForwardFromChatId()) {
            return;
        }

        if (!this.isAllowed(ctxAdaptor)) {
            await this.replyLoading(ctxAdaptor, this.restrictedMessage);
            return;
        }

        await cb(ctxAdaptor);
    }

    private isAllowed(ctxAdaptor: AppContextAdaptor) {
        return this.allowedUserIds.includes(ctxAdaptor.getUserId());
    }

    private getReplyArgs(ctxAdaptor: AppContextAdaptor): ExtraReplyMessage | undefined {
        const replayToMessageId = ctxAdaptor.getReplyToMessageId();
        if (!replayToMessageId) {
            return;
        }

        const args: ExtraReplyMessage = {
            reply_to_message_id: replayToMessageId,
        }

        return args;
    }

    private async onVoice(ctxAdaptor: AppContextAdaptor) {
        const loadingMessage = await this.replyLoading(ctxAdaptor, `Transcribing...`);
        const fileLink = await this.bot.telegram.getFileLink(ctxAdaptor.getVoiceFileId());

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

                await this.editLoadingReply(ctxAdaptor, loadingMessage, `[Voice message]: ${text}`);
                await this.fixMistakesReply(ctxAdaptor, text);

                await this.chat(ctxAdaptor, text);
            } catch (error) {
                console.log(error.response.data);
                await this.editLoadingReply(ctxAdaptor, loadingMessage, `[ERROR:Transcription] ${error.response.data.error.message}`);
            }

            this.deleteFile(filePath);
            this.deleteFile(mp3filePath);
        });
    }

    private async fixMistakesReply(ctxAdaptor: AppContextAdaptor, text: string) {
        const loadingMessage = await this.replyLoading(ctxAdaptor, `Fixing...`);
        const mistakesResp = await this.openAi.chat([{
            content: `Fix the sentence mistakes: ${text}`,
            role: ChatCompletionRequestMessageRoleEnum.User,
        }]);

        const fixedText = mistakesResp.data.choices.map(choice => choice?.message?.content).join(" | ");

        await this.editLoadingReply(ctxAdaptor, loadingMessage, `[Fixed message]: ${fixedText}`);
    }

    private async replyLoading(ctxAdaptor: AppContextAdaptor, message: string) {
        return await this.reply(ctxAdaptor, message);
    }

    private async reply(ctxAdaptor: AppContextAdaptor, message: string) {
        // await ctx.replyWithMarkdownV2(this.escape(message), this.getReplyArgs(ctx));
        return await ctxAdaptor.ctx.reply(message, this.getReplyArgs(ctxAdaptor)) as any as TelegramReplyMessage;
    }

    private async editLoadingReply(ctxAdaptor: AppContextAdaptor, message: TelegramReplyMessage, text: string) {
        await ctxAdaptor.telegram.editMessageText(message.chat.id, message.message_id, undefined, text);
    }

    private escape(text: string) {
        // https://github.com/telegraf/telegraf/issues/1242
        const reservedCharacters = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!' ];

        return reservedCharacters.reduce((output, character) => {
            return output.replaceAll(character, `\\${character}`);
        }, text);
    }

    private deleteFile(filePath: string) {
        AppFileSystem.deleteFileOrDir(filePath);
    }

    // private async onText(ctx: FilteredContext<MyContext, Extract<Update, 'Update.MessageUpdate'>>) {
    private async onText(ctxAdaptor: AppContextAdaptor) {
        await this.chat(ctxAdaptor, ctxAdaptor.getText());
    }

    private async chat(ctxAdaptor: AppContextAdaptor, userMessage: string) {
        const loadingMessage = await this.replyLoading(ctxAdaptor, `Loading...`);
        const sessionMessages = this.session.getMessages(ctxAdaptor);

        sessionMessages.push({
            content: userMessage,
            role: ChatCompletionRequestMessageRoleEnum.User,
        });

        let text = '';

        try {
            const response = await this.openAi.chat(sessionMessages);
            text = response.data.choices.map(choice => choice?.message?.content).join(" | ");

            sessionMessages.push({
                content: text,
                role: ChatCompletionRequestMessageRoleEnum.Assistant,
            });

            this.session.updateMessages(ctxAdaptor, sessionMessages);
            await this.editLoadingReply(ctxAdaptor, loadingMessage, text);
        } catch (error) {
            console.error(error);
            const text = `[ERROR:ChatGPT]: ${error.response?.data?.error?.message || error.response?.description || error.response}`;
            await this.editLoadingReply(ctxAdaptor, loadingMessage, text);
        }

        try {
            const convertedFilePath = await this.tts.convert(text);

            if (convertedFilePath) {
                await this.sendAudio(ctxAdaptor, convertedFilePath, text);
                this.deleteFile(convertedFilePath);
            }
        } catch (error) {
            console.log(error);
            await this.reply(ctxAdaptor, `[Text To Speech Error]: ${error}`);
        }
    }

    private async sendAudio(ctxAdaptor: AppContextAdaptor, filePath: string, text: string) {
        const readStream = fs.createReadStream(filePath);

        await ctxAdaptor.ctx.sendAudio({ source: readStream, filename: this.cutAudioName(text) }, this.getReplyArgs(ctxAdaptor));
    }

    private cutAudioName(text: string) {
        if (this.isFileNameValid(text)) {
            return text.slice(0, 64);
        }

        return 'invalid name';
    }

    private isFileNameValid(fileName: string) {
        // https://stackoverflow.com/a/11101624
        const rg1=/^[^\\/:\*\?"<>\|]+$/; // forbidden characters \ / : * ? " < > |
        const rg2=/^\./; // cannot start with dot (.)
        const rg3=/^(nul|prn|con|lpt[0-9]|com[0-9])(\.|$)/i; // forbidden file names
        return function isValid(fname){
            return rg1.test(fname)&&!rg2.test(fname)&&!rg3.test(fname);
        }
    }
}
