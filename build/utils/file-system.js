"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppFileSystem = void 0;
const fs_1 = __importDefault(require("fs"));
const fs_extra_1 = require("fs-extra");
class AppFileSystem {
    static createFileOrDir(path) {
        (0, fs_extra_1.ensureFileSync)(path);
    }
    static deleteFileOrDir(path) {
        (0, fs_extra_1.removeSync)(path);
    }
    static writeFile(path, data) {
        (0, fs_extra_1.ensureFileSync)(path);
        fs_1.default.writeFileSync(path, data);
    }
    static writeJson(path, data) {
        this.createFileOrDir(path);
        (0, fs_extra_1.writeJsonSync)(path, data);
    }
    static readJson(path) {
        this.createFileOrDir(path);
        const data = this.readFile(path);
        if (!data) {
            this.deleteFileOrDir(path);
            return null;
        }
        return JSON.parse(data);
    }
    static readFile(path) {
        this.createFileOrDir(path);
        return fs_1.default.readFileSync(path, {
            encoding: 'utf-8',
        });
    }
}
exports.AppFileSystem = AppFileSystem;
