import { OCamlKernel } from "./lib/kernel.js";

const button = document.getElementById("run-btn");
const outputNode = document.getElementById("output");
const errorNode = document.getElementById("error");
const kernel = new OCamlKernel({
    rootPath: new URL(".", import.meta.url).href,
});
window.ocamlLiveKernelError = null;
window.ocamlLiveKernelReady = kernel.init().then(() => kernel).catch((error) => {
    window.ocamlLiveKernelError = error;
    console.error("Impossible d'initialiser le kernel OCaml Basthon :", error);
    return null;
});

kernel.addEventListener("eval.output", ({ stream, content }) => {
    const node = stream === "stderr" ? errorNode : outputNode;
    if (node) node.textContent += content;
});

async function start() {
    try {
        await window.ocamlLiveKernelReady;
        if (window.ocamlLiveKernelError) throw window.ocamlLiveKernelError;
        button.textContent = "Exécuter le code OCaml";
        button.disabled = false;
    } catch (error) {
        button.textContent = "Kernel indisponible";
        errorNode.textContent = `Erreur d'initialisation : ${error.message}`;
        return;
    }

    button.addEventListener("click", async () => {
        button.disabled = true;
        outputNode.textContent = "";
        errorNode.textContent = "";

        try {
            const code = document.getElementById("code-source").textContent;
            const [result] = await kernel.evalAsync(code, () => {}, () => {}, {});
            if (result?.["text/plain"]) {
                outputNode.textContent += `${result["text/plain"]}\n`;
            }
        } catch (error) {
            errorNode.textContent += `Erreur d'exécution : ${error.message}`;
        } finally {
            button.disabled = false;
        }
    });
}

if (button && outputNode && errorNode) start();