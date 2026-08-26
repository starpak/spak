"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = void 0;
// BACKWARD-COMPAT RE-EXPORT (since Spak 0.1.x)
// The h/Fragment/escape/parse utilities used to live here alongside core.
// They have been split out into @spakjs/message so CLI / plugin tooling can
// use the message formatter without pulling the full runtime/core deps.
__exportStar(require("@spakjs/message"), exports);
var message_1 = require("@spakjs/message");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return __importDefault(message_1).default; } });
//# sourceMappingURL=element.js.map