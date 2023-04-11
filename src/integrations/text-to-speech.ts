import {
  LanguageCode,
  PollyClient,
  SynthesizeSpeechCommand,
  SynthesizeSpeechCommandInput,
  OutputFormat,
  VoiceId,
} from '@aws-sdk/client-polly';
import fs from 'fs';
import { Stream } from 'stream';
import { ENV_VARS } from '../env';
import { TextToSpeechAction } from '../types/telegram.types';
import { log } from '../utils/log.utils';

// https://www.youtube.com/watch?v=FxPgWOJ7MWc
// https://github.com/aws/aws-sdk-js-v3/tree/main/clients/client-polly
// https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/loading-node-credentials-shared.html
export class TextToSpeechEngine {
  private readonly client = new PollyClient({ region: 'eu-north-1' });
  private voiceIdsByLang = {
    [LanguageCode['en_US']]: VoiceId['Matthew'],
    [LanguageCode['ru_RU']]: VoiceId['Tatyana'],
  };

  private readonly params: SynthesizeSpeechCommandInput = {
    Text: '',
    OutputFormat: OutputFormat['MP3'],
    VoiceId: VoiceId['Matthew'],
    LanguageCode: LanguageCode['en_US'], // optional
  };

  private languageRelation = {
    [TextToSpeechAction.en]: LanguageCode['en_US'],
    [TextToSpeechAction.ru]: LanguageCode['ru_RU'],
    [TextToSpeechAction.noVoice]: '',
  };

  private readonly mediaDir = ENV_VARS.TMP_MEDIA_DIR;

  private currentFileId: number = 0;

  public async convert(text: string, language: TextToSpeechAction): Promise<string | undefined> {
    const languageCode = this.languageRelation[language];

    if (!languageCode) {
      return;
    }

    const voiceId = this.voiceIdsByLang[languageCode];

    const command = new SynthesizeSpeechCommand({
      ...this.params,
      Text: text.replaceAll('"', '\"'),
      LanguageCode: languageCode,
      VoiceId: voiceId,
    });

    const filePath = `${this.mediaDir}/polly-${this.currentFileId++}.mp3`;

    try {
      const data = await this.client.send(command);

      if (!(data.AudioStream instanceof Stream)) {
        return;
      }

      const writableStream = fs.createWriteStream(filePath);

      // https://www.digitalocean.com/community/tutorials/how-to-work-with-files-using-streams-in-node-js#step-4-copying-files-using-pipe
      data.AudioStream.pipe(writableStream);

      const result = new Promise<string>((resolve, reject) => {
        writableStream.on('finish', () => {
          resolve(filePath);
        });
        // writableStream.on('error', () => {
        // 	reject(undefined);
        // })
      });

      return result;
    } catch (error) {
      if (error.$$metadata?.requestId) {
        const { requestId, cfId, extendedRequestId } = error.$$metadata;
        log({ requestId, cfId, extendedRequestId });
      } else {
        log(error);
      }
    }
  }
}
