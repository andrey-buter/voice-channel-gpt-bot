"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramBotMessageHandler = void 0;
const fs = __importStar(require("fs"));
const api_1 = require("openai/dist/api");
const path_1 = __importDefault(require("path"));
const telegraf_1 = require("telegraf");
const filters_1 = require("telegraf/filters");
const open_ai_1 = require("./open-ai");
const env_1 = require("./env");
const utils_1 = require("./utils");
const telegram_session_1 = require("./telegram-session");
const download = require('download');
class TelegramBotMessageHandler {
    constructor() {
        this.bot = new telegraf_1.Telegraf(env_1.ENV_VARS.TELEGRAM_TOKEN);
        this.openAi = new open_ai_1.OpenAiEngine();
        this.allowedUserIds = env_1.ENV_VARS.USER_IDS;
        this.restrictedMessage = 'Sorry. You are not registered. Have a nice day!';
        this.startMessage = `
Hello. If you want to start a free conversation, just send a text or a voice message.
If you want to start teaching, type /teach
If you want to reset the conversation, type /reset
`;
        this.startTeach = `Let's talk`;
        //     private readonly startTeach = `
        // Hi, I will suggest a topic for conversation, and you will ask a question on it.
        // Then check my answer for grammatical errors and offer the correct option.
        // Then you ask the next question. Let's go!
        // `;
        this.mediaDir = 'tmp-media';
        this.session = new telegram_session_1.TelegramSession();
        this.bot.use((0, telegraf_1.session)());
        this.bot.settings((ctx) => __awaiter(this, void 0, void 0, function* () {
            yield ctx.telegram.setMyCommands([
                {
                    command: "/teach",
                    description: "Start conversation",
                },
                {
                    command: "/reset",
                    description: "Reset session",
                },
            ]);
        }));
        this.bot.start((ctx) => __awaiter(this, void 0, void 0, function* () {
            yield this.doForAllowedUserOrAction(ctx, () => this.reply(ctx, this.startMessage));
        }));
        this.bot.command('teach', (ctx) => __awaiter(this, void 0, void 0, function* () {
            yield this.doForAllowedUserOrAction(ctx, () => this.reply(ctx, this.startTeach));
        }));
        this.bot.command('reset', (ctx) => this.session.updateMessages(ctx, []));
        // @ts-ignore
        this.bot.on((0, filters_1.message)('text'), (ctx) => __awaiter(this, void 0, void 0, function* () {
            yield this.doForAllowedUserOrAction(ctx, () => this.onText(ctx));
        }));
        // @ts-ignore
        this.bot.on((0, filters_1.message)('voice'), (ctx) => __awaiter(this, void 0, void 0, function* () {
            yield this.doForAllowedUserOrAction(ctx, () => this.onVoice(ctx));
        }));
        this.bot.launch();
        (0, utils_1.initConverter)();
    }
    doForAllowedUserOrAction(ctx, cb) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // for main channel messages stream: don't react on a new post
            if ((_a = ctx.update.message) === null || _a === void 0 ? void 0 : _a.forward_from_chat) {
                return;
            }
            if (!this.isAllowed(ctx)) {
                yield this.reply(ctx, this.restrictedMessage);
                return;
            }
            yield cb(ctx);
        });
    }
    isAllowed(ctx) {
        return this.allowedUserIds.includes(ctx.update.message.from.id);
    }
    getReplyArgs(ctx) {
        const message = ctx.update.message;
        if (!message.reply_to_message) {
            return;
        }
        const args = {
            reply_to_message_id: message.reply_to_message.message_id,
        };
        return args;
    }
    onVoice(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const fileLink = yield this.bot.telegram.getFileLink(ctx.update.message.voice.file_id);
            yield download(fileLink.href, this.mediaDir);
            const filename = path_1.default.parse(fileLink.pathname).base;
            const filePath = `./${this.mediaDir}/${filename}`;
            const mp3filePath = `./${this.mediaDir}/${filename}`.replace('.oga', '.mp3');
            (0, utils_1.convertOggToMp3)(filePath, mp3filePath, () => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const stream = fs.createReadStream(mp3filePath);
                try {
                    // @ts-ignore
                    const response = yield this.openAi.transcript(stream);
                    const text = ((_a = response.data) === null || _a === void 0 ? void 0 : _a.text) || '';
                    yield this.reply(ctx, `[Voice message]: ${text}`);
                    yield this.fixMistakesReply(ctx, text);
                    yield this.chat(ctx, text);
                }
                catch (error) {
                    console.log(error.response.data);
                    yield this.reply(ctx, `[ERROR:Transcription] ${error.response.data.error.message}`);
                }
                this.deleteFile(filePath);
                this.deleteFile(mp3filePath);
            }));
        });
    }
    fixMistakesReply(ctx, text) {
        return __awaiter(this, void 0, void 0, function* () {
            const mistakesResp = yield this.openAi.chat([{
                    content: `Fix the sentence mistakes: ${text}`,
                    role: api_1.ChatCompletionRequestMessageRoleEnum.User,
                }]);
            const fixedText = mistakesResp.data.choices.map(choice => { var _a; return (_a = choice === null || choice === void 0 ? void 0 : choice.message) === null || _a === void 0 ? void 0 : _a.content; }).join(" | ");
            yield this.reply(ctx, `[Fixed message]: ${fixedText}`);
        });
    }
    reply(ctx, message) {
        return __awaiter(this, void 0, void 0, function* () {
            // await ctx.replyWithMarkdownV2(this.escape(message), this.getReplyArgs(ctx));
            yield ctx.reply(this.escape(message), this.getReplyArgs(ctx));
        });
    }
    escape(text) {
        // https://github.com/telegraf/telegraf/issues/1242
        const reservedCharacters = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
        return reservedCharacters.reduce((output, character) => {
            return output.replaceAll(character, `\\${character}`);
        }, text);
    }
    deleteFile(filePath) {
        fs.unlink(filePath, (err) => {
            if (err) {
                throw err;
            }
        });
    }
    // private async onText(ctx: FilteredContext<MyContext, Extract<Update, 'Update.MessageUpdate'>>) {
    onText(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.chat(ctx, ctx.update.message.text);
        });
    }
    chat(ctx, userMessage) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            const sessionMessages = this.session.getMessages(ctx);
            sessionMessages.push({
                content: userMessage,
                role: api_1.ChatCompletionRequestMessageRoleEnum.User,
            });
            try {
                const response = yield this.openAi.chat(sessionMessages);
                const text = response.data.choices.map(choice => { var _a; return (_a = choice === null || choice === void 0 ? void 0 : choice.message) === null || _a === void 0 ? void 0 : _a.content; }).join(" | ");
                sessionMessages.push({
                    content: text,
                    role: api_1.ChatCompletionRequestMessageRoleEnum.Assistant,
                });
                this.session.updateMessages(ctx, sessionMessages);
                yield this.reply(ctx, text);
            }
            catch (error) {
                console.error(error);
                yield this.reply(ctx, `[ERROR:ChatGPT]: ${((_c = (_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) === null || _c === void 0 ? void 0 : _c.message) || error.response.description}`);
            }
        });
    }
}
exports.TelegramBotMessageHandler = TelegramBotMessageHandler;
