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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiEngine = void 0;
const openai_1 = require("openai");
const env_1 = require("./env");
const configuration = new openai_1.Configuration({
    apiKey: env_1.ENV_VARS.OPEN_AI_KEY,
    organization: 'org-yWqzBazHBpa1PdXNiacrGUY6'
});
class OpenAiEngine {
    constructor() {
        this.openai = new openai_1.OpenAIApi(configuration);
    }
    chat(messages) {
        return this.openai.createChatCompletion({
            model: 'gpt-3.5-turbo-0301',
            messages,
        });
    }
    transcript(file) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.openai.createTranscription(file, 'whisper-1', undefined, undefined, 0.2, 'en');
        });
    }
}
exports.OpenAiEngine = OpenAiEngine;
