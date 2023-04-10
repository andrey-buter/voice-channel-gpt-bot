"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDb = void 0;
const file_system_1 = require("./file-system");
class AppDb {
    static writeThreadFile(type, userId, threadId, data) {
        const path = this.getThreadFilePath(type, userId, threadId);
        file_system_1.AppFileSystem.writeJson(path, data);
    }
    static writeThreadConfig(userId, threadId, config) {
        this.writeThreadFile('config', userId, threadId, config);
    }
    static writeThreadHistory(userId, threadId, messages) {
        this.writeThreadFile('history', userId, threadId, messages);
    }
    static deleteThreadHistory(userId, threadId) {
        this.deleteThreadFile('history', userId, threadId);
    }
    static deleteThreadConfig(userId, threadId) {
        this.deleteThreadFile('config', userId, threadId);
    }
    static deleteThreadFile(type, userId, threadId) {
        const path = this.getThreadFilePath(type, userId, threadId);
        file_system_1.AppFileSystem.deleteFileOrDir(path);
    }
    static deleteThread(userId, threadId) {
        this.deleteThreadHistory(userId, threadId);
        this.deleteThreadConfig(userId, threadId);
    }
    static getThreadFilePath(type, userId, threadId) {
        return `${this.dir}/${userId}/thread-${threadId}/${type}.json`;
    }
    static readThreadFile(type, userId, threadId) {
        const path = this.getThreadFilePath(type, userId, threadId);
        return file_system_1.AppFileSystem.readJson(path);
    }
    static readThreadHistory(userId, threadId) {
        return this.readThreadFile('history', userId, threadId);
    }
    static readThreadConfig(userId, threadId) {
        return this.readThreadFile('config', userId, threadId);
    }
}
AppDb.dir = 'db';
exports.AppDb = AppDb;
