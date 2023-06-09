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
exports.TextToSpeechEngine = void 0;
const client_polly_1 = require("@aws-sdk/client-polly");
const fs_1 = __importDefault(require("fs"));
const stream_1 = require("stream");
const env_1 = require("../env");
const telegram_types_1 = require("../types/telegram.types");
const log_utils_1 = require("../utils/log.utils");
// https://www.youtube.com/watch?v=FxPgWOJ7MWc
// https://github.com/aws/aws-sdk-js-v3/tree/main/clients/client-polly
// https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/loading-node-credentials-shared.html
class TextToSpeechEngine {
    constructor() {
        this.client = new client_polly_1.PollyClient({ region: 'eu-north-1' });
        this.voiceIdsByLang = {
            [client_polly_1.LanguageCode['en_US']]: client_polly_1.VoiceId['Matthew'],
            [client_polly_1.LanguageCode['ru_RU']]: client_polly_1.VoiceId['Tatyana'],
        };
        this.params = {
            Text: '',
            OutputFormat: client_polly_1.OutputFormat['MP3'],
            VoiceId: client_polly_1.VoiceId['Matthew'],
            LanguageCode: client_polly_1.LanguageCode['en_US'], // optional
        };
        this.languageRelation = {
            [telegram_types_1.TextToSpeechAction.en]: client_polly_1.LanguageCode['en_US'],
            [telegram_types_1.TextToSpeechAction.ru]: client_polly_1.LanguageCode['ru_RU'],
            [telegram_types_1.TextToSpeechAction.noVoice]: '',
        };
        this.mediaDir = env_1.ENV_VARS.TMP_MEDIA_DIR;
        this.currentFileId = 0;
    }
    convert(text, language) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const languageCode = this.languageRelation[language];
            if (!languageCode) {
                return;
            }
            const voiceId = this.voiceIdsByLang[languageCode];
            const command = new client_polly_1.SynthesizeSpeechCommand(Object.assign(Object.assign({}, this.params), { Text: text.replaceAll('"', '\"'), LanguageCode: languageCode, VoiceId: voiceId }));
            const filePath = `${this.mediaDir}/polly-${this.currentFileId++}.mp3`;
            try {
                const data = yield this.client.send(command);
                if (!(data.AudioStream instanceof stream_1.Stream)) {
                    return;
                }
                const writableStream = fs_1.default.createWriteStream(filePath);
                // https://www.digitalocean.com/community/tutorials/how-to-work-with-files-using-streams-in-node-js#step-4-copying-files-using-pipe
                data.AudioStream.pipe(writableStream);
                const result = new Promise((resolve, reject) => {
                    writableStream.on('finish', () => {
                        resolve(filePath);
                    });
                    // writableStream.on('error', () => {
                    // 	reject(undefined);
                    // })
                });
                return result;
            }
            catch (error) {
                if ((_a = error.$$metadata) === null || _a === void 0 ? void 0 : _a.requestId) {
                    const { requestId, cfId, extendedRequestId } = error.$$metadata;
                    (0, log_utils_1.log)({ requestId, cfId, extendedRequestId });
                }
                else {
                    (0, log_utils_1.log)(error);
                }
            }
        });
    }
}
exports.TextToSpeechEngine = TextToSpeechEngine;
