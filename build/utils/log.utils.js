"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logError = exports.log = void 0;
function log(...args) {
    const date = new Date().toLocaleDateString('en-GB').replaceAll('/', '-');
    const time = new Date().toLocaleTimeString();
    console.log(`[${date} ${time}]`, ...args);
}
exports.log = log;
function logError(...args) {
    const date = new Date().toLocaleDateString('en-GB').replaceAll('/', '-');
    const time = new Date().toLocaleTimeString();
    console.error(`[${date} ${time}]`, ...args);
}
exports.logError = logError;
//
// export function logWarn(...args: unknown[]) {
// 	const date = new Date().toLocaleDateString('en-GB').replaceAll('/', '-');
// 	const time = new Date().toLocaleTimeString();
//
// 	console.warn(`[${date} ${time}]`, ...args);
// }
