"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command = void 0;
const cosmokit_1 = require("cosmokit");
const util_1 = require("@spakjs/util");
const cordis_1 = require("cordis");
const parser_1 = require("./parser");
const middleware_1 = require("../middleware");
const context_1 = require("../context");
const logger = new cordis_1.Logger('command');
class Command extends parser_1.Argv.CommandBase {
    children = [];
    _parent = null;
    _aliases = Object.create(null);
    _examples = [];
    _usage;
    _actions = [];
    _checkers = [async (argv) => {
            return this.ctx.serial(argv.session, 'command/before-execute', argv);
        }];
    constructor(name, decl, ctx, config) {
        super(name, decl, ctx, {
            showWarning: true,
            handleError: true,
            ...config,
        });
        this._registerAlias(name);
        ctx.$commander._commandList.push(this);
    }
    get caller() {
        return this[context_1.Context.current] || this.ctx;
    }
    get displayName() {
        return Object.keys(this._aliases)[0];
    }
    set displayName(name) {
        this._registerAlias(name, true);
    }
    get parent() {
        return this._parent;
    }
    set parent(parent) {
        if (this._parent === parent)
            return;
        if (this._parent) {
            (0, cosmokit_1.remove)(this._parent.children, this);
        }
        this._parent = parent;
        if (parent) {
            parent.children.push(this);
        }
    }
    static normalize(name) {
        return name.toLowerCase().replace(/_/g, '-');
    }
    _registerAlias(name, prepend = false, options = {}) {
        name = Command.normalize(name);
        if (name.startsWith('.'))
            name = this.parent.name + name;
        // check global
        const previous = this.ctx.$commander.get(name);
        if (previous && previous !== this) {
            throw new Error(`duplicate command names: "${name}"`);
        }
        // add to list
        const existing = this._aliases[name];
        if (existing) {
            if (prepend) {
                this._aliases = { [name]: existing, ...this._aliases };
            }
        }
        else if (prepend) {
            this._aliases = { [name]: options, ...this._aliases };
        }
        else {
            this._aliases[name] = options;
        }
    }
    [Symbol.for('nodejs.util.inspect.custom')]() {
        return `Command <${this.name}>`;
    }
    alias(...args) {
        if (typeof args[1] === 'object') {
            this._registerAlias(args[0], false, args[1]);
        }
        else {
            for (const name of args) {
                this._registerAlias(name);
            }
        }
        this.caller.emit('command-updated', this);
        return this;
    }
    _escape(source) {
        if (typeof source !== 'string')
            return source;
        return source
            .replace(/\$\$/g, '@@__PLACEHOLDER__@@')
            .replace(/\$\d/g, s => `{${s[1]}}`)
            .replace(/@@__PLACEHOLDER__@@/g, '$');
    }
    subcommand(def, ...args) {
        def = this.name + (def.charCodeAt(0) === 46 ? '' : '/') + def;
        const desc = typeof args[0] === 'string' ? args.shift() : '';
        const config = args[0] || {};
        return this.ctx.command(def, desc, config);
    }
    usage(text) {
        this._usage = text;
        return this;
    }
    example(example) {
        this._examples.push(example);
        return this;
    }
    option(name, ...args) {
        let desc = '';
        if (typeof args[0] === 'string') {
            desc = args.shift();
        }
        const config = { ...args[0] };
        this._createOption(name, desc, config);
        this.caller.emit('command-updated', this);
        this.caller.collect('option', () => this.removeOption(name));
        return this;
    }
    match(session) {
        return this.ctx.filter(session);
    }
    check(callback, append = false) {
        return this.before(callback, append);
    }
    before(callback, append = false) {
        if (append) {
            this._checkers.push(callback);
        }
        else {
            this._checkers.unshift(callback);
        }
        this.caller.scope.disposables?.push(() => (0, cosmokit_1.remove)(this._checkers, callback));
        return this;
    }
    action(callback, prepend = false) {
        if (prepend) {
            this._actions.unshift(callback);
        }
        else {
            this._actions.push(callback);
        }
        this.caller.scope.disposables?.push(() => (0, cosmokit_1.remove)(this._actions, callback));
        return this;
    }
    async execute(argv, fallback = middleware_1.Next.compose) {
        argv.command ??= this;
        argv.args ??= [];
        argv.options ??= {};
        const { args, options, error } = argv;
        if (error)
            return error;
        if (logger.level >= 3)
            logger.debug(argv.source ||= this.stringify(args, options));
        // before hooks
        for (const validator of this._checkers) {
            const result = await validator.call(this, argv, ...args);
            if (!(0, cosmokit_1.isNullable)(result))
                return result;
        }
        if (!this._actions.length)
            return '';
        let index = 0;
        let callDepth = 0;
        const maxCallDepth = middleware_1.Next.MAX_DEPTH;
        const queue = this._actions.map(action => async () => {
            return await action.call(this, argv, ...args);
        });
        queue.push(fallback);
        const length = queue.length;
        argv.next = async function (callback) {
            if (++callDepth > maxCallDepth) {
                throw new Error(`command execution stack exceeded ${maxCallDepth}`);
            }
            if (callback !== undefined) {
                queue.push((next) => middleware_1.Next.compose(callback, next));
                if (queue.length > middleware_1.Next.MAX_DEPTH) {
                    throw new Error(`middleware stack exceeded ${middleware_1.Next.MAX_DEPTH}`);
                }
            }
            return queue[index++]?.(argv.next);
        };
        try {
            const result = await argv.next();
            if (!(0, cosmokit_1.isNullable)(result))
                return result;
        }
        catch (error) {
            if (index === length)
                throw error;
            if (error instanceof middleware_1.SessionError) {
                return argv.session.text(error.path, error.param);
            }
            const stack = (0, util_1.coerce)(error);
            logger.warn(`${argv.source ||= this.stringify(args, options)}\n${stack}`);
            this.ctx.emit(argv.session, 'command-error', argv, error);
            if (typeof this.config.handleError === 'function') {
                const result = await this.config.handleError(error, argv);
                if (!(0, cosmokit_1.isNullable)(result))
                    return result;
            }
            else if (this.config.handleError) {
                return argv.session.text('internal.error-encountered');
            }
        }
        return '';
    }
    dispose() {
        this._disposables.splice(0).forEach(dispose => dispose());
        this.ctx.emit('command-removed', this);
        for (const cmd of this.children.slice()) {
            cmd.dispose();
        }
        (0, cosmokit_1.remove)(this.ctx.$commander._commandList, this);
        this.parent = null;
    }
}
exports.Command = Command;
(function (Command) {
    Command.Config = cordis_1.Schema.object({
        permissions: cordis_1.Schema.array(String).role('perms').default(['authority:1']).description('Permission inheritance.'),
        dependencies: cordis_1.Schema.array(String).role('perms').description('Permission dependencies.'),
        captureQuote: cordis_1.Schema.boolean().description('Whether to capture quoted text.').default(true).hidden(),
        checkUnknown: cordis_1.Schema.boolean().description('Whether to check for unknown options.').default(false).hidden(),
        checkArgCount: cordis_1.Schema.boolean().description('Whether to check argument count.').default(false).hidden(),
        showWarning: cordis_1.Schema.boolean().description('Whether to show warnings.').default(true).hidden(),
        handleError: cordis_1.Schema.union([cordis_1.Schema.boolean(), cordis_1.Schema.function()]).description('Whether to handle errors.').default(true).hidden(),
    });
})(Command || (exports.Command = Command = {}));
//# sourceMappingURL=command.js.map