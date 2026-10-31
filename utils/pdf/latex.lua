-- SPDX-License-Identifier: GPL-3.0-or-later
-- Propeller-derived file; distribution notice added 2026-10-31.
-- See THIRD_PARTY_NOTICES.md and LICENSES/GPL-3.0-or-later.txt.
-- latex.lua: pandoc filter used by `just pdf`. A fenced ```latex block becomes an inline SVG: the
-- block is typeset as a standalone LaTeX document (latex → DVI → dvisvgm), so TikZ pictures, tables
-- and anything else LaTeX can draw end up in the PDF. Math in $…$, $$…$$ and ```math blocks doesn't
-- need this filter: pandoc turns it into MathML.
--
-- \usepackage and \usetikzlibrary lines at the top of a block go into the preamble. Results are
-- cached by content hash in LATEX_CACHE (set by the justfile to .pdfstamps/latex/). The class option
-- dvisvgm selects TikZ's matching driver; without it, pictures collapse in DVI mode.
-- LaTeX runs without shell escape and with paranoid file access (no parent directories, no dot
-- files), so a document can't run commands or read files outside the TeX tree.

local cache = os.getenv('LATEX_CACHE') or '.pdfstamps/latex'

local preamble = [[
\documentclass[dvisvgm,border=2pt,varwidth=16cm]{standalone}
\usepackage{amsmath,amssymb}
\usepackage{booktabs}
\usepackage{tikz}
\usetikzlibrary{arrows.meta,positioning,matrix,calc}
]]

local function read(path)
  local f = io.open(path, 'r')
  if not f then return nil end
  local s = f:read('a')
  f:close()
  return s
end

local function write(path, s)
  local f = assert(io.open(path, 'w'))
  f:write(s)
  f:close()
end

-- Split leading \usepackage / \usetikzlibrary lines from the body.
local function split(code)
  local extra, body, head = {}, {}, true
  for line in (code .. '\n'):gmatch('(.-)\n') do
    if head and (line:match('^%s*\\usepackage') or line:match('^%s*\\usetikzlibrary')) then
      extra[#extra + 1] = line
    else
      if line:match('%S') then head = false end
      body[#body + 1] = line
    end
  end
  return table.concat(extra, '\n'), table.concat(body, '\n')
end

local function render(code)
  local extra, body = split(code)
  local doc = preamble .. extra .. '\n\\begin{document}\n' .. body .. '\n\\end{document}\n'
  local svgpath = cache .. '/' .. pandoc.utils.sha1(doc) .. '.svg'
  local cached = read(svgpath)
  if cached then return cached end
  return pandoc.system.with_temporary_directory('latex-inset', function(dir)
    write(dir .. '/inset.tex', doc)
    local ok = os.execute(string.format(
      'cd %q && openin_any=p openout_any=p latex -no-shell-escape -interaction=nonstopmode '
        .. '-halt-on-error inset.tex >inset.out 2>&1 && dvisvgm --no-fonts --exact-bbox '
        .. '-o inset.svg inset.dvi >>inset.out 2>&1', dir))
    if not ok then
      io.stderr:write((read(dir .. '/inset.out') or '') .. '\n')
      error('latex.lua: a ```latex block failed to typeset; see the LaTeX log above. '
        .. 'Needs TeX Live (brew install --cask mactex-no-gui).')
    end
    local svg = assert(read(dir .. '/inset.svg'))
    os.execute(string.format('mkdir -p %q', cache))
    write(svgpath, svg)
    return svg
  end)
end

-- Several SVGs end up inline in one page, and dvisvgm names glyphs and clip paths the same way in
-- each (id='g0-99'; dvisvgm uses single quotes). Prefix every id and reference with the inset's hash so they can't collide.
local function scope(svg, prefix)
  svg = svg:gsub('^%s*<%?xml.-%?>%s*', '')
  svg = svg:gsub('(%sid=["\'])', '%1' .. prefix)
  svg = svg:gsub('(href=["\']#)', '%1' .. prefix)
  svg = svg:gsub('(url%(#)', '%1' .. prefix)
  return svg
end

function CodeBlock(el)
  if not (el.classes:includes('latex') or el.classes:includes('tex')) then return nil end
  local svg = scope(render(el.text), 'tx' .. pandoc.utils.sha1(el.text):sub(1, 8) .. '-')
  return pandoc.RawBlock('html', '<div class="latex-inset">' .. svg .. '</div>')
end
