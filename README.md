# Section Headers (RStudio-style)

Insert RStudio-style section headers like:

```r
# My Analysis ----
```

...and optionally fold the code between headers.

## Features

- **Section Headers: Insert Section Header** → prompts for a name (or uses selected text) and inserts a template like `# ${name} ----`.

- **Section Headers: Insert Dashed Rule** → inserts a plain dashed line like `# ------------------------------.`

- **Folding**: fold regions between header lines that match a regex.

## Default Keybindings

- Insert Section Header: `Ctrl+Shift+H` (Windows/Linux), `Cmd+Shift+H` (macOS)

- Insert Dashed Rule: `Ctrl+Shift+-` (Windows/Linux), `Cmd+Shift+-` (macOS)

Rebind in Keyboard Shortcuts if you prefer.

## Settings

- `sectionHeaders.patterns` — per-language templates. Use `${name}` placeholder.

- `sectionHeaders.foldingRegex` — header-detection regex (start-of-line).

- `sectionHeaders.ruleTemplates` — per-language dashed rule templates.

## Language Support

By default, R, Python, Julia use `#`, JS/TS/C/CPP/Java/Go/Rust use `//`. You can add others in settings.

