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
const sanitize_filename_ts_1 = require("sanitize-filename-ts");
const telegraf_1 = require("telegraf");
const filters_1 = require("telegraf/filters");
const file_system_1 = require("./file-system");
const open_ai_1 = require("./open-ai");
const env_1 = require("./env");
const log_utils_1 = require("./utils/log.utils");
const mpeg_utils_1 = require("./utils/mpeg.utils");
const telegram_context_adapter_1 = require("./telegram-context-adapter");
const telegram_session_1 = require("./telegram-session");
const text_to_speech_1 = require("./text-to-speech");
const download = require('download');
class TelegramBotMessageHandler {
    constructor() {
        // AppFileSystem.createFileOrDir(this.mediaDir);
        this.bot = new telegraf_1.Telegraf(env_1.ENV_VARS.TELEGRAM_TOKEN);
        this.openAi = new open_ai_1.OpenAiEngine();
        this.tts = new text_to_speech_1.TextToSpeechEngine();
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
        this.mediaDir = env_1.ENV_VARS.TMP_MEDIA_DIR;
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
            const ctxAdapter = new telegram_context_adapter_1.AppTelegramContextAdapter(ctx);
            yield this.doForAllowedUserOrAction(ctxAdapter, () => this.replyLoadingState(ctxAdapter, this.startMessage));
        }));
        this.bot.command('teach', (ctx) => __awaiter(this, void 0, void 0, function* () {
            const ctxAdapter = new telegram_context_adapter_1.AppTelegramContextAdapter(ctx);
            yield this.doForAllowedUserOrAction(ctxAdapter, () => this.replyLoadingState(ctxAdapter, this.startTeach));
        }));
        this.bot.command('reset', (ctx) => {
            const ctxAdapter = new telegram_context_adapter_1.AppTelegramContextAdapter(ctx);
            this.session.updateMessages(ctxAdapter, []);
        });
        // @ts-ignore
        this.bot.on((0, filters_1.message)('text'), (ctx) => __awaiter(this, void 0, void 0, function* () {
            const ctxAdapter = new telegram_context_adapter_1.AppTelegramContextAdapter(ctx);
            yield this.doForAllowedUserOrAction(ctxAdapter, () => this.onText(ctxAdapter));
        }));
        // @ts-ignore
        this.bot.on((0, filters_1.message)('voice'), (ctx) => __awaiter(this, void 0, void 0, function* () {
            const ctxAdapter = new telegram_context_adapter_1.AppTelegramContextAdapter(ctx);
            yield this.doForAllowedUserOrAction(ctxAdapter, () => this.onVoice(ctxAdapter));
        }));
        this.bot.action(/.+/, (ctx) => {
            (0, log_utils_1.log)(ctx.update.callback_query);
            (0, log_utils_1.log)(ctx.match);
            return ctx.answerCbQuery(`Oh, ${ctx.match[0]}! Great choice`);
        });
        this.bot.launch();
        (0, mpeg_utils_1.initConverter)();
    }
    testLog() {
        (0, log_utils_1.log)('Telegram is init!');
    }
    doForAllowedUserOrAction(ctxAdaptor, cb) {
        return __awaiter(this, void 0, void 0, function* () {
            // log(await ctxAdaptor.ctx.chat);
            // console.log(ctxAdaptor.ctx.update)
            if (!this.isAllowed(ctxAdaptor)) {
                yield this.reply(ctxAdaptor, this.restrictedMessage);
                return;
            }
            // for main channel messages stream: don't react on a new post
            if (ctxAdaptor.getForwardFromChatId()) {
                // await this.sendFirstThreadMessage(ctxAdaptor);
                return;
            }
            yield cb(ctxAdaptor);
        });
    }
    sendFirstThreadMessage(ctxAdaptor) {
        return __awaiter(this, void 0, void 0, function* () {
            yield ctxAdaptor.ctx.sendMessage('What language should be recognized?', Object.assign({ reply_to_message_id: ctxAdaptor.getMessageId() }, telegraf_1.Markup.inlineKeyboard([
                telegraf_1.Markup.button.callback('English', 'recognition:en'),
                telegraf_1.Markup.button.callback('Russian', 'recognition:ru'),
                telegraf_1.Markup.button.callback('Skip', 'recognition:nothing'),
            ])));
        });
    }
    isAllowed(ctxAdaptor) {
        return this.allowedUserIds.includes(ctxAdaptor.getUserId());
    }
    getReplyArgs(ctxAdaptor) {
        const replayToMessageId = ctxAdaptor.getReplyToMessageId();
        if (!replayToMessageId) {
            return;
        }
        const args = {
            reply_to_message_id: replayToMessageId,
        };
        return args;
    }
    onVoice(ctxAdaptor) {
        return __awaiter(this, void 0, void 0, function* () {
            const loadingMessage = yield this.replyLoadingState(ctxAdaptor, `Transcribing...`);
            const fileLink = yield this.bot.telegram.getFileLink(ctxAdaptor.getVoiceFileId());
            yield download(fileLink.href, this.mediaDir);
            const filename = path_1.default.parse(fileLink.pathname).base;
            const filePath = `./${this.mediaDir}/${filename}`;
            const mp3filePath = `./${this.mediaDir}/${filename}`.replace('.oga', '.mp3');
            (0, mpeg_utils_1.convertOggToMp3)(filePath, mp3filePath, () => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const stream = fs.createReadStream(mp3filePath);
                try {
                    // @ts-ignore
                    const response = yield this.openAi.transcript(stream);
                    const text = ((_a = response.data) === null || _a === void 0 ? void 0 : _a.text) || '';
                    yield this.editLoadingReply(ctxAdaptor, loadingMessage, `[Voice message]: ${text}`);
                    yield this.fixMistakesReply(ctxAdaptor, text);
                    yield this.chat(ctxAdaptor, text);
                }
                catch (error) {
                    (0, log_utils_1.log)(error.response.data);
                    yield this.editLoadingReply(ctxAdaptor, loadingMessage, `[ERROR:Transcription] ${error.response.data.error.message}`);
                }
                this.deleteFile(filePath);
                this.deleteFile(mp3filePath);
            }));
        });
    }
    fixMistakesReply(ctxAdaptor, text) {
        return __awaiter(this, void 0, void 0, function* () {
            const loadingMessage = yield this.replyLoadingState(ctxAdaptor, `Fixing...`);
            const mistakesResp = yield this.openAi.chat([{
                    content: `Fix the sentence mistakes: ${text}`,
                    role: api_1.ChatCompletionRequestMessageRoleEnum.User,
                }]);
            const fixedText = mistakesResp.data.choices.map(choice => { var _a; return (_a = choice === null || choice === void 0 ? void 0 : choice.message) === null || _a === void 0 ? void 0 : _a.content; }).join(" | ");
            yield this.editLoadingReply(ctxAdaptor, loadingMessage, `[Fixed message]: ${fixedText}`);
        });
    }
    replyLoadingState(ctxAdaptor, message) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.reply(ctxAdaptor, message);
        });
    }
    reply(ctxAdaptor, message) {
        return __awaiter(this, void 0, void 0, function* () {
            // await ctx.replyWithMarkdownV2(this.escape(message), this.getReplyArgs(ctx));
            return yield ctxAdaptor.ctx.reply(message, this.getReplyArgs(ctxAdaptor));
        });
    }
    editLoadingReply(ctxAdaptor, editMessageObj, text) {
        return __awaiter(this, void 0, void 0, function* () {
            yield ctxAdaptor.telegram.editMessageText(editMessageObj.chat.id, editMessageObj.message_id, undefined, text);
        });
    }
    deleteMessage(ctxAdaptor, messageId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield ctxAdaptor.ctx.deleteMessage(messageId);
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
        file_system_1.AppFileSystem.deleteFileOrDir(filePath);
    }
    // private async onText(ctx: FilteredContext<MyContext, Extract<Update, 'Update.MessageUpdate'>>) {
    onText(ctxAdaptor) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.chat(ctxAdaptor, ctxAdaptor.getText());
        });
    }
    chat(ctxAdaptor, userMessage) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            const loadingMessage = yield this.replyLoadingState(ctxAdaptor, `Loading...`);
            const sessionMessages = this.session.getMessages(ctxAdaptor);
            sessionMessages.push({
                content: userMessage,
                role: api_1.ChatCompletionRequestMessageRoleEnum.User,
            });
            let text = '';
            try {
                const response = yield this.openAi.chat(sessionMessages);
                text = response.data.choices.map(choice => { var _a; return (_a = choice === null || choice === void 0 ? void 0 : choice.message) === null || _a === void 0 ? void 0 : _a.content; }).join(" | ");
                sessionMessages.push({
                    content: text,
                    role: api_1.ChatCompletionRequestMessageRoleEnum.Assistant,
                });
                this.session.updateMessages(ctxAdaptor, sessionMessages);
                yield this.editLoadingReply(ctxAdaptor, loadingMessage, text);
            }
            catch (error) {
                (0, log_utils_1.logError)(error);
                const text = `[ERROR:ChatGPT]: ${((_c = (_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) === null || _c === void 0 ? void 0 : _c.message) || ((_d = error.response) === null || _d === void 0 ? void 0 : _d.description) || error.response}`;
                yield this.editLoadingReply(ctxAdaptor, loadingMessage, text);
            }
            try {
                const convertedFilePath = yield this.tts.convert(text);
                if (convertedFilePath) {
                    yield this.sendAudio(ctxAdaptor, convertedFilePath, text);
                    this.deleteFile(convertedFilePath);
                }
            }
            catch (error) {
                (0, log_utils_1.log)(error);
                yield this.reply(ctxAdaptor, `[Text To Speech Error]: ${error}`);
            }
        });
    }
    sendAudio(ctxAdaptor, filePath, text) {
        return __awaiter(this, void 0, void 0, function* () {
            const readStream = fs.createReadStream(filePath);
            yield ctxAdaptor.ctx.sendAudio({ source: readStream, filename: (0, sanitize_filename_ts_1.sanitize)(text) }, this.getReplyArgs(ctxAdaptor));
        });
    }
}
exports.TelegramBotMessageHandler = TelegramBotMessageHandler;
