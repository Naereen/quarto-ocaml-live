import { KernelMainBase } from "@basthon/kernel-base/worker";
import { OCamlKernelWorker } from "./worker";
/**
 * An OCaml kernel that satisfies Basthon's API.
 */
export declare class OCamlKernel extends KernelMainBase<OCamlKernelWorker> {
    constructor(options: any);
    protected newWorker(): Worker;
    protected importLegacyWorker(): Promise<void>;
    language(): string;
    languageName(): string;
    moduleExts(): string[];
    /**
     * List modules launched via putModule.
     */
    userModules(): Promise<string[]>;
    /**
     * Download a file from the VFS.
     */
    getFile(path: string): Promise<Uint8Array>;
    /**
     * Download a user module file.
     */
    getUserModuleFile(filename: string): Promise<Uint8Array>;
    /**
     * Mimic the OCaml's REPL banner.
     */
    banner(): string;
    ps1(): string;
    ps2(): string;
}
