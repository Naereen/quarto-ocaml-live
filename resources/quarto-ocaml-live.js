// quarto-ocaml-live.js : Version combinée CodeMirror et Worker OCaml non bloquant

// 1. Résolution robuste du chemin du worker (fonctionne parfaitement avec les site_libs de Quarto)
const trimBlankLines = text => text.replace(/^(?:[ \t]*\r?\n)+|(?:\r?\n[ \t]*)+$/g, "");

document.addEventListener("DOMContentLoaded", () => {
    const cells = document.querySelectorAll(".ocaml-live-cell");
    if (cells.length === 0) return;
    const cellOutputs = new Map();
    const cellRunners = new Map();
    const evalEnabled = cell => cell.dataset.eval !== "false";
    const idleLabel = cell => evalEnabled(cell) ? "Exécuter" : "Exécution désactivée";

    // Hide Jupyter-rendered outputs adjacent to live cells; Basthon owns their output.
    cells.forEach(cell => {
        let sibling = cell.nextElementSibling;
        while (sibling && sibling.matches(".cell-output, .cell-output-display, .cell-output-stdout, .cell-output-stderr")) {
            sibling.hidden = true;
            sibling = sibling.nextElementSibling;
        }
    });

    // Transformation des cellules HTML en éditeurs interactifs CodeMirror
    cells.forEach(cell => {
        const btn = cell.querySelector(".ocaml-live-run-btn");
        const textarea = cell.querySelector(".ocaml-live-source");
        const stdoutPre = cell.querySelector(".ocaml-live-stdout");
        const stderrPre = cell.querySelector(".ocaml-live-stderr");

        if (!btn || !textarea) return;

        if (cell.dataset.echo === "false") {
            const outputContainer = cell.querySelector(".ocaml-live-output-container");
            if (outputContainer) outputContainer.hidden = true;
        }

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

        // Attend le kernel Basthon et relaie les flux de sortie de l'évaluation.
        const runCell = async () => {
            if (!evalEnabled(cell)) return;
            const code = editor.getValue();
            const output = { stdout: "", stderr: "" };
            cellOutputs.set(cell.id, output);

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

                const [result] = await kernel.evalAsync(code, () => {}, () => {}, {
                    ocamlLiveCellId: cell.id
                });
                if (result?.["text/plain"] && stdoutPre) {
                    output.stdout += result["text/plain"] + "\n";
                    stdoutPre.textContent = trimBlankLines(output.stdout);
                }
            } catch (error) {
                output.stderr += `Erreur d'exécution : ${error.message}\n`;
                if (stderrPre) stderrPre.textContent = trimBlankLines(output.stderr);
            } finally {
                btn.disabled = false;
                btn.textContent = "Exécuter";
            }
        };
        cellRunners.set(cell, runCell);
        btn.addEventListener("click", runCell);
    });

    window.ocamlLiveKernelReady?.then(async kernel => {
        if (!kernel) {
            cells.forEach(cell => {
                const btn = cell.querySelector(".ocaml-live-run-btn");
                const stderrPre = cell.querySelector(".ocaml-live-stderr");
                const detail = window.ocamlLiveKernelError?.message || "Le kernel OCaml n'a pas pu démarrer.";
                if (stderrPre) stderrPre.textContent = `Erreur d'initialisation : ${detail}\n`;
                if (btn) {
                    btn.textContent = "Kernel indisponible";
                    btn.disabled = true;
                }
            });
            return;
        }

        kernel.addEventListener("eval.output", ({ stream, content, ocamlLiveCellId }) => {
            const output = cellOutputs.get(ocamlLiveCellId);
            const cell = document.getElementById(ocamlLiveCellId);
            if (!output || !cell) return;

            const isStderr = stream === "stderr";
            const key = isStderr ? "stderr" : "stdout";
            const pre = cell.querySelector(isStderr ? ".ocaml-live-stderr" : ".ocaml-live-stdout");
            output[key] += content;
            if (pre) pre.textContent = trimBlankLines(output[key]);
        });

        cells.forEach(cell => {
            const btn = cell.querySelector(".ocaml-live-run-btn");
            if (btn) {
                btn.textContent = idleLabel(cell);
                btn.disabled = !evalEnabled(cell);
            }
        });

        // Autorun cells run one after the other, in document order.
        for (const cell of cells) {
            const runCell = cellRunners.get(cell);
            if (runCell && cell.dataset.autorun === "true" && evalEnabled(cell)) {
                await runCell();
            }
        }
    });
});
