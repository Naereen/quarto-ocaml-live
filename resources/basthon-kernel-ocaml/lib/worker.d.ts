import { KernelWorkerBase } from "@basthon/kernel-base/worker";
import { Toplevel } from "./toplevel_types";
declare global {
    interface DedicatedWorkerGlobalScope {
        __kernel__?: Toplevel;
        jsoo_runtime?: any;
    }
}
export declare class OCamlKernelWorker extends KernelWorkerBase {
    private __kernel__?;
    private _initInnerCode;
    constructor(options: any);
    language(): string;
    protected _init(options?: any): Promise<void>;
    protected _eval(data: any, code: string): Promise<{
        "text/plain": string;
    } | undefined>;
    /**
     * Special case of starting a legacy kernel.
     */
    legacyStart(): Promise<void>;
    /**
     * Special case of stoping a legacy kernel.
     */
    legacyStop(): Promise<void>;
    /**
     * Is the source ready to be evaluated or want we more?
     * Usefull to set ps1/ps2 in teminal prompt.
     */
    more(code: string): Promise<boolean>;
    /**
     * Put a file on the local (emulated) filesystem.
     */
    putFile(filename: string, content: ArrayBuffer): void;
    /**
     * Put an importable module on the local (emulated) filesystem
     * and load dependencies.
     */
    putModule(filename: string, content: ArrayBuffer): void;
    /**
     * OCaml wrapper arround Kernel.download (to be called by __kernel__.ml).
     */
    ocamlDownload(content: any, filename: string): void;
    /**
     * Save a canvas to a file on the local FS.
     */
    saveCanvas(canvas: OffscreenCanvas | HTMLCanvasElement, path: string): Promise<void>;
    /**
     * Download a canvas as an image file (png or jpg).
     */
    downloadCanvas(canvas: OffscreenCanvas | HTMLCanvasElement, format: "png" | "jpg"): Promise<void>;
    /**
     * Display a PNG image.
     */
    displayImage(content: any): Promise<void>;
}
