import { KernelWorkerBase, loadScript } from "@basthon/kernel-base/worker";
const moduleURL = import.meta.url;
// convert any canvas to a blob (async)
const toBlob = async (canvas, type) => {
    if (canvas instanceof globalThis.OffscreenCanvas) {
        return await canvas.convertToBlob({ type });
    }
    else {
        return await new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob == null)
                    reject();
                else
                    resolve(blob);
            }, type);
        });
    }
};
export class OCamlKernelWorker extends KernelWorkerBase {
    constructor(options) {
        // do not forget to call the parent constructor
        super(options);
        this._initInnerCode = `\
open Js_of_ocaml
module Basthon = struct
  let download (path: string): unit = ignore((Js.Unsafe.eval_string "self.basthon.__kernel__")##download path)
  let sleep (duration: float): unit = ignore((Js.Unsafe.eval_string "self.basthon")##sleep duration)
  let create_canvas () = (Js.Unsafe.eval_string "self.basthon.__kernel__")##createcanvas()
  let display_canvas canvas: unit = ignore((Js.Unsafe.eval_string "self.basthon")##displayCanvas canvas)
  let save_canvas canvas (path: string): unit = ignore((Js.Unsafe.eval_string "self.basthon.__kernel__")##savecanvas canvas path)
  let download_canvas ?(format = "png") canvas: unit = ignore((Js.Unsafe.eval_string "self.basthon")##downloadCanvas canvas (Js.string format))
  let display_image (path: string): unit = ignore((Js.Unsafe.eval_string "self.basthon.__kernel__")##displayimage path)
  let version () : string = (Js.Unsafe.eval_string "self.basthon.__kernel__")##version()
  let help () : unit = print_endline {ext|\
Basthon module
  help:               Show this help.
  download path:      Download a file from the local filesystem.
  sleep duration:     Sleep for a certain amount of seconds.
  display_image path: Display a PNG image from the local filesystem.
  create_canvas:      Create a HTML5 canvas to be displayed with display_canvas.
  display_canvas canvas:   Display a HTML5 canvas created with create_canvas.
  save_canvas canvas path: Save a canvas to a PNG/JPG file to the local filesystem.
  download_canvas ?(format = "png") canvas: Download a canvas to a PNG/JPG file.
|ext}
end`;
    }
    language() {
        return "ocaml";
    }
    /*
     * Initialize the kernel.
     */
    async _init(options) {
        // io redirections
        if (!this.isLegacy()) {
            console.info = (...args) => console.log(...args);
            console.warn = (...args) => console.error(...args);
            globalThis.addEventListener("error", (e) => console.error(e.toString()));
        }
        // kernel loading
        const moduleBaseURL = moduleURL.endsWith(".js") ? moduleURL : `${moduleURL}/`;
        const kernelScriptURL = new URL("./__kernel__.js", moduleBaseURL).href;
        await loadScript(kernelScriptURL);
        this.__kernel__ = self.__kernel__;
        if (this.__kernel__?.init?.() !== 0)
            throw new Error("Can't start OCaml kernel!");
        // mock Graphics_js.draw_image for use in worker
        // see https://github.com/ocsigen/js_of_ocaml/blob/1c43da9a925a9df247548158879439ef4039eb38/runtime/graphics.js#L442
        self.jsoo_runtime.caml_gr_draw_image = (im, x, y) => {
            const s = self.jsoo_runtime.caml_gr_state_get();
            s.context.putImageData(im, x, s.height - im.height - y);
            return 0;
        };
        // execute magic init code
        this.__kernel__?.exec(this._initInnerCode);
    }
    async _eval(data, code) {
        if (this.__kernel__ == null)
            return;
        console.log = (...args) => {
            this.sendStdoutStream(data, args.join(" ") + "\n");
        };
        console.error = (...args) => {
            this.sendStderrStream(data, args.join(" ") + "\n");
        };
        this.__eval_data__ = data;
        this.__kernel__.io.stdout = (...args) => {
            this.sendStdoutStream(data, args.join(" "));
        };
        this.__kernel__.io.stderr = (...args) => {
            this.sendStderrStream(data, args.join(" "));
        };
        const result = this.__kernel__?.exec(code);
        if (typeof result === "string" && result.length > 0)
            return { "text/plain": result.replace(/\n$/, "") };
        return undefined;
    }
    /**
     * Special case of starting a legacy kernel.
     */
    async legacyStart() {
        if (this.__kernel__?.init?.() !== 0)
            throw new Error("Can't start OCaml kernel!");
        // execute magic init code
        this.__kernel__?.exec(this._initInnerCode);
    }
    /**
     * Special case of stoping a legacy kernel.
     */
    async legacyStop() { }
    /**
     * Is the source ready to be evaluated or want we more?
     * Usefull to set ps1/ps2 in teminal prompt.
     */
    async more(code) {
        return false;
    }
    /**
     * Put a file on the local (emulated) filesystem.
     */
    putFile(filename, content) {
        if (this.__kernel__ == null)
            return;
        this.__kernel__.createfile(filename, content);
    }
    /**
     * Put an importable module on the local (emulated) filesystem
     * and load dependencies.
     */
    putModule(filename, content) {
        this.putFile(filename, content);
        /* why is this needed?
         * even if path is already added using the #directory directive,
         * one should recall the directive each time the folder is modified...
         */
        this.__kernel__?.loadmodule(filename);
    }
    /**
     * OCaml wrapper arround Kernel.download (to be called by __kernel__.ml).
     */
    ocamlDownload(content, filename) {
        const array = self.jsoo_runtime.caml_convert_bytes_to_array(content);
        this.download(array, filename);
    }
    /**
     * Save a canvas to a file on the local FS.
     */
    async saveCanvas(canvas, path) {
        if (this.__kernel__ == null)
            return;
        const ext = path.split(".").pop()?.toLowerCase();
        let mime = "image/png";
        if (ext === "jpg" || ext === "jpeg")
            mime = "image/jpeg";
        const promise = (async () => {
            const blob = await toBlob(canvas, mime);
            const content = await blob.arrayBuffer();
            this.__kernel__.createfile(path, content);
        })();
        this.addEvalPromise(promise);
        await promise;
    }
    /**
     * Download a canvas as an image file (png or jpg).
     */
    async downloadCanvas(canvas, format) {
        if (format == null)
            format = "png";
        //@ts-ignore
        format = format.toString().toLowerCase();
        const types = { jpg: "image/jpeg", jpeg: "images/jpeg", png: "image/png" };
        if (!(format in types))
            format = "png";
        const mime = types[format];
        const promise = (async () => {
            const blob = await toBlob(canvas, mime);
            let image = await this.blobToDataURL(blob);
            // image = image.replace(mime, "image/octet-stream");
            this.download(image, `canvas.${format}`);
        })();
        this.addEvalPromise(promise);
        await promise;
    }
    /**
     * Display a PNG image.
     */
    async displayImage(content) {
        const data = this.clone(this.__eval_data__);
        // FIXME: why is this needed? should be useless...
        content.toString();
        const array = self.jsoo_runtime.caml_convert_bytes_to_array(content);
        const blob = new Blob([array], { type: "image/png" });
        const promise = this.displayBlob(blob, data);
        this.addEvalPromise(promise);
        await promise;
    }
}
