"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppTelegramContextAdapter = void 0;
class AppTelegramContextAdapter {
    constructor(ctx) {
        this.ctx = ctx;
    }
    getSession() {
        if (!this.ctx.session) {
            this.ctx.session = {};
        }
        return this.ctx.session;
    }
    get telegram() {
        return this.ctx.telegram;
    }
    getText() {
        return this.ctx.update.message.text;
    }
    getUserId() {
        return this.ctx.update.message.from.id;
    }
    getForwardFromChatId() {
        var _a;
        return (_a = this.ctx.update.message) === null || _a === void 0 ? void 0 : _a.forward_from_chat;
    }
    getReplyToMessageId() {
        var _a, _b;
        return (_b = (_a = this.ctx.update.message) === null || _a === void 0 ? void 0 : _a.reply_to_message) === null || _b === void 0 ? void 0 : _b.message_id;
    }
    getVoiceFileId() {
        return this.ctx.update.message.voice.file_id;
    }
    getMessageId() {
        return this.ctx.update.message.message_id;
    }
}
exports.AppTelegramContextAdapter = AppTelegramContextAdapter;
