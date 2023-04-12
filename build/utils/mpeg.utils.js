"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertOggToMp3 = exports.initConverter = void 0;
const fs_1 = __importDefault(require("fs"));
const log_utils_1 = require("./log.utils");
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
function initConverter() {
    ffmpeg.setFfmpegPath(ffmpegPath);
}
exports.initConverter = initConverter;
function convertOggToMp3(oggFilePath, mp3filePath, onSuccess) {
    const outStream = fs_1.default.createWriteStream(mp3filePath);
    ffmpeg()
        .input(oggFilePath)
        .audioQuality(96)
        .toFormat('mp3')
        .on('error', error => (0, log_utils_1.log)(`Encoding Error: ${error.message}`))
        .on('exit', () => (0, log_utils_1.log)('Audio recorder exited'))
        .on('close', () => (0, log_utils_1.log)('Audio recorder closed'))
        .on('end', () => __awaiter(this, void 0, void 0, function* () {
        // log('Audio Transcoding succeeded !');
        yield onSuccess();
    }))
        .pipe(outStream, { end: true });
}
exports.convertOggToMp3 = convertOggToMp3;
