"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramSession = void 0;
class TelegramSession {
    constructor() {
        this.defaultId = 'direct-chat';
    }
    updateMessages(ctx, allMessages) {
        const id = this.getSessionMessagesByReplyId(ctx);
        if (!ctx.session) {
            ctx.session = {
                messages: {},
            };
        }
        ctx.session.messages[id] = allMessages;
    }
    getMessages(ctx) {
        var _a, _b;
        const id = this.getSessionMessagesByReplyId(ctx);
        return [...(((_b = (_a = ctx === null || ctx === void 0 ? void 0 : ctx.session) === null || _a === void 0 ? void 0 : _a.messages) === null || _b === void 0 ? void 0 : _b[id]) || [])];
    }
    getSessionMessagesByReplyId(ctx) {
        const message = ctx.update.message;
        return message.reply_to_message ? message.reply_to_message.message_id : this.defaultId;
    }
}
exports.TelegramSession = TelegramSession;
