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
import { convertOggToMp3, initConverter } from './utils';
import { MyContext, TelegramSession } from './telegram-session';

const download = require('download');


export class TelegramBotMessageHandler {
    private readonly bot = new Telegraf<MyContext>(ENV_VARS.TELEGRAM_TOKEN);
    private readonly openAi = new OpenAiEngine();
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

    private readonly mediaDir = 'tmp-media';
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
            await this.doForAllowedUserOrAction(ctx, () => this.reply(ctx, this.startMessage));
        });
        this.bot.command('teach', async (ctx: MyContext) => {
            await this.doForAllowedUserOrAction(ctx, () => this.reply(ctx, this.startTeach));
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

        console.log('Telegram is init!');
    }

    private async doForAllowedUserOrAction(ctx: MyContext, cb: (ctx: MyContext) => void) {
        // for main channel messages stream: don't react on a new post
        if (ctx.update.message?.forward_from_chat) {
            return;
        }

        if (!this.isAllowed(ctx)) {
            await this.reply(ctx, this.restrictedMessage);
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

                await this.reply(ctx, `[Voice message]: ${text}`);
                await this.fixMistakesReply(ctx, text);

                await this.chat(ctx, text);
            } catch (error) {
                console.log(error.response.data)
                await this.reply(ctx, `[ERROR:Transcription] ${error.response.data.error.message}`);
            }

            this.deleteFile(filePath);
            this.deleteFile(mp3filePath);
        });
    }

    private async fixMistakesReply(ctx: MyContext, text: string) {
        const mistakesResp = await this.openAi.chat([{
            content: `Fix the sentence mistakes: ${text}`,
            role: ChatCompletionRequestMessageRoleEnum.User,
        }]);

        const fixedText = mistakesResp.data.choices.map(choice => choice?.message?.content).join(" | ");

        await this.reply(ctx, `[Fixed message]: ${fixedText}`);
    }

    private async reply(ctx: MyContext, message: string) {
        // await ctx.replyWithMarkdownV2(this.escape(message), this.getReplyArgs(ctx));
        await ctx.reply(message, this.getReplyArgs(ctx));
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
            await this.reply(ctx, text);
        } catch (error) {
            console.error(error);
            await this.reply(ctx, `[ERROR:ChatGPT]: ${error.response?.data?.error?.message || error.response.description}`);
        }
    }
}

