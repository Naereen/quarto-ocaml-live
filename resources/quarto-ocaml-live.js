// quarto-ocaml-live.js : Version combinée CodeMirror et Worker OCaml non bloquant

// 1. Résolution robuste du chemin du worker (fonctionne parfaitement avec les site_libs de Quarto)
document.addEventListener("DOMContentLoaded", () => {
    const cells = document.querySelectorAll(".ocaml-live-cell");
    if (cells.length === 0) return;

        // Transformation des cellules HTML en éditeurs interactifs CodeMirror
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
        btn.textContent = "Chargement du noyau OCaml...";
        btn.disabled = true;

        // 4. Gestionnaire d'événement sur le bouton d'exécution
            // Attend le kernel Basthon et relaie les flux de sortie de l'évaluation.
        btn.addEventListener("click", async () => {
            const code = editor.getValue();
            
            btn.disabled = true;
            btn.textContent = "Exécution...";
            if (stdoutPre) stdoutPre.textContent = "";
            if (stderrPre) stderrPre.textContent = "";

            // Sécurité : si le kernel a été détruit, on le recrée
            try {
                const kernel = await window.ocamlLiveKernelReady;
                if (!kernel) {
                    const detail = window.ocamlLiveKernelError?.message;
                    throw new Error(detail || "Le kernel OCaml n'a pas pu démarrer.");
                }

                const [result] = await kernel.evalAsync(
                    code,
                    text => { if (stdoutPre) stdoutPre.textContent += text; },
                    text => { if (stderrPre) stderrPre.textContent += text; },
                    {}
                );
                if (result?.["text/plain"] && stdoutPre) {
                    stdoutPre.textContent += result["text/plain"] + "\n";
                }
            } catch (error) {
                if (stderrPre) stderrPre.textContent += `Erreur d'exécution : ${error.message}\n`;
            } finally {
                btn.disabled = false;
                btn.textContent = "Exécuter";
            }
        });
    });

    window.ocamlLiveKernelReady?.then(kernel => {
        cells.forEach(cell => {
            const btn = cell.querySelector(".ocaml-live-run-btn");
            if (!kernel) {
                const stderrPre = cell.querySelector(".ocaml-live-stderr");
                const detail = window.ocamlLiveKernelError?.message || "Le kernel OCaml n'a pas pu démarrer.";
                if (stderrPre) stderrPre.textContent = `Erreur d'initialisation : ${detail}\n`;
                if (btn) {
                    btn.textContent = "Kernel indisponible";
                    btn.disabled = true;
                }
                return;
            }
            if (btn) {
                btn.textContent = "Exécuter";
                btn.disabled = false;
            }
        });
    });
});
