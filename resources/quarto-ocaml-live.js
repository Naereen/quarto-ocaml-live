// En tant que module ES, import.meta.url pointe TOUJOURS vers l'emplacement réel 
// de ce fichier ocaml-live.js (y compris dans les dossiers site_libs/ de Quarto).
const workerPath = new URL("ocaml-worker-bundled.js", import.meta.url).href;

console.log("Chemin absolu résolu pour le worker OCaml :", workerPath);

document.addEventListener("DOMContentLoaded", async () => {
    const cells = document.querySelectorAll(".ocaml-live-cell");
    if (cells.length === 0) return;

    let kernel = null;
    
    // Indiquer l'état de chargement sur les boutons
    cells.forEach(cell => {
        const btn = cell.querySelector(".ocaml-live-run-btn");
        if (btn) {
            btn.textContent = "Chargement du noyau OCaml...";
            btn.disabled = true;
        }
    });

    try {
        console.log("Tentative d'instanciation du Web Worker...");
        // On passe l'URL absolue résolue via import.meta.url
        kernel = new Worker(workerPath, { type: "module" });
        
        let resolveReady = null;
        const readyPromise = new Promise((resolve, reject) => {
            resolveReady = resolve;
            // Timeout de sécurité de 15 secondes
            setTimeout(() => {
                reject(new Error("Temps d'attente dépassé pour l'initialisation du noyau OCaml (Timeout)."));
            }, 15000);
        });

        kernel.onmessage = function(event) {
            const data = event.data;
            console.log("Message reçu du worker OCaml :", data);
            if (data && (data.status === "ready" || data.ready === true)) {
                resolveReady();
            }
        };

        kernel.onerror = function(error) {
            console.error("Erreur interceptée dans le Web Worker OCaml :", error);
        };

        await readyPromise;
        console.log("Noyau OCaml chargé et prêt avec succès !");

        // Initialisation de CodeMirror et des cellules interactives
        cells.forEach(cell => {
            const btn = cell.querySelector(".ocaml-live-run-btn");
            const textarea = cell.querySelector(".ocaml-live-source");
            const stdoutPre = cell.querySelector(".ocaml-live-stdout");
            const stderrPre = cell.querySelector(".ocaml-live-stderr");

            if (!btn || !textarea) return;

            // Transformation du textarea en instance CodeMirror (mode OCaml / mllike)
            const editor = CodeMirror.fromTextArea(textarea, {
                mode: "mllike",
                lineNumbers: true,
                indentUnit: 2,
                tabSize: 2,
                matchBrackets: true,
                autoCloseBrackets: true,
                lineWrapping: true
            });

            btn.textContent = "Exécuter";
            btn.disabled = false;

            btn.addEventListener("click", async () => {
                const code = editor.getValue();
                
                btn.disabled = true;
                btn.textContent = "Exécution...";
                if (stdoutPre) stdoutPre.textContent = "";
                if (stderrPre) stderrPre.textContent = "";

                const executionId = Math.random().toString(36).substring(7);
                
                const messageHandler = function(e) {
                    const msg = e.data;
                    if (msg && msg.id === executionId) {
                        if (msg.stdout && stdoutPre) stdoutPre.textContent += msg.stdout;
                        if (msg.stderr && stderrPre) stderrPre.textContent += msg.stderr;
                        if (msg.done) {
                            kernel.removeEventListener("message", messageHandler);
                            btn.disabled = false;
                            btn.textContent = "Exécuter";
                        }
                    }
                };

                kernel.addEventListener("message", messageHandler);
                kernel.postMessage({ id: executionId, code: code });
            });
        });

    } catch (error) {
        console.error("Erreur critique lors du chargement du noyau Basthon OCaml :", error);
        cells.forEach(cell => {
            const btn = cell.querySelector(".ocaml-live-run-btn");
            if (btn) {
                btn.textContent = "Erreur de chargement du noyau";
                btn.style.backgroundColor = "#dc2626";
            }
        });
    }
});