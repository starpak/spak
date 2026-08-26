import { Awaitable, Dict } from 'cosmokit';
import { Schema } from 'cordis';
import { Fragment } from '../element';
import { Argv } from './parser';
import { Next } from '../middleware';
import { Session } from '../session';
import { Context } from '../context';
export type Extend<O extends {}, K extends string, T> = {
    [P in K | keyof O]?: (P extends keyof O ? O[P] : unknown) & (P extends K ? T : unknown);
};
export declare namespace Command {
    interface Alias {
        options?: Dict;
        args?: string[];
        filter?: boolean;
    }
    type Action<A extends any[] = any[], O extends {} = {}> = (argv: Argv<A, O>, ...args: A) => Awaitable<void | Fragment>;
    type Usage = string | ((session: Session) => Awaitable<string>);
}
export declare class Command<A extends any[] = any[], O extends {} = {}> extends Argv.CommandBase<Command.Config> {
    children: Command[];
    _parent: Command | null;
    _aliases: Dict<Command.Alias>;
    _examples: string[];
    _usage?: Command.Usage;
    private _actions;
    private _checkers;
    constructor(name: string, decl: string, ctx: Context, config: Command.Config);
    get caller(): Context;
    get displayName(): string;
    set displayName(name: string);
    get parent(): Command | null;
    set parent(parent: Command | null);
    static normalize(name: string): string;
    private _registerAlias;
    alias(...names: string[]): this;
    alias(name: string, options: Command.Alias): this;
    _escape(source: any): any;
    subcommand<D extends string>(def: D, config?: Command.Config): Command<Argv.ArgumentType<D>>;
    subcommand<D extends string>(def: D, desc: string, config?: Command.Config): Command<Argv.ArgumentType<D>>;
    usage(text: Command.Usage): this;
    example(example: string): this;
    option(name: string, ...args: [Argv.OptionConfig?] | [string, Argv.OptionConfig?]): this;
    match(session: Session): boolean;
    check(callback: Command.Action<A, O>, append?: boolean): this;
    before(callback: Command.Action<A, O>, append?: boolean): this;
    action(callback: Command.Action<A, O>, prepend?: boolean): this;
    execute(argv: Argv<A, O>, fallback?: Next): Promise<any>;
    dispose(): void;
}
export declare namespace Command {
    interface Config extends Argv.CommandBase.Config {
        captureQuote?: boolean;
        /** disallow unknown options */
        checkUnknown?: boolean;
        /** check argument count */
        checkArgCount?: boolean;
        /** show command warnings */
        showWarning?: boolean;
        /** handle error */
        handleError?: boolean | ((error: Error, argv: Argv) => Awaitable<void | Fragment>);
        /** permissions */
        permissions?: string[];
        /** dependencies */
        dependencies?: string[];
    }
    const Config: Schema<Command.Config>;
}
//# sourceMappingURL=command.d.ts.map