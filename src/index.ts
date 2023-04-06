import { TelegramBotMessageHandler } from './telegram';

// https://stackoverflow.com/questions/8313628/node-js-request-how-to-emitter-setmaxlisteners
require('events').EventEmitter.prototype._maxListeners = 100;

new TelegramBotMessageHandler();
