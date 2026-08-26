import { Awaitable } from 'cosmokit';
import { Fragment } from '../element';
import { Command } from './command';
import { Argv } from './parser';
import { Context } from '../context';
import { Session } from '../session';
export * from './command';
export * from './parser';
export * from './validate';
declare module '../context' {
    interface Context {
        $commander: Commander;
        command<D extends string>(def: D, config?: Command.Config): Command<Argv.ArgumentType<D>>;
        command<D extends string>(def: D, desc: string, config?: Command.Config): Command<Argv.ArgumentType<D>>;
    }
    interface Events {
        'before-parse'(content: string, session: Session): Argv;
        'command-added'(command: Command): void;
        'command-updated'(command: Command): void;
        'command-removed'(command: Command): void;
        'command-error'(argv: Argv, error: any): void;
        'command/before-execute'(argv: Argv): Awaitable<void | Fragment>;
    }
}
interface DeclarationList extends Array<Argv.Declaration> {
    stripped: string;
}
export declare namespace Commander {
    interface Config {
    }
}
export declare class Commander {
    private ctx;
    private config;
    _commandList: Command[];
    constructor(ctx: Context, config?: Commander.Config);
    get(name: string, session?: Session): Command<any[], {}> | undefined;
    available(session: Session): string[];
    resolve(key: string, session?: Session): Command<any[], {}> | undefined;
    _resolve(key: string, session?: Session): {
        command?: undefined;
        name?: undefined;
    } | {
        command: Command<any[], {}> | undefined;
        name: string;
    };
    inferCommand(argv: Argv): Command<any[], {}> | undefined;
    resolveCommand(argv: Argv): Command<any[], {}> | undefined;
    command(def: string, ...args: [Command.Config?] | [string, Command.Config?]): Command<any[], {}>;
    domain<K extends keyof Argv.Domain>(name: K): Argv.DomainConfig<Argv.Domain[K]>;
    domain<K extends keyof Argv.Domain>(name: K, transform: Argv.Transform<Argv.Domain[K]>, options?: Argv.DomainConfig<Argv.Domain[K]>): () => void;
    resolveDomain(type: Argv.Type): any;
    parseValue(source: string, kind: string, argv: Argv, decl?: Argv.Declaration): any;
    parseDecl(source: string): DeclarationList;
}
//# sourceMappingURL=index.d.ts.map