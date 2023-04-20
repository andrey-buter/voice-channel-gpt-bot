"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplyMistakesLabel = exports.ReplyMistakeAction = exports.TextToSpeechAction = exports.AppLabels = exports.ActionNamespaces = void 0;
var ActionNamespaces;
(function (ActionNamespaces) {
    ActionNamespaces["speechToText"] = "speechToText";
    ActionNamespaces["textToSpeech"] = "textToSpeech";
    ActionNamespaces["replyMistake"] = "replyMistake";
})(ActionNamespaces = exports.ActionNamespaces || (exports.ActionNamespaces = {}));
var AppLabels;
(function (AppLabels) {
    AppLabels["en"] = "English";
    AppLabels["ru"] = "Russian";
    AppLabels["noVoice"] = "No Voice";
})(AppLabels = exports.AppLabels || (exports.AppLabels = {}));
var TextToSpeechAction;
(function (TextToSpeechAction) {
    TextToSpeechAction["en"] = "en";
    TextToSpeechAction["ru"] = "ru";
    TextToSpeechAction["noVoice"] = "noVoice";
})(TextToSpeechAction = exports.TextToSpeechAction || (exports.TextToSpeechAction = {}));
var ReplyMistakeAction;
(function (ReplyMistakeAction) {
    ReplyMistakeAction["action"] = "action";
})(ReplyMistakeAction = exports.ReplyMistakeAction || (exports.ReplyMistakeAction = {}));
var ReplyMistakesLabel;
(function (ReplyMistakesLabel) {
    ReplyMistakesLabel["fixedMessage"] = "Fixed Message";
    ReplyMistakesLabel["recordCorrectVersion"] = "Record correct version";
})(ReplyMistakesLabel = exports.ReplyMistakesLabel || (exports.ReplyMistakesLabel = {}));
