// quarto-ocaml-live.js : Version combinée CodeMirror et Worker OCaml non bloquant

// 1. Résolution robuste du chemin du worker (fonctionne parfaitement avec les site_libs de Quarto)
let workerPath = "ocaml-worker-bundled.js";
if (document.currentScript && document.currentScript.src) {
    try {
        workerPath = new URL("ocaml-worker-bundled.js", document.currentScript.src).href;
    } catch (e) {
        console.warn("Impossible de résoudre l'URL du worker, utilisation du chemin par défaut.");
    }
}

console.log("Chemin résolu pour le worker OCaml :", workerPath);

document.addEventListener("DOMContentLoaded", () => {
    const cells = document.querySelectorAll(".ocaml-live-cell");
    if (cells.length === 0) return;

    let kernel = null;

    // 2. Instanciation du Web Worker en arrière-plan (sans bloquer le rendu de la page)
    try {
        console.log("Tentative d'instanciation du Web Worker OCaml...");
        kernel = new Worker(workerPath, { type: "module" });
        
        kernel.onerror = function(error) {
            console.error("Erreur interceptée dans le Web Worker OCaml :", error);
        };
    } catch (error) {
        console.error("Erreur critique lors de la création du Worker :", error);
    }

    // 3. Transformation des cellules HTML en éditeurs interactifs CodeMirror
    cells.forEach(cell => {
        const btn = cell.querySelector(".ocaml-live-run-btn");
        const textarea = cell.querySelector(".ocaml-live-source");
        const stdoutPre = cell.querySelector(".ocaml-live-stdout");
        const stderrPre = cell.querySelector(".ocaml-live-stderr");

        if (!btn || !textarea) return;

        // Initialisation de CodeMirror (mode OCaml / mllike)
        const editor = CodeMirror.fromTextArea(textarea, {
            mode: "mllike",
            lineNumbers: true,
            indentUnit: 2,
            tabSize: 2,
            matchBrackets: true,
            autoCloseBrackets: true,
            lineWrapping: true
        });

        // Le noyau est chargé de manière asynchrone, on active immédiatement l'interface
        btn.textContent = "Exécuter";
        btn.disabled = false;

        // 4. Gestionnaire d'événement sur le bouton d'exécution
        btn.addEventListener("click", async () => {
            const code = editor.getValue();
            
            btn.disabled = true;
            btn.textContent = "Exécution...";
            if (stdoutPre) stdoutPre.textContent = "";
            if (stderrPre) stderrPre.textContent = "";

            // Sécurité : si le kernel a été détruit, on le recrée
            if (!kernel) {
                try {
                    kernel = new Worker(workerPath, { type: "module" });
                } catch (e) {
                    if (stderrPre) stderrPre.textContent = "Erreur critique : Impossible d'initialiser le worker OCaml.\n";
                    btn.disabled = false;
                    btn.textContent = "Exécuter";
                    return;
                }
            }

            const executionId = Math.random().toString(36).substring(7);
            
            // Écouteur de messages en retour du worker pour cette exécution spécifique
            const messageHandler = function(e) {
                const msg = e.data;
                if (msg) {
                    if (msg.stdout && stdoutPre) {
                        stdoutPre.textContent += msg.stdout;
                    }
                    if (msg.stderr && stderrPre) {
                        stderrPre.textContent += msg.stderr;
                    }
                    if (msg.result && stdoutPre) {
                        stdoutPre.textContent += msg.result + "\n";
                    }
                    
                    // Condition de fin d'exécution
                    if (msg.done || (msg.id && msg.id === executionId && msg.status === "done")) {
                        kernel.removeEventListener("message", messageHandler);
                        btn.disabled = false;
                        btn.textContent = "Exécuter";
                    }
                }
            };

            // Filet de sécurité : si le worker met plus de 12 secondes à répondre, on débloque le bouton
            const safetyTimeout = setTimeout(() => {
                kernel.removeEventListener("message", messageHandler);
                btn.disabled = false;
                btn.textContent = "Exécuter";
                if (stderrPre && stderrPre.textContent === "") {
                    stderrPre.textContent = "[Attention] Délai d'exécution dépassé ou réponse non reçue du worker.\n";
                }
            }, 12000);

            kernel.addEventListener("message", messageHandler);

            // Envoi de la charge utile au worker OCaml
            kernel.postMessage({ id: executionId, code: code });
        });
    });
});
