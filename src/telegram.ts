import * as fs from 'fs';
import { ChatCompletionRequestMessageRoleEnum } from 'openai/dist/api';
import path from 'path';
import { Context, session, Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { FilteredContext } from 'telegraf/src/context';
import { ExtraReplyMessage } from 'telegraf/src/telegram-types';
import { Update } from 'typegram';
import { OpenAiEngine } from './open-ai';
import { ENV_VARS } from "./env";
import { convertOggToMp3, initConverter } from './mpeg.utils';
import { MyContext, TelegramSession } from './telegram-session';
import { TelegramReplyMessage } from './telegram.types';
import { TextToSpeechEngine } from './text-to-speech';

const download = require('download');

export class TelegramBotMessageHandler {
    private readonly bot = new Telegraf<MyContext>(ENV_VARS.TELEGRAM_TOKEN);
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
            await this.doForAllowedUserOrAction(ctx, () => this.replyLoading(ctx, this.startMessage));
        });
        this.bot.command('teach', async (ctx: MyContext) => {
            await this.doForAllowedUserOrAction(ctx, () => this.replyLoading(ctx, this.startTeach));
        });
        this.bot.command('reset', (ctx: MyContext) => this.session.updateMessages(ctx, []));

        // @ts-ignore
        this.bot.on(message('text'), async (ctx: MyContext) => {
            await this.doForAllowedUserOrAction(ctx, () => this.onText(ctx));
        });
        // @ts-ignore
        this.bot.on(message('voice'), async (ctx: MyContext) => {
            await this.doForAllowedUserOrAction(ctx, () => this.onVoice(ctx))
        });

        this.bot.launch();

        initConverter();

    }

    public testLog() {
        console.log('Telegram is init!');
    }

    private async doForAllowedUserOrAction(ctx: MyContext, cb: (ctx: MyContext) => void) {
        // for main channel messages stream: don't react on a new post
        if (ctx.update.message?.forward_from_chat) {
            return;
        }

        if (!this.isAllowed(ctx)) {
            await this.replyLoading(ctx, this.restrictedMessage);
            return;
        }

        await cb(ctx);
    }

    private isAllowed(ctx: MyContext) {
        return this.allowedUserIds.includes(ctx.update.message.from.id);
    }

    private getReplyArgs(ctx: MyContext): ExtraReplyMessage | undefined {
        const message = ctx.update.message;
        if (!message.reply_to_message) {
            return;
        }

        const args: ExtraReplyMessage = {
            reply_to_message_id: message.reply_to_message.message_id,
        }

        return args;
    }

    private async onVoice(ctx: any) {
        const loadingMessage = await this.replyLoading(ctx, `Transcribing...`);
        const fileLink = await this.bot.telegram.getFileLink(ctx.update.message.voice.file_id);

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

                await this.editLoadingReply(ctx, loadingMessage, `[Voice message]: ${text}`);
                await this.fixMistakesReply(ctx, text);

                await this.chat(ctx, text);
            } catch (error) {
                console.log(error.response.data);
                await this.editLoadingReply(ctx, loadingMessage, `[ERROR:Transcription] ${error.response.data.error.message}`);
            }

            this.deleteFile(filePath);
            this.deleteFile(mp3filePath);
        });
    }

    private async fixMistakesReply(ctx: MyContext, text: string) {
        const loadingMessage = await this.replyLoading(ctx, `Fixing...`);
        const mistakesResp = await this.openAi.chat([{
            content: `Fix the sentence mistakes: ${text}`,
            role: ChatCompletionRequestMessageRoleEnum.User,
        }]);

        const fixedText = mistakesResp.data.choices.map(choice => choice?.message?.content).join(" | ");

        await this.editLoadingReply(ctx, loadingMessage, `[Fixed message]: ${fixedText}`);
    }

    private async replyLoading(ctx: MyContext, message: string) {
        // await ctx.replyWithMarkdownV2(this.escape(message), this.getReplyArgs(ctx));
        return await ctx.reply(message, this.getReplyArgs(ctx)) as any as TelegramReplyMessage;
    }

    private async editLoadingReply(ctx: MyContext, message: TelegramReplyMessage, text: string) {
        await ctx.telegram.editMessageText(message.chat.id, message.message_id, undefined, text);
    }

    private escape(text: string) {
        // https://github.com/telegraf/telegraf/issues/1242
        const reservedCharacters = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!' ];

        return reservedCharacters.reduce((output, character) => {
            return output.replaceAll(character, `\\${character}`);
        }, text);
    }

    private deleteFile(filePath: string) {
        fs.unlink(filePath, (err) => {
            if (err) {
                throw err;
            }
        });
    }

    // private async onText(ctx: FilteredContext<MyContext, Extract<Update, 'Update.MessageUpdate'>>) {
    private async onText(ctx: MyContext) {
        await this.chat(ctx, ctx.update.message.text);
    }

    private async chat(ctx: any, userMessage: string) {
        const loadingMessage = await this.replyLoading(ctx, `Loading...`);
        const sessionMessages = this.session.getMessages(ctx);

        sessionMessages.push({
            content: userMessage,
            role: ChatCompletionRequestMessageRoleEnum.User,
        });

        try {
            const response = await this.openAi.chat(sessionMessages);
            const text = response.data.choices.map(choice => choice?.message?.content).join(" | ");

            sessionMessages.push({
                content: text,
                role: ChatCompletionRequestMessageRoleEnum.Assistant,
            });

            this.session.updateMessages(ctx, sessionMessages);
            await this.editLoadingReply(ctx, loadingMessage, text);
            const convertedFilePath = await this.tts.convert(text);

            if (convertedFilePath) {
                await this.sendAudio(ctx, convertedFilePath, text);
                this.deleteFile(convertedFilePath);
            }
        } catch (error) {
            console.error(error);
            const text = `[ERROR:ChatGPT]: ${error.response?.data?.error?.message || error.response.description}`;
            await this.editLoadingReply(ctx, loadingMessage, text);
        }
    }

    private async sendAudio(ctx: MyContext, filePath: string, text: string) {
        const readStream = fs.createReadStream(filePath);

        await ctx.sendAudio({ source: readStream, filename: this.cutAudioName(text) }, this.getReplyArgs(ctx));
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

