"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramSession = void 0;
const db_1 = require("./db");
class TelegramSession {
    constructor() {
        this.defaultId = 'direct-chat';
    }
    updateMessages(ctxAdaptor, allMessages) {
        const replyMessageId = this.getSessionMessagesByReplyId(ctxAdaptor);
        const session = ctxAdaptor.getSession();
        const userId = ctxAdaptor.getUserId();
        if (!session.messages) {
            session.messages = {};
        }
        session.messages[replyMessageId] = allMessages;
        if (allMessages.length) {
            db_1.AppDb.writeThreadHistory(userId, replyMessageId, allMessages);
        }
        else {
            db_1.AppDb.deleteThreadHistory(userId, replyMessageId);
        }
    }
    updateThreadConfig(ctxAdaptor, newConfig) {
        const replyMessageId = this.getSessionMessagesByReplyId(ctxAdaptor);
        const session = ctxAdaptor.getSession();
        const userId = ctxAdaptor.getUserId();
        if (!session.threadConfig) {
            session.threadConfig = {};
        }
        session.threadConfig[replyMessageId] = newConfig;
        if (Object.values(newConfig).length) {
            db_1.AppDb.writeThreadConfig(userId, replyMessageId, newConfig);
        }
        else {
            db_1.AppDb.deleteThreadConfig(userId, replyMessageId);
        }
    }
    getMessages(ctxAdaptor) {
        var _a, _b;
        const replyMessageId = this.getSessionMessagesByReplyId(ctxAdaptor);
        const userId = ctxAdaptor.getUserId();
        let history = (_b = (_a = ctxAdaptor.getSession()) === null || _a === void 0 ? void 0 : _a.messages) === null || _b === void 0 ? void 0 : _b[replyMessageId];
        if (!history) {
            history = db_1.AppDb.readThreadHistory(userId, replyMessageId);
        }
        return [...(history || [])];
    }
    getThreadConfig(ctxAdaptor) {
        var _a, _b;
        const replyMessageId = this.getSessionMessagesByReplyId(ctxAdaptor);
        const userId = ctxAdaptor.getUserId();
        let config = (_b = (_a = ctxAdaptor.getSession()) === null || _a === void 0 ? void 0 : _a.threadConfig) === null || _b === void 0 ? void 0 : _b[replyMessageId];
        if (!config) {
            config = db_1.AppDb.readThreadConfig(userId, replyMessageId);
        }
        return Object.assign({}, (config || {}));
    }
    getSessionMessagesByReplyId(ctxAdaptor) {
        var _a;
        return (_a = ctxAdaptor.getReplyToMessageId()) !== null && _a !== void 0 ? _a : this.defaultId;
    }
}
exports.TelegramSession = TelegramSession;
