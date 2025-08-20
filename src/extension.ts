import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // Insert named section header
  const insert = vscode.commands.registerCommand('sectionHeaders.insert', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    const lang = editor.document.languageId;
    const cfg = vscode.workspace.getConfiguration();
    const patterns = cfg.get<Record<string, string>>('sectionHeaders.patterns') ?? {};
    const targetLineLength = cfg.get<number>('sectionHeaders.targetLineLength') ?? 80;
    let template = patterns[lang] || patterns['plaintext'] || '# ${name} ----';

    // Use first selection text if present, else prompt
    const primarySel = editor.selections[0];
    const selectedText = editor.document.getText(primarySel).trim();
    const defaultName = selectedText.length ? selectedText : 'Section';

    const name = selectedText.length
      ? selectedText
      : (await vscode.window.showInputBox({ prompt: 'Section name', value: defaultName })) ?? defaultName;

    // Calculate dashes for header
    const namePlaceholder = '${name}';
    let headerLine: string;

    // Start with the template, replace the name placeholder
    let processedTemplate = template.replace(namePlaceholder, name);

    // Find any existing trailing dashes in the processed template
    const trailingDashesMatch = processedTemplate.match(/(-+)$/); // Match dashes at the very end
    let contentBeforeDashes = processedTemplate;
    if (trailingDashesMatch) {
      // If trailing dashes exist, remove them to calculate the base content length
      contentBeforeDashes = processedTemplate.substring(0, processedTemplate.length - trailingDashesMatch[0].length);
    }

    // Calculate how many dashes are needed to reach the target line length
    const currentContentLength = contentBeforeDashes.length;
    const dashesToAdd = Math.max(0, targetLineLength - currentContentLength);

    // Construct the final header line
    headerLine = `${contentBeforeDashes}${'-'.repeat(dashesToAdd)}`;

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

    // Calculate dashes for rule
    const trailingDashesMatch = lineText.match(/(-+)$/); // Match dashes at the very end
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

  const sb = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  sb.text = '$(list-unordered) Header';
  sb.tooltip = 'Insert Section Header';
  sb.command = 'sectionHeaders.insert';
  sb.show();
  context.subscriptions.push(sb);
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
