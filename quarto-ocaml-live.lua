-- ocaml-interactive.lua
function CodeBlock(el)
    if quarto.doc.is_format("html") and el.classes:includes("ocaml") then
        -- On récupère le code source
        local code = pandoc.utils.stringify(el.text)
        local cell_id = "ocaml-cell-" .. math.random(10000000)

        -- On génère le HTML pour l'éditeur (CodeMirror) et la zone de console
        local html = string.format([[
            <div class="ocaml-interactive-wrapper" id="%s">
                <div class="ocaml-editor" data-code="%s"></div>
                <button class="run-button">Exécuter</button>
                <pre class="ocaml-output"></pre>
            </div>
        ]], cell_id, quarto.utils.escape_html(code)
        )

        return pandoc.RawBlock('html', html)
    end
end
