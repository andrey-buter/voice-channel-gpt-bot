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
        const message = this.getMessageObj();
        return (message === null || message === void 0 ? void 0 : message.text) || '';
    }
    getUserId() {
        const message = this.getMessageObj();
        return message.from.id;
    }
    getForwardFromChatId() {
        const message = this.getMessageObj();
        return message === null || message === void 0 ? void 0 : message.forward_from_chat;
    }
    getReplyToMessageId() {
        var _a;
        const message = this.getMessageObj();
        return (_a = message === null || message === void 0 ? void 0 : message.reply_to_message) === null || _a === void 0 ? void 0 : _a.message_id;
    }
    getVoiceFileId() {
        const message = this.getMessageObj();
        return message.voice.file_id;
    }
    getMessageObj() {
        var _a;
        const update = this.ctx.update;
        return update.message || update.edited_message || ((_a = update.callback_query) === null || _a === void 0 ? void 0 : _a.message);
    }
    getMessageId() {
        const message = this.getMessageObj();
        return message === null || message === void 0 ? void 0 : message.message_id;
    }
    getChatId() {
        const message = this.getMessageObj();
        return message === null || message === void 0 ? void 0 : message.chat.id;
    }
    isMainChatMessage() {
        return !!this.getForwardFromChatId();
    }
    getThreadMessageId() {
        const message = this.getMessageObj();
        if (message.message_thread_id) {
            return message.message_thread_id;
        }
        if (this.isMainChatMessage()) {
            return message.message_id;
        }
        // непосредственный чат между юзером и ботом не имеет forward_from_chat объект
        return null;
    }
}
exports.AppTelegramContextAdapter = AppTelegramContextAdapter;
