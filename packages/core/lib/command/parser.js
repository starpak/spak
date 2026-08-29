"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Argv = void 0;
const cosmokit_1 = require("cosmokit");
const util_1 = require("@spakjs/util");
const element_1 = require("../element");
const leftQuotes = `"'“‘`;
const rightQuotes = `"'”’`;
var Argv;
(function (Argv) {
    const bracs = {};
    function interpolate(initiator, terminator, parse) {
        bracs[initiator] = { terminator, parse };
    }
    Argv.interpolate = interpolate;
    interpolate('$(', ')');
    let whitespace;
    (function (whitespace) {
        // Use a 128-bit (24 base36 char) random UID instead of the previous 6
        // chars. The old space was ~2.17B (36^6), which made it feasible for an
        // attacker to brute-force a collision via user-sent messages and bypass
        // the whitespace-quote escaping (command-injection style). 36^24 gives us
        // roughly 2^124.6 combinations, which is cryptographically sound.
        const rand = (typeof crypto !== 'undefined' && 'randomUUID' in (crypto || {}))
            ? crypto.randomUUID().replace(/-/g, '')
            : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
                + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
        const UID = rand.padEnd(32, 'x').slice(0, 24);
        whitespace.unescape = (source) => source
            .replace(new RegExp(`@__SPAK_SPACE_${UID}__@`, 'g'), ' ')
            .replace(new RegExp(`@__SPAK_NEWLINE_${UID}__@`, 'g'), '\n')
            .replace(new RegExp(`@__SPAK_RETURN_${UID}__@`, 'g'), '\r')
            .replace(new RegExp(`@__SPAK_TAB_${UID}__@`, 'g'), '\t');
        whitespace.escape = (source) => source
            .replace(/ /g, `@__SPAK_SPACE_${UID}__@`)
            .replace(/\n/g, `@__SPAK_NEWLINE_${UID}__@`)
            .replace(/\r/g, `@__SPAK_RETURN_${UID}__@`)
            .replace(/\t/g, `@__SPAK_TAB_${UID}__@`);
    })(whitespace = Argv.whitespace || (Argv.whitespace = {}));
    class Tokenizer {
        bracs;
        constructor() {
            this.bracs = Object.create(bracs);
        }
        interpolate(initiator, terminator, parse) {
            this.bracs[initiator] = { terminator, parse };
        }
        parseToken(source, stopReg = '$') {
            const parent = { inters: [] };
            const index = leftQuotes.indexOf(source[0]);
            const quote = rightQuotes[index];
            let content = '';
            if (quote) {
                source = source.slice(1);
                stopReg = `${quote}(?=${stopReg})|$`;
            }
            stopReg += `|${Object.keys({ ...this.bracs, ...bracs }).map(util_1.escapeRegExp).join('|')}`;
            const regExp = new RegExp(stopReg);
            while (true) {
                const capture = regExp.exec(source);
                content += whitespace.unescape(source.slice(0, capture.index));
                if (capture[0] in this.bracs) {
                    source = source.slice(capture.index + capture[0].length).trimStart();
                    const { parse, terminator } = this.bracs[capture[0]];
                    const argv = parse?.(source) || this.parse(source, terminator);
                    source = argv.rest;
                    parent.inters.push({ ...argv, pos: content.length, initiator: capture[0] });
                }
                else {
                    const quoted = capture[0] === quote;
                    const rest = source.slice(capture.index + +quoted);
                    parent.rest = rest.trimStart();
                    parent.quoted = quoted;
                    parent.terminator = capture[0];
                    if (quoted) {
                        parent.terminator += rest.slice(0, -parent.rest.length);
                    }
                    else if (quote) {
                        content = leftQuotes[index] + content;
                        parent.inters.forEach(inter => inter.pos += 1);
                    }
                    parent.content = content;
                    if (quote === "'")
                        Argv.revert(parent);
                    return parent;
                }
            }
        }
        parse(source, terminator = '') {
            const tokens = [];
            // `h.parse()` returns a Fragment whose children are plain **strings**
            // for text (unlike koishi's array of `h('text', ...)` elements). Treat
            // any string child as literal text; only real elements (img/at/quote…)
            // get their internal whitespace escaped so tokenization cannot split them.
            source = element_1.h.parse(source).map((el) => {
                return typeof el === 'string' || el?.type === 'text'
                    ? String(el)
                    : whitespace.escape(String(el));
            }).join('');
            let rest = source, term = '';
            const stopReg = `\\s+|[${(0, util_1.escapeRegExp)(terminator)}]|$`;
            // eslint-disable-next-line no-unmodified-loop-condition
            while (rest && !(terminator && rest.startsWith(terminator))) {
                const token = this.parseToken(rest, stopReg);
                tokens.push(token);
                rest = token.rest;
                term = token.terminator;
                delete token.rest;
            }
            if (rest.startsWith(terminator))
                rest = rest.slice(1);
            source = source.slice(0, -(rest + term).length);
            rest = whitespace.unescape(rest);
            source = whitespace.unescape(source);
            return { tokens, rest, source };
        }
        stringify(argv) {
            const output = (argv.tokens ?? []).reduce((prev, token) => {
                if (token.quoted)
                    prev += leftQuotes[rightQuotes.indexOf(token.terminator[0])] || '';
                return prev + token.content + token.terminator;
            }, '');
            if (argv.rest && !rightQuotes.includes(output[output.length - 1]) || argv.initiator) {
                return output.slice(0, -1);
            }
            return output;
        }
    }
    Argv.Tokenizer = Tokenizer;
    const defaultTokenizer = new Tokenizer();
    function parse(source, terminator = '') {
        return defaultTokenizer.parse(source, terminator);
    }
    Argv.parse = parse;
    function stringify(argv) {
        return defaultTokenizer.stringify(argv);
    }
    Argv.stringify = stringify;
    function revert(token) {
        while (token.inters.length) {
            const { pos, source, initiator } = token.inters.pop();
            token.content = token.content.slice(0, pos)
                + initiator + source + bracs[initiator].terminator
                + token.content.slice(pos);
        }
    }
    Argv.revert = revert;
    // do not use lookbehind assertion for Safari compatibility
    const SYNTAX = /(?:-[\w\x80-\uffff-]*|[^,\s\w\x80-\uffff]+)/.source;
    const BRACKET = /((?:\s*\[[^\]]+?\]|\s*<[^>]+?>)*)/.source;
    const OPTION_REGEXP = new RegExp(`^(${SYNTAX}(?:,\\s*${SYNTAX})*(?=\\s|$))?${BRACKET}(.*)$`);
    class CommandBase {
        name;
        ctx;
        config;
        declaration;
        _arguments;
        _options = {};
        _disposables = [];
        _namedOptions = {};
        _symbolicOptions = {};
        constructor(name, declaration, ctx, config) {
            this.name = name;
            this.ctx = ctx;
            this.config = config;
            if (!name)
                throw new Error('expect a command name');
            const declList = this._arguments = ctx.$commander.parseDecl(declaration);
            this.declaration = declList.stripped;
            for (const decl of declList) {
                this._disposables.push(this.ctx.i18n.define('', `commands.${this.name}.arguments.${decl.name}`, decl.name));
            }
        }
        _createOption(name, def, config) {
            const cap = OPTION_REGEXP.exec(def);
            const param = (0, cosmokit_1.paramCase)(name);
            let syntax = cap[1] || '--' + param;
            const bracket = cap[2] || '';
            const desc = cap[3].trim();
            const aliases = config.aliases ?? [];
            const symbols = config.symbols ?? [];
            for (let param of syntax.trim().split(',')) {
                param = param.trimStart();
                const name = param.replace(/^-+/, '');
                if (!name || !param.startsWith('-')) {
                    symbols.push(element_1.h.escape(param));
                }
                else {
                    aliases.push(name);
                }
            }
            if (!('value' in config) && !aliases.includes(param)) {
                syntax += ', --' + param;
            }
            const declList = this.ctx.$commander.parseDecl(bracket.trimStart());
            if (declList.stripped)
                syntax += ' ' + declList.stripped;
            const option = this._options[name] ||= {
                ...declList[0],
                ...config,
                name,
                values: {},
                valuesSyntax: {},
                variants: {},
                syntax,
            };
            let path = `commands.${this.name}.options.${name}`;
            const fallbackType = typeof option.fallback;
            if ('value' in config) {
                path += '.' + config.value;
                option.variants[config.value] = { ...config, syntax };
                option.valuesSyntax[config.value] = syntax;
                aliases.forEach(name => option.values[name] = config.value);
            }
            else if (!bracket.trim()) {
                option.type = 'boolean';
            }
            else if (!option.type && (fallbackType === 'string' || fallbackType === 'number')) {
                option.type = fallbackType;
            }
            this._disposables.push(this.ctx.i18n.define('', path, desc));
            this._assignOption(option, aliases, this._namedOptions);
            this._assignOption(option, symbols, this._symbolicOptions);
            if (!this._namedOptions[param]) {
                this._namedOptions[param] = option;
            }
        }
        _assignOption(option, names, optionMap) {
            for (const name of names) {
                if (name in optionMap) {
                    throw new Error(`duplicate option name "${name}" for command "${this.name}"`);
                }
                optionMap[name] = option;
            }
        }
        removeOption(name) {
            if (!this._options[name])
                return false;
            const option = this._options[name];
            delete this._options[name];
            for (const key in this._namedOptions) {
                if (this._namedOptions[key] === option) {
                    delete this._namedOptions[key];
                }
            }
            for (const key in this._symbolicOptions) {
                if (this._symbolicOptions[key] === option) {
                    delete this._symbolicOptions[key];
                }
            }
            return true;
        }
        parse(argv, terminator) {
            if (typeof argv === 'string') {
                argv = Argv.parse(argv, terminator);
            }
            const args = [...argv.args || []];
            const options = { ...argv.options };
            if (!argv.source && argv.tokens) {
                argv.source = this.name + ' ' + Argv.stringify(argv);
            }
            let lastArgDecl;
            while (!argv.error && argv.tokens?.length) {
                const token = argv.tokens[0];
                let { content, quoted } = token;
                // variadic argument
                const argDecl = this._arguments[args.length] || lastArgDecl || {};
                if (args.length === this._arguments.length - 1 && argDecl.variadic) {
                    lastArgDecl = argDecl;
                }
                // greedy argument
                if (content[0] !== '-' && this.ctx.$commander.resolveDomain(argDecl.type).greedy) {
                    args.push(this.ctx.$commander.parseValue(Argv.stringify(argv), 'argument', argv, argDecl));
                    break;
                }
                // parse token
                argv.tokens.shift();
                let option;
                let names;
                let param;
                // symbolic option
                if (!quoted && (option = this._symbolicOptions[content])) {
                    names = [(0, cosmokit_1.paramCase)(option.name)];
                }
                else {
                    // normal argument
                    if (content[0] !== '-' || quoted || (+content) * 0 === 0 && this.ctx.$commander.resolveDomain(argDecl.type).numeric) {
                        args.push(this.ctx.$commander.parseValue(content, 'argument', argv, argDecl));
                        continue;
                    }
                    // find -
                    let i = 0;
                    for (; i < content.length; ++i) {
                        if (content.charCodeAt(i) !== 45)
                            break;
                    }
                    // find =
                    let j = i + 1;
                    for (; j < content.length; j++) {
                        if (content.charCodeAt(j) === 61)
                            break;
                    }
                    const name = content.slice(i, j);
                    names = i > 1 ? [name] : name;
                    if (this.config.strictOptions && !this._namedOptions[names[0]]) {
                        if (this.ctx.$commander.resolveDomain(argDecl.type).greedy) {
                            argv.tokens.unshift(token);
                            args.push(this.ctx.$commander.parseValue(Argv.stringify(argv), 'argument', argv, argDecl));
                            break;
                        }
                        args.push(this.ctx.$commander.parseValue(content, 'argument', argv, argDecl));
                        continue;
                    }
                    if (i > 1 && name.startsWith('no-') && !this._namedOptions[name]) {
                        ;
                        options[(0, cosmokit_1.camelCase)(name.slice(3))] = false;
                        continue;
                    }
                    param = content.slice(++j);
                    option = this._namedOptions[names[names.length - 1]];
                }
                // get parameter from next token
                quoted = false;
                if (!param) {
                    const { type, values } = option || {};
                    if (this.ctx.$commander.resolveDomain(type).greedy) {
                        param = Argv.stringify(argv);
                        quoted = true;
                        argv.tokens = [];
                    }
                    else {
                        // Option has bounded value or option is boolean.
                        const isValued = names[names.length - 1] in (values || {}) || type === 'boolean';
                        if (!isValued && argv.tokens.length && (type || argv.tokens[0]?.content !== '-')) {
                            const token = argv.tokens.shift();
                            param = token.content;
                            quoted = token.quoted;
                        }
                    }
                }
                // handle each name
                for (let j = 0; j < names.length; j++) {
                    const name = names[j];
                    const optDecl = this._namedOptions[name];
                    const key = optDecl ? optDecl.name : (0, cosmokit_1.camelCase)(name);
                    if (optDecl && name in optDecl.values) {
                        ;
                        options[key] = optDecl.values[name];
                    }
                    else {
                        const source = j + 1 < names.length ? '' : param;
                        options[key] = this.ctx.$commander.parseValue(source, 'option', argv, optDecl);
                    }
                    if (argv.error)
                        break;
                }
            }
            // assign default values
            for (const { name, fallback } of Object.values(this._options)) {
                if (fallback !== undefined && !(name in options)) {
                    ;
                    options[name] = fallback;
                }
            }
            delete argv.tokens;
            return { ...argv, options, args, error: argv.error || '', command: this };
        }
        stringifyArg(value) {
            value = '' + value;
            return value.includes(' ') ? `"${value}"` : value;
        }
        stringify(args, options) {
            let output = this.name;
            for (const key in options) {
                const value = options[key];
                if (value === true) {
                    output += ` --${key}`;
                }
                else if (value === false) {
                    output += ` --no-${key}`;
                }
                else {
                    output += ` --${key} ${this.stringifyArg(value)}`;
                }
            }
            for (const arg of args) {
                output += ' ' + this.stringifyArg(arg);
            }
            return output;
        }
    }
    Argv.CommandBase = CommandBase;
})(Argv || (exports.Argv = Argv = {}));
//# sourceMappingURL=parser.js.map