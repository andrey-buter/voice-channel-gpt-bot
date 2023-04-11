import { Markup } from 'telegraf';
import { ExtraEditMessageText } from 'telegraf/typings/telegram-types';
import {
	ActionNamespaces,
	AppContext,
	AppLabels,
	SpeechToTextAction,
	TextToSpeechAction
} from '../types/telegram.types';
import { AppTelegramContextAdapter } from './telegram-context-adapter';
import { TelegramSession } from './telegram-session';

export class AppTelegramContextDecorator {
	public readonly session: TelegramSession;
	public readonly adapter: AppTelegramContextAdapter;

	constructor(public ctx: AppContext) {
		this.adapter = new AppTelegramContextAdapter(ctx);
		this.session = new TelegramSession(this.adapter);
	}

	get telegram() {
		return this.adapter.telegram;
	}

	getForwardFromChatId() {
		return this.adapter.getForwardFromChatId();
	}

	getUserId() {
		return this.adapter.getUserId();
	}

	getReplyToMessageId() {
		return this.adapter.getReplyToMessageId();
	}

	getVoiceFileId() {
		return this.adapter.getVoiceFileId();
	}

	getText() {
		return this.adapter.getText();
	}

	async sendSpeechToTextQuestion() {
		const actionNamespace = ActionNamespaces.speechToText;

		return await this.ctx.sendMessage('What language should be recognized?', {
			reply_to_message_id: this.adapter.getMessageId(),
			...Markup.inlineKeyboard([
				Markup.button.callback(AppLabels.en, `${actionNamespace}:${SpeechToTextAction.en}`),
				Markup.button.callback(AppLabels.ru, `${actionNamespace}:${SpeechToTextAction.ru}`),
			]),
		});
	}

	async sendTextToSpeechQuestion() {
		const actionNamespace = ActionNamespaces.textToSpeech;

		return await this.editMessage('What language should be voiced?', {
			// reply_to_message_id: this.getMessageId(),
			...Markup.inlineKeyboard([
				Markup.button.callback(AppLabels.en, `${actionNamespace}:${TextToSpeechAction.en}`),
				Markup.button.callback(AppLabels.ru, `${actionNamespace}:${TextToSpeechAction.ru}`),
				Markup.button.callback(AppLabels.noVoice, `${actionNamespace}:${TextToSpeechAction.noVoice}`),
			]),
		});
	}

	async editMessage(text: string, extra: ExtraEditMessageText = {}) {
		return await this.ctx.telegram.editMessageText(this.adapter.getChatId(), this.adapter.getMessageId(), undefined, text, extra);
	}

	async sendThreadConfig() {
		const config = this.session.getThreadConfig();

		await this.editMessage(`Thread settings: \nSpeech-to-Text: ${AppLabels[config.speechToText]}\nText-to-Speech: ${AppLabels[config.textToSpeech]}`);
	}
}
