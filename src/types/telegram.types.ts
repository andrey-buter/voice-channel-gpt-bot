import { ChatCompletionRequestMessage } from 'openai/api';
import { Context } from 'telegraf';

export type SessionMessage = ChatCompletionRequestMessage;

export interface AppContext extends Context<any> {
  session?: SessionData;
}

export type MessageSessionId = string | number;

export interface TelegramReplyMessage {
  message_id: number;
  from: {
    id: number;
    id_bot: boolean;
    first_name: string;
    username: string;
  };
  chat: {
    id: number;
    first_name: string;
    username: string;
    type: 'private';
  };
  date: number;
  text: string;
}

export type ThreadFileType = 'history' | 'config';

// https://github.com/feathers-studio/telegraf-docs/blob/master/examples/session-bot.ts
// export interface SessionData {
//   messages?: Record<MessageSessionId, SessionMessage[]>;
//   threadConfig?: Record<MessageSessionId, ThreadConfig>;
// }

export interface ThreadSessionData {
  messages?: SessionMessage[];
  threadConfig?: ThreadConfig;
}

export type SessionData = Record<MessageSessionId, ThreadSessionData>;

export interface ThreadConfig {
  speechToText: SpeechToTextAction;
  textToSpeech: TextToSpeechAction;
  threatName: string;
  audioRepeatingModeEnabled: boolean;
}

export enum ActionNamespaces {
  speechToText = 'speechToText',
  textToSpeech = 'textToSpeech',
  replyMistake = 'replyMistake',
}

export enum AppLabels {
  en = 'English',
  ru = 'Russian',
  noVoice = 'No Voice',
}

export enum SpeechToTextAction {
  en = 'en',
  ru = 'ru',
}

export enum TextToSpeechAction {
  en = 'en',
  ru = 'ru',
  noVoice = 'noVoice',
  off = 'noVoice',
}

// type TextToSpeechAction2 = {
//   [prop in keyof typeof AppLabels]: string
// }
//
// const TextToSpeechAction3: TextToSpeechAction2 = {
//
// }

export enum ReplyMistakeAction {
  action = 'action',
}

export enum ReplyMistakesLabel {
  fixedMessage = 'Fixed Message',
  recordCorrectVersion = 'Record correct version',
}
