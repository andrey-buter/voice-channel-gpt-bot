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
const common_util_1 = require("../utils/common.util");
const download_util_1 = require("../utils/download.util");
const file_system_1 = require("../utils/file-system");
const open_ai_1 = require("../integrations/open-ai");
const env_1 = require("../env");
const log_utils_1 = require("../utils/log.utils");
const mpeg_utils_1 = require("../utils/mpeg.utils");
const telegram_context_decorator_1 = require("./telegram-context-decorator");
const telegram_types_1 = require("../types/telegram.types");
const text_to_speech_1 = require("../integrations/text-to-speech");
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
        this.bot.use((0, telegraf_1.session)());
        // this.bot.use(async (ctx, next) => {
        //   await next();
        // });
        // this.bot.use(Telegraf.log());
        this.bot.settings((ctx) => __awaiter(this, void 0, void 0, function* () {
            yield ctx.telegram.callApi('setMyCommands', {
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
        }));
        this.bot.start((ctx) => __awaiter(this, void 0, void 0, function* () {
            const ctxDecorator = new telegram_context_decorator_1.AppTelegramContextDecorator(ctx);
            yield this.doForAllowedUserOrAction(ctxDecorator, () => ctxDecorator.replyLoadingState(this.startMessage));
        }));
        this.bot.command('teach', (ctx) => __awaiter(this, void 0, void 0, function* () {
            const ctxDecorator = new telegram_context_decorator_1.AppTelegramContextDecorator(ctx);
            yield this.doForAllowedUserOrAction(ctxDecorator, () => ctxDecorator.replyLoadingState(this.startTeach));
        }));
        this.bot.command('reset', (ctx) => {
            const ctxDecorator = new telegram_context_decorator_1.AppTelegramContextDecorator(ctx);
            ctxDecorator.session.updateMessages([]);
        });
        this.bot.command('ttsOn', (ctx) => __awaiter(this, void 0, void 0, function* () {
            const ctxDecorator = new telegram_context_decorator_1.AppTelegramContextDecorator(ctx);
            yield ctxDecorator.session.updateThreadConfig({
                textToSpeech: telegram_types_1.TextToSpeechAction.en,
            });
            yield ctxDecorator.reply('TTS switched on (en)');
        }));
        this.bot.command('ttsOff', (ctx) => __awaiter(this, void 0, void 0, function* () {
            const ctxDecorator = new telegram_context_decorator_1.AppTelegramContextDecorator(ctx);
            yield ctxDecorator.session.updateThreadConfig({
                textToSpeech: telegram_types_1.TextToSpeechAction.noVoice,
            });
            yield ctxDecorator.reply('TTS switched off');
        }));
        // @ts-ignore
        this.bot.on((0, filters_1.editedMessage)('text'), (ctx) => __awaiter(this, void 0, void 0, function* () {
            const ctxDecorator = new telegram_context_decorator_1.AppTelegramContextDecorator(ctx);
            if (!this.isAllowed(ctxDecorator)) {
                return;
            }
            // for main channel messages stream (i.e. for thread): don't react on a new post
            if (ctxDecorator.isMainChatMessage()) {
                ctxDecorator.saveThreadTextToConfig();
                return;
            }
        }));
        // @ts-ignore
        this.bot.on((0, filters_1.message)('text'), (ctx) => __awaiter(this, void 0, void 0, function* () {
            const ctxDecorator = new telegram_context_decorator_1.AppTelegramContextDecorator(ctx);
            yield this.doForAllowedUserOrAction(ctxDecorator, () => this.onText(ctxDecorator));
        }));
        // @ts-ignore
        this.bot.on((0, filters_1.message)('voice'), (ctx) => __awaiter(this, void 0, void 0, function* () {
            const ctxDecorator = new telegram_context_decorator_1.AppTelegramContextDecorator(ctx);
            yield this.doForAllowedUserOrAction(ctxDecorator, () => this.onVoice(ctxDecorator));
        }));
        // action structure [actionNamespace]:[actionName]
        this.bot.action(/^(.*):(.*)$/, (ctx) => __awaiter(this, void 0, void 0, function* () {
            const actionNamespace = ctx.match[1];
            const actionName = ctx.match[2];
            const ctxDecorator = new telegram_context_decorator_1.AppTelegramContextDecorator(ctx);
            yield ctx.answerCbQuery(`Saved`);
            if (actionNamespace === telegram_types_1.ActionNamespaces.textToSpeech) {
                ctxDecorator.session.updateThreadConfig({
                    textToSpeech: actionName,
                });
                yield ctxDecorator.sendThreadConfig();
            }
            if (actionNamespace === telegram_types_1.ActionNamespaces.replyMistake) {
                yield ctxDecorator.reply('The next audio message will be without chat GPT response.');
                // disabled voice recognition to allow user to record and repeat correct message aloud without chatting with GPT
                ctxDecorator.session.enableAudioRepeatingMode();
            }
        }));
        this.bot.launch();
        // Enable graceful stop
        // process.once('SIGINT', () => this.bot.stop('SIGINT'));
        // process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
        (0, mpeg_utils_1.initConverter)();
    }
    testLog() {
        (0, log_utils_1.log)('Telegram is init!');
    }
    doForAllowedUserOrAction(ctxDecorator, cb) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isAllowed(ctxDecorator)) {
                yield ctxDecorator.reply(this.restrictedMessage);
                return;
            }
            // for main channel messages stream (i.e. for thread): don't react on a new post
            if (ctxDecorator.isMainChatMessage()) {
                yield ctxDecorator.sendFirstThreadMessage();
                return;
            }
            yield cb(ctxDecorator);
        });
    }
    isAllowed(ctxDecorator) {
        return this.allowedUserIds.includes(ctxDecorator.getUserId());
    }
    onVoice(ctxDecorator) {
        return __awaiter(this, void 0, void 0, function* () {
            const loadingMessage = yield ctxDecorator.replyLoadingState(`Transcribing...`);
            const fileLink = yield ctxDecorator.telegram.getFileLink(ctxDecorator.getVoiceFileId());
            const filename = path_1.default.parse(fileLink.pathname).base;
            try {
                yield (0, download_util_1.downloadFile)(fileLink.href, `${this.mediaDir}/${filename}`);
            }
            catch (error) {
                yield ctxDecorator.editLoadingReply(loadingMessage, `[ERROR:Voice downloading] ${error}`);
                return;
            }
            const filePath = `./${this.mediaDir}/${filename}`;
            const mp3filePath = `./${this.mediaDir}/${filename}`.replace('.oga', '.mp3');
            (0, mpeg_utils_1.convertOggToMp3)(filePath, mp3filePath, () => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const stream = fs.createReadStream(mp3filePath);
                try {
                    // @ts-ignore
                    const response = yield this.openAi.transcript(stream);
                    const text = ((_a = response.data) === null || _a === void 0 ? void 0 : _a.text) || '';
                    yield ctxDecorator.editLoadingReply(loadingMessage, `[Voice message]: ${text}`);
                    yield this.fixMyMistakesReply(ctxDecorator, text);
                    if (ctxDecorator.session.isAudioRepeatingModeEnabled()) {
                        ctxDecorator.session.disableAudioRepeatingMode();
                        return;
                    }
                    yield this.chat(ctxDecorator, text);
                }
                catch (error) {
                    (0, log_utils_1.log)(error.response.data);
                    yield ctxDecorator.editLoadingReply(loadingMessage, `[ERROR:Transcription] ${error.response.data.error.message}`);
                }
                this.deleteFile(filePath);
                this.deleteFile(mp3filePath);
            }));
        });
    }
    fixMyMistakesReply(ctxDecorator, text) {
        return __awaiter(this, void 0, void 0, function* () {
            const loadingMessage = yield ctxDecorator.replyLoadingState(`Fixing...`);
            const mistakesResp = yield this.openAi.chat([
                {
                    content: `Fix the sentence mistakes: ${text}`,
                    role: api_1.ChatCompletionRequestMessageRoleEnum.User,
                },
            ]);
            const fixedText = mistakesResp.data.choices.map(choice => { var _a; return (_a = choice === null || choice === void 0 ? void 0 : choice.message) === null || _a === void 0 ? void 0 : _a.content; }).join(' | ');
            yield ctxDecorator.fixMistakesReply(loadingMessage, fixedText);
        });
    }
    deleteFile(filePath) {
        file_system_1.AppFileSystem.deleteFileOrDir(filePath);
    }
    // private async onText(ctx: FilteredContext<MyContext, Extract<Update, 'Update.MessageUpdate'>>) {
    onText(ctxDecorator) {
        return __awaiter(this, void 0, void 0, function* () {
            // if user clicked to record fixed mistakes message and then started to text, then allow user to voice recognition
            ctxDecorator.session.disableAudioRepeatingMode();
            yield this.chat(ctxDecorator, ctxDecorator.getText());
        });
    }
    chat(ctxDecorator, userMessage) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            const loadingMessage = yield ctxDecorator.replyLoadingState(`Processing...`);
            const sessionMessages = ctxDecorator.session.getMessages();
            const config = ctxDecorator.session.getThreadConfig();
            sessionMessages.push({
                content: userMessage,
                role: api_1.ChatCompletionRequestMessageRoleEnum.User,
            });
            let text = '';
            try {
                // messages count add because of error: This model's maximum context length is 4097 tokens.
                // Max tokens count in a single message I got is 510
                const response = yield this.openAi.chat((0, common_util_1.getLastArrayItems)(sessionMessages, 10));
                text = response.data.choices.map(choice => { var _a; return (_a = choice === null || choice === void 0 ? void 0 : choice.message) === null || _a === void 0 ? void 0 : _a.content; }).join(' | ');
                sessionMessages.push({
                    content: text,
                    role: api_1.ChatCompletionRequestMessageRoleEnum.Assistant,
                });
                ctxDecorator.session.updateMessages(sessionMessages);
                yield ctxDecorator.editLoadingReply(loadingMessage, text);
            }
            catch (error) {
                (0, log_utils_1.logError)(error.response);
                const text = `[ERROR:ChatGPT]: ${((_c = (_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) === null || _c === void 0 ? void 0 : _c.message) || ((_d = error.response) === null || _d === void 0 ? void 0 : _d.description) || error.response}`;
                yield ctxDecorator.editLoadingReply(loadingMessage, text);
            }
            if (config.textToSpeech === telegram_types_1.TextToSpeechAction.noVoice) {
                return;
            }
            try {
                const convertedFilePath = yield this.tts.convert(text, config.textToSpeech);
                if (convertedFilePath) {
                    yield ctxDecorator.sendAudio(convertedFilePath, text);
                    this.deleteFile(convertedFilePath);
                }
            }
            catch (error) {
                (0, log_utils_1.log)(error);
                yield ctxDecorator.reply(`[Text To Speech Error]: ${error}`);
            }
        });
    }
}
exports.TelegramBotMessageHandler = TelegramBotMessageHandler;
