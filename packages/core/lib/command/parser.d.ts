import { Dict } from 'cosmokit';
import { h } from '../element';
import { Command } from './command';
import { Permissions } from '../permission';
import { Disposable } from 'cordis';
import { Session } from '../session';
import { Context } from '../context';
export interface Token {
    rest?: string;
    content: string;
    quoted: boolean;
    terminator: string;
    inters: Argv[];
}
export interface Argv<A extends any[] = any[], O extends {} = {}> {
    args?: A;
    options?: O;
    error?: string;
    source?: string;
    initiator?: string;
    terminator?: string;
    session?: Session;
    command?: Command<A, O>;
    rest?: string;
    pos?: number;
    root?: boolean;
    tokens?: Token[];
    name?: string;
    next?: any;
}
export declare namespace Argv {
    export interface Interpolation {
        terminator?: string;
        parse?(source: string): Argv;
    }
    export function interpolate(initiator: string, terminator: string, parse?: (source: string) => Argv): void;
    export namespace whitespace {
        const unescape: (source: string) => string;
        const escape: (source: string) => string;
    }
    export class Tokenizer {
        private bracs;
        constructor();
        interpolate(initiator: string, terminator: string, parse?: (source: string) => Argv): void;
        parseToken(source: string, stopReg?: string): Token;
        parse(source: string, terminator?: string): Argv;
        stringify(argv: Argv): string;
    }
    export function parse(source: string, terminator?: string): Argv<any[], {}>;
    export function stringify(argv: Argv): string;
    export function revert(token: Token): void;
    export interface Domain {
        el: h[];
        elements: h[];
        string: string;
        number: number;
        boolean: boolean;
        text: string;
        rawtext: string;
        integer: number;
        posint: number;
        natural: number;
        bigint: bigint;
        date: Date;
        img: Record<string, any>;
        image: Record<string, any>;
        audio: Record<string, any>;
        video: Record<string, any>;
        file: Record<string, any>;
    }
    export type DomainType = keyof Domain;
    type ParamType<S extends string, F> = S extends `${any}:${infer T}` ? T extends DomainType ? Domain[T] : F : F;
    type Replace<S extends string, X extends string, Y extends string> = S extends `${infer L}${X}${infer R}` ? `${L}${Y}${Replace<R, X, Y>}` : S;
    type ExtractAll<S extends string, F> = S extends `${infer L}]${infer R}` ? [ParamType<L, F>, ...ExtractAll<R, F>] : [];
    type ExtractFirst<S extends string, F> = S extends `${infer L}]${any}` ? ParamType<L, F> : boolean;
    type ExtractSpread<S extends string> = S extends `${infer L}...${infer R}` ? [...ExtractAll<L, string>, ...ExtractFirst<R, string>[]] : [...ExtractAll<S, string>, ...string[]];
    export type ArgumentType<S extends string> = ExtractSpread<Replace<S, '>', ']'>>;
    export type OptionType<S extends string> = ExtractFirst<Replace<S, '>', ']'>, any>;
    export type Type = DomainType | RegExp | readonly string[] | Transform<any> | DomainConfig<any>;
    export interface Declaration {
        name?: string;
        type?: Type;
        fallback?: any;
        variadic?: boolean;
        required?: boolean;
    }
    export type Transform<T> = (source: string, session: Session) => T;
    export interface DomainConfig<T = any> {
        transform?: Transform<T>;
        greedy?: boolean;
        numeric?: boolean;
    }
    export interface OptionConfig<T extends Type = Type> extends Permissions.Config {
        aliases?: string[];
        symbols?: string[];
        value?: any;
        fallback?: any;
        type?: T;
        descPath?: string;
    }
    export interface TypedOptionConfig<T extends Type> extends OptionConfig<T> {
        type: T;
    }
    export interface OptionVariant extends OptionConfig {
        syntax: string;
    }
    export interface OptionDeclaration extends Declaration, OptionVariant {
        values: Dict<any>;
        /** @deprecated */
        valuesSyntax: Dict<string>;
        variants: Dict<OptionVariant>;
    }
    type OptionDeclarationMap = Dict<OptionDeclaration>;
    export namespace CommandBase {
        interface Config {
            strictOptions?: boolean;
        }
    }
    export class CommandBase<T extends CommandBase.Config = CommandBase.Config> {
        readonly name: string;
        ctx: Context;
        config: T;
        declaration: string;
        _arguments: Declaration[];
        _options: OptionDeclarationMap;
        _disposables: Disposable[];
        private _namedOptions;
        private _symbolicOptions;
        constructor(name: string, declaration: string, ctx: Context, config: T);
        _createOption(name: string, def: string, config: OptionConfig): void;
        private _assignOption;
        removeOption<K extends string>(name: K): boolean;
        parse(argv: string | Argv, terminator?: string): Argv;
        private stringifyArg;
        stringify(args: readonly string[], options: any): string;
    }
    export {};
}
//# sourceMappingURL=parser.d.ts.map