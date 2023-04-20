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
    updateCurrentThreadSession(updater) {
        const replyMessageId = this.getThreadId();
        const session = this.contextAdapter.getSession();
        if (!session[replyMessageId]) {
            session[replyMessageId] = {};
        }
        session[replyMessageId] = updater(session[replyMessageId]);
        return session[replyMessageId];
    }
    updateMessages(allMessages) {
        const replyMessageId = this.getThreadId();
        const chatId = this.contextAdapter.getChatId();
        this.updateCurrentThreadSession(threadSession => {
            threadSession.messages = allMessages;
            return threadSession;
        });
        if (allMessages.length) {
            db_1.AppDb.writeThreadHistory(chatId, replyMessageId, allMessages);
        }
        else {
            db_1.AppDb.deleteThreadHistory(chatId, replyMessageId);
        }
    }
    updateThreadConfig(newConfig) {
        const replyMessageId = this.getThreadId();
        const chatId = this.contextAdapter.getChatId();
        const threadSession = this.updateCurrentThreadSession(threadSession => {
            threadSession.threadConfig = Object.assign(Object.assign({ textToSpeech: telegram_types_1.TextToSpeechAction.noVoice, threatName: '', voiceRecognitionEnabled: true }, (threadSession.threadConfig || {})), newConfig);
            return threadSession;
        });
        db_1.AppDb.writeThreadConfig(chatId, replyMessageId, threadSession.threadConfig);
    }
    getMessages() {
        var _a, _b;
        const replyMessageId = this.getThreadId();
        const chatId = this.contextAdapter.getChatId();
        let history = (_b = (_a = this.contextAdapter.getSession()) === null || _a === void 0 ? void 0 : _a[replyMessageId]) === null || _b === void 0 ? void 0 : _b.messages;
        if (!history) {
            history = db_1.AppDb.readThreadHistory(chatId, replyMessageId);
        }
        return [...(history || [])];
    }
    getThreadConfig() {
        const replyMessageId = this.getThreadId();
        const chatId = this.contextAdapter.getChatId();
        const config = db_1.AppDb.readThreadConfig(chatId, replyMessageId);
        // for some cases, session is different
        // - User send message (with session-1)
        // - bot replies with button
        // - user clicks to button
        // - bot replies the message in the thread (for some reason it is session-2)
        // See Mistakes reply button
        // let config = this.contextAdapter.getSession()?.[replyMessageId]?.threadConfig;
        // if (!config) {
        //   config = AppDb.readThreadConfig(chatId, replyMessageId);
        // }
        return Object.assign({}, (config || {}));
    }
    getThreadId() {
        return this.contextAdapter.getThreadMessageId() || this.defaultId;
    }
    disableVoiceRecognition() {
        this.updateThreadConfig({ voiceRecognitionEnabled: false });
    }
    enableVoiceRecognition() {
        this.updateThreadConfig({ voiceRecognitionEnabled: true });
    }
    isVoiceRecognitionEnabled() {
        return !!this.getThreadConfig().voiceRecognitionEnabled;
    }
}
exports.TelegramSession = TelegramSession;
