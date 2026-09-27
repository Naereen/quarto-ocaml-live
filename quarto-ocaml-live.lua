-- Fonction d'échappement HTML pure Lua
local function escape_html(str)
  local replacements = {
    ['&'] = '&amp;',
    ['<'] = '&lt;',
    ['>'] = '&gt;',
    ['"'] = '&quot;',
    ["'"] = '&#39;'
  }
  return (str:gsub("[&<>'\" ]", function(c)
    return replacements[c] or c
  end))
end

-- Compteur global pour générer des identifiants uniques de cellules OCaml Live
local cell_counter = 0

local function interactive_cell(code_content)
  cell_counter = cell_counter + 1
  local cell_id = "ocaml-cell-" .. tostring(cell_counter)

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
]], cell_id, escape_html(code_content))

  return pandoc.RawBlock("html", html)
end

local function is_ocaml_class(classes)
  return classes:includes("ocaml")
    or classes:includes("{ocaml}")
    or classes:includes("ocaml-live")
    or classes:includes("{ocaml-live}")
end

-- Explicit ocaml-live fences are interactive; ordinary ocaml fences stay static.
function CodeBlock(block)
  if not block.classes:includes("ocaml-live") and not block.classes:includes("{ocaml-live}") then
    return block
  end

  if quarto.doc.is_format("html") then
    return interactive_cell(block.text)
  end

  block.classes = pandoc.List({"ocaml"})
  return block
end

-- Rebuild marked Jupyter cells from their source only for HTML output.
function Div(div)
  if not div.classes:includes("cell") or div.attributes["live"] ~= "true" then
    return nil
  end
  if not quarto.doc.is_format("html") then
    return nil
  end

  for _, block in ipairs(div.content) do
    if block.t == "CodeBlock" and is_ocaml_class(block.classes) then
      return interactive_cell(block.text)
    end
  end

  return nil
end