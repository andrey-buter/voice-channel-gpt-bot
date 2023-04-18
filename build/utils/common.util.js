"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLastArrayItems = void 0;
function getLastArrayItems(arr, count) {
    return [...arr].slice(count * -1);
}
exports.getLastArrayItems = getLastArrayItems;
