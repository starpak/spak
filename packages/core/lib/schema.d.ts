import { Dict } from 'cosmokit';
import { Schema } from 'cordis';
import { Computed } from './filter';
import { Context } from './context';
declare global {
    interface Schemastery<S, T> {
        computed(options?: Computed.Options): Schema<Computed<S>, Computed<T>>;
    }
    namespace Schemastery {
        interface Static {
            path(options?: Path.Options): Schema<string>;
            filter(): Schema<Computed<boolean>>;
            computed<X>(inner: X, options?: Computed.Options): Schema<Computed<TypeS<X>>, Computed<TypeT<X>>>;
            dynamic(name: string): Schema;
        }
        namespace Path {
            interface Options {
                filters?: Filter[];
                allowCreate?: boolean;
            }
            type Filter = FileFilter | 'file' | 'directory';
            interface FileFilter {
                name: string;
                extensions: string[];
            }
        }
    }
}
declare module './context' {
    interface Context {
        schema: SchemaService;
    }
    interface Events {
        'internal/schema'(name: string): void;
    }
}
export declare class SchemaService {
    ctx: Context;
    _data: Dict<Schema>;
    constructor(ctx: Context);
    extend(name: string, schema: Schema, order?: number): void;
    get(name: string): Schema;
    set(name: string, schema: Schema): void;
}
//# sourceMappingURL=schema.d.ts.map