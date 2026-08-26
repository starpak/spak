"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cordis_1 = require("cordis");
const message_1 = require("@spakjs/message");
const command_1 = require("./command");
const logger = new cordis_1.Logger('session');
class SpakSession {
    ctx;
    constructor(ctx) {
        this.ctx = ctx;
        ctx.mixin(this, {
            execute: 'session.execute',
        });
    }
    async execute(argv, next) {
        if (typeof argv === 'string')
            argv = command_1.Argv.parse(argv);
        argv.session = this;
        if (argv.tokens) {
            for (const arg of argv.tokens) {
                const { inters } = arg;
                const output = [];
                for (let i = 0; i < inters.length; ++i) {
                    const execution = await this.execute(inters[i], true);
                    output.push(message_1.h.normalize(execution).join(''));
                }
                for (let i = inters.length - 1; i >= 0; --i) {
                    const { pos } = inters[i];
                    arg.content = arg.content.slice(0, pos) + output[i] + arg.content.slice(pos);
                }
                arg.inters = [];
            }
            if (!this.ctx.$commander.resolveCommand(argv))
                return [];
        }
        else {
            argv.command ||= this.ctx.$commander.get(argv.name);
            if (!argv.command) {
                logger.warn(new Error(`cannot find command ${argv.name}`));
                return [];
            }
        }
        const { command } = argv;
        if (!command.ctx.filter(this))
            return [];
        let shouldEmit = true;
        if (next === true) {
            shouldEmit = false;
            next = undefined;
        }
        const result = await command.execute(argv, next);
        if (!shouldEmit)
            return message_1.h.normalize(result);
        return result;
    }
}
exports.default = SpakSession;
//# sourceMappingURL=session.js.map