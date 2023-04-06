"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const telegram_1 = require("./telegram");
// https://stackoverflow.com/questions/8313628/node-js-request-how-to-emitter-setmaxlisteners
require('events').EventEmitter.prototype._maxListeners = 100;
new telegram_1.TelegramBotMessageHandler();
