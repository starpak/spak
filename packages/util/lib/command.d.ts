export interface CommandArg {
    name: string;
    description: string;
    required?: boolean;
}
export interface CommandOption {
    name: string;
    description: string;
    default?: string;
}
export interface CommandDeclaration {
    command: string;
    description: string;
    args?: CommandArg[];
    options?: CommandOption[];
    action: (args: Record<string, string>, options: Record<string, any>) => void | Promise<void>;
}
//# sourceMappingURL=command.d.ts.map