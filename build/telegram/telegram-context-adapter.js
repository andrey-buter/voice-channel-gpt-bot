"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppTelegramContextAdapter = void 0;
class AppTelegramContextAdapter {
    constructor(ctx) {
        this.ctx = ctx;
    }
    get telegram() {
        return this.ctx.telegram;
    }
    getSession() {
        if (!this.ctx.session) {
            this.ctx.session = {};
        }
        return this.ctx.session;
    }
    getText() {
        return this.ctx.update.message.text;
    }
    getUserId() {
        const message = this.getMessageObj();
        return message.from.id;
    }
    getForwardFromChatId() {
        var _a;
        return (_a = this.ctx.update.message) === null || _a === void 0 ? void 0 : _a.forward_from_chat;
    }
    getReplyToMessageId() {
        var _a;
        const message = this.getMessageObj();
        return (_a = message === null || message === void 0 ? void 0 : message.reply_to_message) === null || _a === void 0 ? void 0 : _a.message_id;
    }
    getVoiceFileId() {
        return this.ctx.update.message.voice.file_id;
    }
    getMessageObj() {
        var _a;
        return this.ctx.update.message || ((_a = this.ctx.update.callback_query) === null || _a === void 0 ? void 0 : _a.message);
    }
    getMessageId() {
        const message = this.getMessageObj();
        return message === null || message === void 0 ? void 0 : message.message_id;
    }
    getChatId() {
        const message = this.getMessageObj();
        return message === null || message === void 0 ? void 0 : message.chat.id;
    }
}
exports.AppTelegramContextAdapter = AppTelegramContextAdapter;
