"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramSession = void 0;
const db_1 = require("../db");
const telegram_types_1 = require("../types/telegram.types");
class TelegramSession {
    constructor(contextAdapter) {
        this.contextAdapter = contextAdapter;
        this.defaultId = 'direct-chat';
    }
    updateMessages(allMessages) {
        const replyMessageId = this.getSessionMessagesByReplyId();
        const session = this.contextAdapter.getSession();
        const chatId = this.contextAdapter.getChatId();
        if (!session[replyMessageId]) {
            session[replyMessageId] = {};
        }
        session[replyMessageId].messages = allMessages;
        if (allMessages.length) {
            db_1.AppDb.writeThreadHistory(chatId, replyMessageId, allMessages);
        }
        else {
            db_1.AppDb.deleteThreadHistory(chatId, replyMessageId);
        }
    }
    updateThreadConfig(newConfig) {
        const replyMessageId = this.getSessionMessagesByReplyId();
        const session = this.contextAdapter.getSession();
        const chatId = this.contextAdapter.getChatId();
        if (!session[replyMessageId]) {
            session[replyMessageId] = {};
        }
        session[replyMessageId].threadConfig = Object.assign(Object.assign({ textToSpeech: telegram_types_1.TextToSpeechAction.noVoice, threatName: '' }, (session[replyMessageId].threadConfig || {})), newConfig);
        db_1.AppDb.writeThreadConfig(chatId, replyMessageId, session[replyMessageId].threadConfig);
    }
    getMessages(messagesCount = 0) {
        var _a, _b;
        const replyMessageId = this.getSessionMessagesByReplyId();
        const chatId = this.contextAdapter.getChatId();
        let history = (_b = (_a = this.contextAdapter.getSession()) === null || _a === void 0 ? void 0 : _a[replyMessageId]) === null || _b === void 0 ? void 0 : _b.messages;
        if (!history) {
            history = db_1.AppDb.readThreadHistory(chatId, replyMessageId);
        }
        const messages = [...(history || [])];
        if (messagesCount === 0) {
            return messages;
        }
        return [...messages].splice(messagesCount * -1);
    }
    getThreadConfig() {
        var _a, _b;
        const replyMessageId = this.getSessionMessagesByReplyId();
        const chatId = this.contextAdapter.getChatId();
        let config = (_b = (_a = this.contextAdapter.getSession()) === null || _a === void 0 ? void 0 : _a[replyMessageId]) === null || _b === void 0 ? void 0 : _b.threadConfig;
        if (!config) {
            config = db_1.AppDb.readThreadConfig(chatId, replyMessageId);
        }
        return Object.assign({}, (config || {}));
    }
    getSessionMessagesByReplyId() {
        return this.contextAdapter.getThreadMessageId() || this.defaultId;
    }
}
exports.TelegramSession = TelegramSession;
