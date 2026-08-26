import { Fragment } from '@spakjs/message';
import { Argv } from './command';
import { Context } from './context';
import { Next } from './middleware';
export interface Session<C extends Context = Context> {
    argv?: Argv;
    scope?: string;
    execute(content: string | Argv, next?: true | Next): Promise<Fragment>;
    text(path: string | string[], params?: object): string;
}
export default class SpakSession<C extends Context> {
    ctx: C;
    constructor(ctx: C);
    execute(argv: string | Argv, next?: true | Next): Promise<any>;
}
//# sourceMappingURL=session.d.ts.map