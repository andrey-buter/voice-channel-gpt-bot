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
