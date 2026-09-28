-- Dans votre filtre Lua (par exemple au début ou lors du traitement du document)
function Pandoc(doc)
    -- Déclaration de la dépendance HTML pour injecter les CSS et JS de l'extension
    quarto.doc.add_html_dependency({
        name = "quarto-ocaml-live",
        version = "0.1.0",
        stylesheets = {
          "resources/codemirror.min.css",
          "resources/quarto-ocaml-live.css"
        },
        scripts = {
          "resources/codemirror.min.js",
          "resources/mllike.min.js",
          { path = "resources/basthon-kernel-ocaml/dist/demo.js", attribs = { type = "module" } },
          { path = "resources/quarto-ocaml-live.js", attribs = { type = "module" } }
        }
    })

    -- IMPORTANT : On attache le Web Worker pour que Quarto le copie dans le lib dir
    -- Basthon's main-thread client starts the Comlink worker and its proxy.
    quarto.doc.attach_to_dependency("quarto-ocaml-live", "resources/basthon-kernel-ocaml/dist/comlink-worker.js")
    quarto.doc.attach_to_dependency("quarto-ocaml-live", "resources/basthon-kernel-ocaml/dist/comlink-proxy.js")
    quarto.doc.attach_to_dependency("quarto-ocaml-live", "resources/basthon-kernel-ocaml/dist/__kernel__.js")

    return doc
end

-- Gestion des blocs de code OCaml interactifs

local cell_counter = 0

local function escape_html(str)
  local replacements = {
    ['&'] = '&amp;', ['<'] = '&lt;', ['>'] = '&gt;',
    ['"'] = '&quot;', ["'"] = '&#39;'
  }
  return (str:gsub("[&<>'\"]", function(c) return replacements[c] end))
end

function CodeBlock(block)
  -- On vérifie si le bloc est du code OCaml
  if block.classes:includes("ocaml") or block.classes:includes("{ocaml}") or block.classes:includes("ocaml-live") or block.classes:includes("{ocaml-live}") then

    -- UNIFIÉ / INTERACTIF : Si et seulement si le format cible est live-html
    if quarto.doc.is_format("html") or quarto.doc.is_format("live-html") then
      cell_counter = cell_counter + 1
      local cell_id = "ocaml-cell-" .. tostring(cell_counter)
      local code_content = escape_html(block.text)

      local html = string.format([[
<div class="ocaml-live-cell" id="%s">
  <div class="ocaml-live-editor-container">
    <textarea class="ocaml-live-source" style="display:none;">%s</textarea>
    <div class="ocaml-live-editor"></div>
  </div>
  <div class="ocaml-live-controls">
    <button class="ocaml-live-run-btn" disabled>Chargement du noyau OCaml...</button>
  </div>
  <div class="ocaml-live-output-container">
    <pre class="ocaml-live-stdout"></pre>
    <pre class="ocaml-live-stderr"></pre>
  </div>
</div>
]], cell_id, code_content)

      return pandoc.RawBlock("html", html)
    end
  end

  -- Pour tous les autres formats (html standard, pdf, etc.) :
  -- On retourne le bloc intouchable pour que Jupyter OCaml l'évaluera.
  return block
end
