import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // Insert named section header (Esc cancels)
  const insert = vscode.commands.registerCommand('sectionHeaders.insert', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    const lang = editor.document.languageId;
    const cfg = vscode.workspace.getConfiguration();
    const patterns = cfg.get<Record<string, string>>('sectionHeaders.patterns') ?? {};
    const targetLineLength = cfg.get<number>('sectionHeaders.targetLineLength') ?? 80;
    const template = patterns[lang] || patterns['plaintext'] || '# ${name} ----';

    // Use first selection text if present, else prompt
    const primarySel = editor.selections[0];
    const selectedText = editor.document.getText(primarySel).trim();
    const defaultName = selectedText.length ? selectedText : 'Section';

    let name: string;
    if (selectedText.length) {
      name = selectedText;
    } else {
      const input = await vscode.window.showInputBox({
        prompt: 'Section name',
        value: defaultName,
        ignoreFocusOut: true
      });
      if (input === undefined) {
        // Esc pressed → cancel entirely
        return;
      }
      name = input.trim().length ? input.trim() : defaultName;
    }

    // Build header line to target length by adjusting trailing dashes
    const processedTemplate = template.replace('${name}', name);
    const trailingDashesMatch = processedTemplate.match(/(-+)$/); // dashes at end
    let contentBeforeDashes = processedTemplate;
    if (trailingDashesMatch) {
      contentBeforeDashes = processedTemplate.substring(
        0,
        processedTemplate.length - trailingDashesMatch[0].length
      );
    }
    const currentContentLength = contentBeforeDashes.length;
    const dashesToAdd = Math.max(0, targetLineLength - currentContentLength);
    const headerLine = `${contentBeforeDashes}${'-'.repeat(dashesToAdd)}`;

    await editor.edit((edit: vscode.TextEditorEdit) => {
      const doneLines = new Set<number>();
      for (const sel of editor.selections) {
        const line = sel.start.line;
        if (doneLines.has(line)) continue;
        doneLines.add(line);
        const pos = new vscode.Position(line, 0);
        edit.insert(pos, headerLine + '\n');
      }
    });
  });

  // Insert dashed rule (no name)
  const rule = vscode.commands.registerCommand('sectionHeaders.rule', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    const lang = editor.document.languageId;
    const cfg = vscode.workspace.getConfiguration();
    const rules = cfg.get<Record<string, string>>('sectionHeaders.ruleTemplates') ?? {};
    const targetLineLength = cfg.get<number>('sectionHeaders.targetLineLength') ?? 80;
    let lineText = rules[lang] || rules['plaintext'] || '# ------------------------------';

    // Adjust trailing dashes to reach target length
    const trailingDashesMatch = lineText.match(/(-+)$/);
    let contentBeforeDashes = lineText;
    if (trailingDashesMatch) {
      contentBeforeDashes = lineText.substring(0, lineText.length - trailingDashesMatch[0].length);
    }
    const currentContentLength = contentBeforeDashes.length;
    const dashesToAdd = Math.max(0, targetLineLength - currentContentLength);
    lineText = `${contentBeforeDashes}${'-'.repeat(dashesToAdd)}`;

    await editor.edit((edit: vscode.TextEditorEdit) => {
      const doneLines = new Set<number>();
      for (const sel of editor.selections) {
        const line = sel.start.line;
        if (doneLines.has(line)) continue;
        doneLines.add(line);
        const pos = new vscode.Position(line, 0);
        edit.insert(pos, lineText + '\n');
      }
    });
  });

  // Folding provider for R files (add more languages if you like)
  const folding = vscode.languages.registerFoldingRangeProvider(
    [
      { language: 'r', scheme: 'file' },
      { language: 'r', scheme: 'untitled' }
    ],
    new HeaderFoldingProvider()
  );

  context.subscriptions.push(insert, rule, folding);

  // (Status bar button removed as requested)
}

class HeaderFoldingProvider implements vscode.FoldingRangeProvider {
  async provideFoldingRanges(
    document: vscode.TextDocument,
    _context: vscode.FoldingContext,
    _token: vscode.CancellationToken
  ): Promise<vscode.FoldingRange[]> {
    const cfg = vscode.workspace.getConfiguration();
    const pattern = cfg.get<string>('sectionHeaders.foldingRegex') ?? '^(#|//|/\\*)\\s?.*----\\s*$';
    const re = new RegExp(pattern);

    const headerLines: number[] = [];
    for (let i = 0; i < document.lineCount; i++) {
      if (re.test(document.lineAt(i).text)) headerLines.push(i);
    }
    if (headerLines.length === 0) return [];

    const ranges: vscode.FoldingRange[] = [];
    for (let i = 0; i < headerLines.length; i++) {
      const start = headerLines[i];
      const end = (i + 1 < headerLines.length) ? headerLines[i + 1] - 1 : document.lineCount - 1;
      if (end > start) {
        ranges.push(new vscode.FoldingRange(start, end, vscode.FoldingRangeKind.Region));
      }
    }
    return ranges;
  }
}

export function deactivate() {}
