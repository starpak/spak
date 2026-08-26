import { CAC } from 'cac';
import { CommandDeclaration } from './types';
/**
 * Register all commands as flat commands (does not support cac nested subcommands).
 * Uses allowUnknownOptions + manual matching to support subcommand routing.
 */
/** Exposed for index.ts to generate help text early */
export declare function generateCommandHelp(rootName: string, declarations: CommandDeclaration[]): string;
export declare function registerDeclarations(cli: CAC, declarations: CommandDeclaration[]): void;
//# sourceMappingURL=registry.d.ts.map