export interface Toplevel {
    init(): number;
    exec(code: string): string;
    io: any;
    createfile(name: string, content: ArrayBuffer): void;
    loadmodule(path: string): void;
}
