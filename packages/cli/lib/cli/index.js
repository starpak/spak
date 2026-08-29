"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cac_1 = require("cac");
const kleur_1 = __importDefault(require("kleur"));
// Force ANSI colors regardless of TTY detection, so the CLI stays colorized
// in real terminals (and is visible even when piped).
kleur_1.default.enabled = true;
const registry_1 = require("./registry");
const start_1 = __importDefault(require("./start"));
const config_1 = __importDefault(require("../commands/config"));
const cpc_1 = __importDefault(require("../commands/cpc"));
const i18n_1 = __importDefault(require("../commands/i18n"));
const package_json_1 = require("../../package.json");
const i18n_2 = require("@spakjs/i18n");
const log_1 = require("@spakjs/log");
// Initialize CLI logger with simple formatter (normal mode)
(0, log_1.setGlobalFormatter)(log_1.simpleFormatter);
const cli = (0, cac_1.cac)('spak').help().version(package_json_1.version);
// Collect all package command declarations
const declarations = [
    ...start_1.default,
    ...config_1.default,
    ...cpc_1.default,
    ...i18n_1.default,
];
(0, registry_1.registerDeclarations)(cli, declarations);
// Intercept --help for subcommands before cac parses them
// Extract full subcommand path from argv (e.g. 'config list', 'cpc check')
const helpIndex = process.argv.findIndex(a => a === '--help' || a === '-h');
if (helpIndex > 0) {
    // Collect all args before --help that aren't flags
    const subArgs = [];
    for (let i = 2; i < helpIndex; i++) {
        const arg = process.argv[i];
        if (!arg.startsWith('-'))
            subArgs.push(arg);
    }
    if (subArgs.length > 0) {
        const fullPath = subArgs.join(' ');
        const help = (0, registry_1.generateCommandHelp)(fullPath, declarations) || (0, registry_1.generateCommandHelp)(subArgs[0], declarations);
        if (help) {
            console.log(help);
            process.exit(0);
        }
    }
}
// Version shortcut: spak -v / spak --version should print ONLY the version
// line and exit (before cac gets a chance to print its own banner + help).
const hasVersionFlag = process.argv.slice(2).some(a => a === '-v' || a === '--version');
if (hasVersionFlag) {
    const platform = `${process.platform} ${process.arch}`;
    // Colorized version banner: spak name bright cyan + bold, version green,
    // platform yellow (higher contrast than gray).
    console.log(`${kleur_1.default.bold().cyan('spak')}/${kleur_1.default.green(package_json_1.version)} ${kleur_1.default.yellow(platform)} node-${process.version}`);
    process.exit(0);
}
const argv = cli.parse();
// Friendly banner when spak is run without any command (instead of raw help).
if (!cli.matchedCommand && !argv.options.help) {
    const gotFlags = process.argv.slice(2).some(a => a.startsWith('-'));
    if (!gotFlags) {
        // Check if there are unknown positional args (i.e. an unrecognized command)
        const positionalArgs = process.argv.slice(2).filter(a => !a.startsWith('-'));
        if (positionalArgs.length > 0) {
            // Unknown command — show error, not the banner
            console.error(kleur_1.default.red(`spak: ${(0, i18n_2.T)('spak.cli.unknown_command', { cmd: positionalArgs[0] })}`));
            console.error(kleur_1.default.dim(`  ${(0, i18n_2.T)('spak.cli.try_help')}`));
            process.exit(1);
        }
        const banner = `  ${kleur_1.default.bold().cyan('spak')} v${kleur_1.default.green(package_json_1.version)} · ${(0, i18n_2.T)('spak.intro.description')}`;
        console.log(banner);
        process.exit(0);
    }
    cli.outputHelp();
}
//# sourceMappingURL=index.js.map