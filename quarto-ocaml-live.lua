local function add_dependencies()
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
end

-- Gestion des blocs de code OCaml interactifs

local cell_counter = 0

local function is_live_html()
  local ok, id = pcall(quarto.format.format_identifier)
  return ok and type(id) == "table" and id["target-format"] == "live-html"
end

local function is_ocaml_block(block)
  for _, cls in ipairs({ "ocaml", "{ocaml}", "ocaml-live", "{ocaml-live}" }) do
    if block.classes:includes(cls) then return true end
  end
  return false
end

local function unquote(value)
  value = value:gsub("^%s+", ""):gsub("%s+$", "")
  return value:match('^"(.*)"$') or value:match("^'(.*)'$") or value
end

local function to_bool(value, default)
  if value == nil then return default end
  value = tostring(value):lower()
  if value == "true" or value == "yes" then return true end
  if value == "false" or value == "no" then return false end
  return default
end

-- Parses leading `(*| key: value *)` (or `#| key: value`) lines that Quarto did not consume
-- (e.g. without the Jupyter engine), and returns the options and the remaining code.
local function parse_comment_options(text)
  local options = {}
  local lines = {}
  local in_header = true
  for line in (text .. "\n"):gmatch("(.-)\r?\n") do
    local key, value
    if in_header then
      key, value = line:match("^%s*%(%*%*?|%s*([%w_%-]+)%s*:%s*(.-)%s*%*%)%s*$")
      if not key then
        key, value = line:match("^%s*#|%s*([%w_%-]+)%s*:%s*(.-)%s*$")
      end
    end
    if key then
      options[key] = unquote(value)
    else
      in_header = false
      table.insert(lines, line)
    end
  end
  return options, table.concat(lines, "\n")
end

local function escape_html(str)
  local replacements = {
    ['&'] = '&amp;', ['<'] = '&lt;', ['>'] = '&gt;',
    ['"'] = '&quot;', ["'"] = '&#39;'
  }
  return (str:gsub("[&<>'\"]", function(c) return replacements[c] end))
end

local function live_cell_html(code, options)
  cell_counter = cell_counter + 1
  local cell_id = "ocaml-cell-" .. tostring(cell_counter)
  local caption = options.caption or ""
  local caption_html = ""
  if caption ~= "" then
    caption_html = string.format(
      '<div class="ocaml-live-caption"><h5>%s</h5></div>', escape_html(caption))
  end

  local html = string.format([[
<div class="ocaml-live-cell" id="%s" data-autorun="%s" data-eval="%s" data-echo="%s">
  <div class="ocaml-live-editor-container">
    <textarea class="ocaml-live-source" style="display:none;">%s</textarea>
    <div class="ocaml-live-editor"></div>
  </div>
  <div class="ocaml-live-controls">
    %s<button class="ocaml-live-run-btn" disabled>Chargement du noyau OCaml...</button>
  </div>
  <div class="ocaml-live-output-container">
    <pre class="ocaml-live-stdout"></pre>
    <pre class="ocaml-live-stderr"></pre>
  </div>
</div>
]], cell_id,
    tostring(to_bool(options.autorun, false)),
    tostring(to_bool(options.eval, true)),
    tostring(to_bool(options.echo, true)),
    escape_html(code), caption_html)

  return pandoc.RawBlock("html", html)
end

local function is_live(options, block)
  return to_bool(options.live, block.classes:includes("ocaml-live") or block.classes:includes("{ocaml-live}"))
end

-- Cells executed by the Jupyter engine: Quarto has already parsed the `(*| ... *)` options,
-- handled `echo`/`eval` itself, and forwarded the unknown ones (`live`, `autorun`, `caption`)
-- as attributes of the `.cell` Div.
local function process_cell_div(div)
  if not div.classes:includes("cell") then return nil end

  local code_index, code_block
  for i, el in ipairs(div.content) do
    if el.t == "CodeBlock" and is_ocaml_block(el) then
      code_index, code_block = i, el
      break
    end
  end
  if not code_block then return nil end

  local options, code = parse_comment_options(code_block.text)
  for key, value in pairs(div.attributes) do
    if options[key] == nil then options[key] = value end
  end

  if not (is_live_html() and is_live(options, code_block)) then
    if code ~= code_block.text then
      code_block.text = code
      div.content[code_index] = code_block
      return div
    end
    return nil
  end

  -- The browser kernel owns the output of live cells: drop the static Jupyter outputs.
  local content = pandoc.Blocks({})
  for i, el in ipairs(div.content) do
    if i == code_index then
      content:insert(live_cell_html(code, options))
    elseif not (el.t == "Div" and el.classes:find_if(function(c) return c:match("^cell%-output") end)) then
      content:insert(el)
    end
  end
  div.content = content
  return div
end

-- Plain OCaml code blocks (not executed by Jupyter): options are still in the code text.
local function process_code_block(block)
  if not is_ocaml_block(block) then return nil end

  local options, code = parse_comment_options(block.text)
  if is_live_html() and is_live(options, block) then
    return live_cell_html(code, options)
  end
  if code ~= block.text then
    block.text = code
    return block
  end
  return nil
end

return {
  { Div = process_cell_div },
  { CodeBlock = process_code_block },
  {
    Pandoc = function(doc)
      if cell_counter > 0 then add_dependencies() end
      return doc
    end
  }
}
