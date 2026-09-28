import { KernelMainBase } from "@basthon/kernel-base/worker";
/**
 * An OCaml kernel that satisfies Basthon's API.
 */
export class OCamlKernel extends KernelMainBase {
    constructor(options) {
        super(options);
    }
    newWorker() {
        return new Worker(new URL("./comlink-worker.js", import.meta.url), {
            //@ts-ignore
            sandboxed: true, // removing this line will cause security issues
        });
    }
    async importLegacyWorker() {
        await import("./comlink-worker.js");
    }
    language() {
        return "ocaml";
    }
    languageName() {
        return "OCaml";
    }
    moduleExts() {
        return ["ml"];
    }
    /**
     * List modules launched via putModule.
     */
    async userModules() {
        return [];
    }
    /**
     * Download a file from the VFS.
     */
    async getFile(path) {
        return new Uint8Array([]);
    }
    /**
     * Download a user module file.
     */
    async getUserModuleFile(filename) {
        return new Uint8Array([]);
    }
    /**
     * Mimic the OCaml's REPL banner.
     */
    banner() {
        return "        OCaml version 5.3.0\n";
    }
    ps1() {
        return "# ";
    }
    ps2() {
        return "  ";
    }
}
