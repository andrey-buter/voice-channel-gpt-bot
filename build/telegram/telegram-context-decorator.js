"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppTelegramContextDecorator = void 0;
const telegraf_1 = require("telegraf");
const telegram_types_1 = require("../types/telegram.types");
const telegram_context_adapter_1 = require("./telegram-context-adapter");
const telegram_session_1 = require("./telegram-session");
class AppTelegramContextDecorator {
    constructor(ctx) {
        this.ctx = ctx;
        this.adapter = new telegram_context_adapter_1.AppTelegramContextAdapter(ctx);
        this.session = new telegram_session_1.TelegramSession(this.adapter);
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
    sendTextToSpeechQuestion() {
        return __awaiter(this, void 0, void 0, function* () {
            const actionNamespace = telegram_types_1.ActionNamespaces.textToSpeech;
            return yield this.ctx.sendMessage('What language should be voiced?', Object.assign({ reply_to_message_id: this.adapter.getMessageId() }, telegraf_1.Markup.inlineKeyboard([
                telegraf_1.Markup.button.callback(telegram_types_1.AppLabels.en, `${actionNamespace}:${telegram_types_1.TextToSpeechAction.en}`),
                telegraf_1.Markup.button.callback(telegram_types_1.AppLabels.ru, `${actionNamespace}:${telegram_types_1.TextToSpeechAction.ru}`),
                telegraf_1.Markup.button.callback(telegram_types_1.AppLabels.noVoice, `${actionNamespace}:${telegram_types_1.TextToSpeechAction.noVoice}`),
            ])));
        });
    }
    editMessage(text, extra = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.ctx.telegram.editMessageText(this.adapter.getChatId(), this.adapter.getMessageId(), undefined, text, extra);
        });
    }
    sendThreadConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            const config = this.session.getThreadConfig();
            yield this.editMessage(`Thread settings: \nText-to-Speech: ${telegram_types_1.AppLabels[config.textToSpeech]}`);
        });
    }
}
exports.AppTelegramContextDecorator = AppTelegramContextDecorator;