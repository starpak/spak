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
exports.Commander = void 0;
const cosmokit_1 = require("cosmokit");
const element_1 = require("../element");
const command_1 = require("./command");
const parser_1 = require("./parser");
const validate_1 = __importDefault(require("./validate"));
const context_1 = require("../context");
__exportStar(require("./command"), exports);
__exportStar(require("./parser"), exports);
__exportStar(require("./validate"), exports);
const BRACKET_REGEXP = /<[^>]+>|\[[^\]]+\]/g;
class Commander {
    ctx;
    config;
    _commandList = [];
    constructor(ctx, config = {}) {
        this.ctx = ctx;
        this.config = config;
        (0, cosmokit_1.defineProperty)(this, context_1.Context.current, ctx);
        ctx.plugin(validate_1.default);
        ctx.before('parse', (content, session) => {
            return parser_1.Argv.parse(content);
        });
        ctx.middleware((session, next) => {
            // execute command
            if (!session.argv)
                return next();
            if (!this.resolveCommand(session.argv))
                return next();
            return session.execute(session.argv, next);
        });
        ctx.schema.extend('command', command_1.Command.Config, 1000);
        this.domain('el', source => element_1.h.parse(source).children, { greedy: true });
        this.domain('elements', source => element_1.h.parse(source).children, { greedy: true });
        this.domain('img', source => {
            const findImg = (children) => {
                for (const child of children) {
                    if (typeof child === 'string')
                        continue;
                    if (child instanceof element_1.h && child.type === 'img')
                        return child;
                    const nested = findImg(child.children || []);
                    if (nested)
                        return nested;
                }
                return undefined;
            };
            const img = findImg(element_1.h.parse(source).children);
            if (!img)
                throw new Error('internal.invalid-argument');
            // Flatten the element: consumers expect the attrs on the result itself.
            return { ...(img.attrs || {}), type: img.type };
        });
        this.domain('string', source => element_1.h.unescape(source));
        this.domain('text', source => element_1.h.unescape(source), { greedy: true });
        this.domain('rawtext', source => new element_1.h('', { content: element_1.h.parse(source).map(c => c.toString()).join('') }).toString(), { greedy: true });
        this.domain('boolean', () => true);
        this.domain('number', (source, session) => {
            const value = +source.replace(/[,_]/g, '');
            if (Number.isFinite(value))
                return value;
            throw new Error('internal.invalid-number');
        }, { numeric: true });
        this.domain('integer', (source, session) => {
            const value = +source.replace(/[,_]/g, '');
            if (value * 0 === 0 && Math.floor(value) === value)
                return value;
            throw new Error('internal.invalid-integer');
        }, { numeric: true });
        this.domain('posint', (source, session) => {
            const value = +source.replace(/[,_]/g, '');
            if (value * 0 === 0 && Math.floor(value) === value && value > 0)
                return value;
            throw new Error('internal.invalid-posint');
        }, { numeric: true });
        this.domain('natural', (source, session) => {
            const value = +source.replace(/[,_]/g, '');
            if (value * 0 === 0 && Math.floor(value) === value && value >= 0)
                return value;
            throw new Error('internal.invalid-natural');
        }, { numeric: true });
        this.domain('bigint', (source, session) => {
            try {
                return BigInt(source.replace(/[,_]/g, ''));
            }
            catch {
                throw new Error('internal.invalid-integer');
            }
        }, { numeric: true });
        this.domain('date', (source, session) => {
            const timestamp = cosmokit_1.Time.parseDate(source);
            if (+timestamp)
                return timestamp;
            throw new Error('internal.invalid-date');
        });
    }
    get(name, session) {
        return this._commandList.find((cmd) => {
            if (!Object.hasOwn(cmd._aliases, name))
                return false;
            const alias = cmd._aliases[name];
            return alias.filter !== false;
        });
    }
    available(session) {
        return this._commandList
            .filter(cmd => cmd.match(session))
            .flatMap(cmd => Object
            .entries(cmd._aliases)
            .filter(([, alias]) => alias.filter !== false)
            .map(([name]) => name));
    }
    resolve(key, session) {
        return this._resolve(key, session).command;
    }
    _resolve(key, session) {
        if (!key)
            return {};
        const segments = command_1.Command.normalize(key).split('.');
        let i = 1, name = segments[0], command;
        while ((command = this.get(name, session)) && i < segments.length) {
            name = command.name + '.' + segments[i++];
        }
        return { command, name };
    }
    inferCommand(argv) {
        if (!argv)
            return;
        if (argv.command)
            return argv.command;
        if (argv.name)
            return argv.command = this.resolve(argv.name, argv.session);
        const segments = [];
        while (argv.tokens?.length) {
            const { content } = argv.tokens[0];
            segments.push(content);
            const { name, command } = this._resolve(segments.join('.'), argv.session);
            if (!command)
                break;
            argv.tokens.shift();
            argv.command = command;
            argv.args = command._aliases[name].args;
            argv.options = command._aliases[name].options;
            if (command._arguments.length)
                break;
        }
        return argv.command;
    }
    resolveCommand(argv) {
        if (!this.inferCommand(argv))
            return;
        if (argv.tokens?.every(token => !token.inters.length)) {
            const { options, args, error } = argv.command.parse(argv);
            argv.options = options;
            argv.args = args;
            argv.error = error;
        }
        return argv.command;
    }
    command(def, ...args) {
        const desc = typeof args[0] === 'string' ? args.shift() : '';
        const config = args[0];
        const path = command_1.Command.normalize(def.split(' ', 1)[0]);
        const decl = def.slice(path.length);
        const segments = path.split(/(?=[./])/g);
        /** parent command in the chain */
        let parent;
        /** the first created command */
        let root;
        const created = [];
        segments.forEach((segment, index) => {
            const code = segment.charCodeAt(0);
            const name = code === 46 ? parent.name + segment : code === 47 ? segment.slice(1) : segment;
            let command = this.get(name);
            if (command) {
                if (parent) {
                    if (command === parent) {
                        throw new Error(`cannot set a command (${command.name}) as its own subcommand`);
                    }
                    if (command.parent) {
                        if (command.parent !== parent) {
                            throw new Error(`cannot create subcommand ${path}: ${command.parent.name}/${command.name} already exists`);
                        }
                    }
                    else {
                        command.parent = parent;
                    }
                }
                parent = command;
                return;
            }
            const isLast = index === segments.length - 1;
            command = new command_1.Command(name, isLast ? decl : '', this.ctx, isLast ? config : {});
            command._disposables.push(this.ctx.i18n.define('', {
                [`commands.${command.name}.$`]: '',
                [`commands.${command.name}.description`]: isLast ? desc : '',
            }));
            created.push(command);
            root ||= command;
            if (parent) {
                command.parent = parent;
            }
            parent = command;
        });
        Object.assign(parent.config, config);
        created.forEach(command => this.ctx.emit('command-added', command));
        parent[context_1.Context.current] = this.ctx;
        if (root)
            this.ctx.collect(`command <${root.name}>`, () => root.dispose());
        return parent;
    }
    domain(name, transform, options) {
        const service = 'domain:' + name;
        if (!transform)
            return this.ctx.get(service);
        return this.ctx.set(service, { transform, ...options });
    }
    resolveDomain(type) {
        if (typeof type === 'function') {
            return { transform: type };
        }
        else if (type instanceof RegExp) {
            const transform = (source) => {
                if (type.test(source))
                    return source;
                throw new Error();
            };
            return { transform };
        }
        else if (Array.isArray(type)) {
            const transform = (source) => {
                if (type.includes(source))
                    return source;
                throw new Error();
            };
            return { transform };
        }
        else if (typeof type === 'object') {
            return type ?? {};
        }
        return this.ctx.get(`domain:${type}`) ?? {};
    }
    parseValue(source, kind, argv, decl = {}) {
        const { name, type = 'string' } = decl;
        // apply domain callback
        const domain = this.resolveDomain(type);
        try {
            return domain.transform(source, argv.session);
        }
        catch (err) {
            if (!argv.session) {
                argv.error = `internal.invalid-${kind}`;
            }
            else {
                const message = argv.session.text(err['message'] || 'internal.check-syntax');
                argv.error = argv.session.text(`internal.invalid-${kind}`, [name, message]);
            }
        }
    }
    parseDecl(source) {
        let cap;
        const result = [];
        // eslint-disable-next-line no-cond-assign
        while (cap = BRACKET_REGEXP.exec(source)) {
            let rawName = cap[0].slice(1, -1);
            let variadic = false;
            if (rawName.startsWith('...')) {
                rawName = rawName.slice(3);
                variadic = true;
            }
            const [name, rawType] = rawName.split(':');
            const type = rawType ? rawType.trim() : undefined;
            result.push({
                name,
                variadic,
                type,
                required: cap[0][0] === '<',
            });
        }
        result.stripped = source.replace(/:[\w-]+(?=[>\]])/g, str => {
            const domain = this.ctx.get(`domain:${str.slice(1)}`);
            return domain?.greedy ? '...' : '';
        }).trimEnd();
        return result;
    }
}
exports.Commander = Commander;
//# sourceMappingURL=index.js.map