import ns from 'ns-require';
import Loader from './shared';
export * from './shared';
export default class NodeLoader extends Loader {
    scope: ns.Scope;
    localKeys: string[];
    exitOnReload: boolean;
    init(filename?: string): Promise<void>;
    readConfig(initial?: boolean): Promise<import("@spakjs/core").Context.Config>;
    import(name: string): Promise<any>;
    fullReload(code?: number): void;
}
//# sourceMappingURL=index.d.ts.map