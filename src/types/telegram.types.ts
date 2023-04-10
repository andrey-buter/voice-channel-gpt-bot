import { ChatCompletionRequestMessage } from 'openai/api';
import { Context } from 'telegraf';
import { SessionData } from '../telegram-session';

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
	},
	chat: {
		id: number;
		first_name: string;
		username: string;
		type: 'private';
	},
	date: number;
	text: string;
}

export type ThreadFileType = 'history' | 'config';;

export type ThreadConfig = Record<string, any>;
