"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.version = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
// Version of @spakjs/cli, read from this package's package.json.
// Kept as a small module so both the CLI banner and createApp() share one source.
let _version = '';
try {
    _version = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(__dirname, '../package.json'), 'utf8')).version;
}
catch {
    _version = '0.0.0';
}
exports.version = _version;
//# sourceMappingURL=version.js.map