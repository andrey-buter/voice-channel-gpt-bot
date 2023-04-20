import { Configuration, OpenAIApi } from 'openai';
import { ChatCompletionRequestMessage } from 'openai/api';
import { ENV_VARS } from '../env';
import { log } from '../utils/log.utils';

const configuration = new Configuration({
  apiKey: ENV_VARS.OPEN_AI_KEY,
  organization: 'org-yWqzBazHBpa1PdXNiacrGUY6',
});

export class OpenAiEngine {
  public readonly openai = new OpenAIApi(configuration);

  chat(messages: ChatCompletionRequestMessage[]) {
    return this.openai.createChatCompletion({
      model: 'gpt-3.5-turbo', // https://platform.openai.com/docs/models/model-endpoint-compatibility
      messages,
    });
  }

  // https://platform.openai.com/docs/guides/speech-to-text/prompting
  // https://platform.openai.com/docs/api-reference/audio/create
  // https://github.com/openai/whisper#available-models-and-languages
  // Основной язык распознавания английский, но автоматически он распознает и русский.
  async transcript(file: File) {
    return this.openai.createTranscription(file, 'whisper-1', undefined, undefined, 0.2, 'en');
  }
}
