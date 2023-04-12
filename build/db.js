"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDb = void 0;
const file_system_1 = require("./utils/file-system");
/**
 * Thread data:
 * первоначально планировал делать путь к файлам db/{userId}/{threadId}/{fileName}.json
 * Но т.к. в трэде первым пишет сообщение с кнопками бот, чтобы сохранить конфиг,
 * то конфиг записывался под id бота, а не юзера. И юзер к информации бота доступа не имеет.
 * Потому принято решение НЕ использовать userId и завязываться только на thread id
 * с ограничением, что всегда есть только 2 участника бот и юзер.
 * Если вдруг появится 3й участник, то все настройки унаследуются/будут доступны и ему.
 */
class AppDb {
    static writeThreadFile(type, chatId, threadId, data) {
        const path = this.getThreadFilePath(type, chatId, threadId);
        file_system_1.AppFileSystem.writeJson(path, data);
    }
    static writeThreadConfig(chatId, threadId, config) {
        this.writeThreadFile('config', chatId, threadId, config);
    }
    static writeThreadHistory(chatId, threadId, messages) {
        this.writeThreadFile('history', chatId, threadId, messages);
    }
    static deleteThreadHistory(chatId, threadId) {
        this.deleteThreadFile('history', chatId, threadId);
    }
    static deleteThreadConfig(chatId, threadId) {
        this.deleteThreadFile('config', chatId, threadId);
    }
    static deleteThreadFile(type, chatId, threadId) {
        const path = this.getThreadFilePath(type, chatId, threadId);
        file_system_1.AppFileSystem.deleteFileOrDir(path);
    }
    static deleteThread(chatId, threadId) {
        this.deleteThreadHistory(chatId, threadId);
        this.deleteThreadConfig(chatId, threadId);
    }
    static getThreadFilePath(type, chatId, threadId) {
        return `${this.dir}/${chatId}/thread-${threadId}/${type}.json`;
    }
    static readThreadFile(type, chatId, threadId) {
        const path = this.getThreadFilePath(type, chatId, threadId);
        return file_system_1.AppFileSystem.readJson(path);
    }
    static readThreadHistory(chatId, threadId) {
        return this.readThreadFile('history', chatId, threadId);
    }
    static readThreadConfig(chatId, threadId) {
        return this.readThreadFile('config', chatId, threadId);
    }
}
AppDb.dir = 'db';
exports.AppDb = AppDb;
