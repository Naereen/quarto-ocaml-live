import * as Comlink from "https://unpkg.com/comlink/dist/esm/comlink.mjs";

let kernelInstance = null;
let isKernelReady = false;

// Initialisation globale du worker OCaml
async function initOCamlKernel() {
    try {
        console.log("[Quarto OCaml] Chargement du worker OCaml...");
        // Chemin relatif ajusté pour Quarto
        const worker = new Worker("resources/ocaml-worker-bundled.js", { type: "module" });
        
        // Connexion au worker via Comlink
        const KernelClassOrInstance = Comlink.wrap(worker);
        
        // Selon la stratégie choisie (instance directe ou classe)
        if (typeof KernelClassOrInstance === 'function') {
            kernelInstance = await new KernelClassOrInstance();
        } else {
            kernelInstance = KernelClassOrInstance;
        }

        if (kernelInstance.init) await kernelInstance.init();
        else if (kernelInstance.start) await kernelInstance.start();

        isKernelReady = true;
        console.log("[Quarto OCaml] Noyau OCaml prêt !");
        
        // Activer tous les boutons d'exécution dans la page
        document.querySelectorAll(".ocaml-live-run-btn").forEach(btn => {
            btn.textContent = "Exécuter (Ctrl+Entrée)";
            btn.disabled = false;
        });
    } catch (err) {
        console.error("[Quarto OCaml] Échec d'initialisation du noyau :", err);
        document.querySelectorAll(".ocaml-live-run-btn").forEach(btn => {
            btn.textContent = "Erreur d'initialisation";
        });
    }
}

// Attacher le comportement interactif à chaque cellule
function setupCells() {
    document.querySelectorAll(".ocaml-live-cell").forEach(cell => {
        const sourceTextarea = cell.querySelector(".ocaml-live-source");
        const runBtn = cell.querySelector(".ocaml-live-run-btn");
        const stdoutNode = cell.querySelector(".ocaml-live-stdout");
        const stderrNode = cell.querySelector(".ocaml-live-stderr");

        // Fonction d'exécution de la cellule
        const executeCell = async () => {
            if (!isKernelReady || !kernelInstance) return;

            stdoutNode.textContent = "";
            stderrNode.textContent = "";
            runBtn.disabled = true;
            runBtn.textContent = "Évaluation...";

            const code = sourceTextarea.value;

            try {
                const res = await kernelInstance.eval(code);
                
                if (typeof res === 'object' && res !== null) {
                    if (res.stdout) stdoutNode.textContent = res.stdout;
                    if (res.stderr) stderrNode.textContent = res.stderr;
                    if (!res.stdout && !res.stderr) stdoutNode.textContent = JSON.stringify(res, null, 2);
                } else {
                    stdoutNode.textContent = res;
                }
            } catch (e) {
                stderrNode.textContent = "Erreur d'exécution : " + e.message;
            } finally {
                runBtn.disabled = false;
                runBtn.textContent = "Exécuter (Ctrl+Entrée)";
            }
        };

        runBtn.addEventListener("click", executeCell);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    setupCells();
    initOCamlKernel();
});