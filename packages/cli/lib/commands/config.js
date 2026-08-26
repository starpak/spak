"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@spakjs/config");
const kleur_1 = __importDefault(require("kleur"));
const i18n_1 = require("@spakjs/i18n");
const configCommands = [
    {
        command: 'config',
        description: 'Manage Spak configuration',
        args: [],
        action: () => {
            console.log((0, i18n_1.T)('spak.ccmd.config.help'));
        },
    },
    {
        command: 'config list',
        description: 'List all configuration',
        action: () => {
            const cfg = (0, config_1.loadConfig)();
            console.log(JSON.stringify(cfg, null, 2));
        },
    },
    {
        command: 'config get',
        description: 'Get a configuration value',
        args: [{ name: 'key', description: 'Configuration key', required: true }],
        action: (args) => {
            if (!args.key) {
                console.log(kleur_1.default.red((0, i18n_1.T)('spak.ccmd.config.get_usage')));
                return;
            }
            const val = (0, config_1.getConfig)(args.key);
            if (val === undefined) {
                console.log(kleur_1.default.red((0, i18n_1.T)('spak.ccmd.config.key_not_found', { key: args.key })));
            }
            else {
                console.log((0, i18n_1.T)('spak.ccmd.config.get_value', { key: args.key, value: JSON.stringify(val) }));
            }
        },
    },
    {
        command: 'config set',
        description: 'Set a configuration value',
        args: [
            { name: 'key', description: 'Configuration key', required: true },
            { name: 'value', description: 'Configuration value' },
        ],
        action: (args) => {
            if (!args.key) {
                console.log(kleur_1.default.red((0, i18n_1.T)('spak.ccmd.config.set_usage')));
                return;
            }
            if (args.key === 'language') {
                const validLangs = ['zh', 'en'];
                if (!args.value || typeof args.value !== 'string' || !validLangs.includes(args.value)) {
                    console.log(kleur_1.default.red((0, i18n_1.T)('spak.ccmd.config.language_invalid', { lang: String(args.value), options: validLangs.join(' / ') })));
                    return;
                }
                (0, config_1.setConfig)('language', args.value);
                console.log(kleur_1.default.green((0, i18n_1.T)('spak.ccmd.config.language_set', { lang: args.value })));
                return;
            }
            // Type validation for specific config keys
            if (args.key === 'cpc.ssetps.memoryLimitMB') {
                if (!args.value || isNaN(Number(args.value))) {
                    console.log(kleur_1.default.red((0, i18n_1.T)('spak.ccmd.config.memory_limit_invalid')));
                    return;
                }
                (0, config_1.setConfig)(args.key, Number(args.value));
                console.log(kleur_1.default.green((0, i18n_1.T)('spak.ccmd.config.set_success', { key: args.key, value: String(Number(args.value)) })));
                return;
            }
            let parsedValue = args.value;
            try {
                parsedValue = JSON.parse(args.value);
            }
            catch { }
            (0, config_1.setConfig)(args.key, parsedValue);
            console.log(kleur_1.default.green((0, i18n_1.T)('spak.ccmd.config.set_success', { key: args.key, value: JSON.stringify(parsedValue) })));
        },
    },
];
exports.default = configCommands;
//# sourceMappingURL=config.js.map