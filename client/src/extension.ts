/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode';
import {
    CancellationToken,
    Definition,
    Position,
    SignatureHelpContext,
    TextDocument,
    ThemableDecorationInstanceRenderOptions,
} from 'vscode';
const regex = /^:([0-9]+):([0-9]+)/gm;
const keyRegex = /\s*(STO|LDA|BRZ|ADD|SUB|OR|AND|NOT|XOR|INC|DEC|ZRO|NOP)\s*/;

export function activate(context: vscode.ExtensionContext) {
    let commands = [
        ['STO', 'Speichere den Inhalt des `ACCUs` ins RAM'],
        ['LDA', 'Lade den `ACCU` mit dem Inhalt der Adresse'],
        ['BRZ', 'Springe nach Adresse, wenn der `ACCU` Null ist'],
        ['ADD', 'Addiere den Inhalt der Adresse zum `ACCU`'],
        ['SUB', 'Subtrahiere den Inhalt der Adresse vom ACCU`'],
        ['OR', 'Logisches ODER des `ACCUs` mit dem Inhalt der Adresse'],
        ['AND', 'Logisches UND des `ACCUs` mit dem Inhalt der Adresse'],
        ['XOR', 'Logisches XOR des `ACCUs` mit dem Inhalt der Adresse'],
        ['NOT', 'Logisches NICHT der Bits im `ACCU`'],
        ['INC', 'Inkrementiere den `ACCU`'],
        ['DEC', 'Dekrementiere den `ACCU`'],
        ['ZRO', 'Setze den `ACCU` auf Null'],
        ['NOP', 'Keine Operation'],
    ];
    const decorator = vscode.window.createTextEditorDecorationType({
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        light: {
            // this color will be used in light color themes
            borderColor: 'darkblue',
        },
        dark: {
            // this color will be used in dark color themes
            borderColor: 'lightblue',
        },
    });
    let activeEditor = vscode.window.activeTextEditor;

    let timeout: NodeJS.Timer | undefined = undefined;

    function updateDecorations() {
        if (!activeEditor) {
            return;
        }
        let doc = activeEditor.document;
        const lineDecorators: vscode.DecorationOptions[] = [];
        let internal = 0;
        for (let line = 0; line < activeEditor.document.lineCount; line++) {
            let sr = doc.lineAt(line).text;
            if (keyRegex.exec(sr)) {
                let lineStr = internal + ' ';
                while (lineStr.length < 4) {
                    lineStr += ' ';
                }
                console.log(lineStr);
                let decorator: ThemableDecorationInstanceRenderOptions = {
                    before: {
                        contentText: lineStr,
                        color: '#777777',
                    },
                };
                const decoration = {
                    range: new vscode.Range(new Position(line, 0), new Position(line, 3)),
                    hoverMessage: 'Hello World' + line,
                    renderOptions: {
                        dark: decorator,
                        light: decorator,
                    },
                };
                lineDecorators.push(decoration);
                internal += 1;
            }
        }
        activeEditor.setDecorations(decorator, lineDecorators);
    }

    function triggerUpdateDecorations(throttle = false) {
        if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
        }
        if (throttle) {
            timeout = setTimeout(updateDecorations, 500);
        } else {
            updateDecorations();
        }
    }

    if (activeEditor) {
        triggerUpdateDecorations();
    }

    vscode.window.onDidChangeActiveTextEditor(
        (editor) => {
            activeEditor = editor;
            if (editor) {
                triggerUpdateDecorations();
            }
        },
        null,
        context.subscriptions
    );

    vscode.workspace.onDidChangeTextDocument(
        (event) => {
            if (activeEditor && event.document === activeEditor.document) {
                triggerUpdateDecorations(true);
            }
        },
        null,
        context.subscriptions
    );

    let prs = vscode.languages.registerSignatureHelpProvider('toy', {
        provideSignatureHelp(
            document: TextDocument,
            position: Position,
            token: CancellationToken,
            context: SignatureHelpContext
        ) {
            let help = new vscode.SignatureHelp();
            help.signatures = [new vscode.SignatureInformation('Hello wOrld')];
            help.activeParameter = 0;
            help.activeSignature = 0;
            return help;
        },
    });
    let pro = vscode.languages.registerHoverProvider('toy', {
        provideHover(document: TextDocument, position: Position, token: CancellationToken) {
            let line = position.line;
            let range = new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, 3));
            let code = document.getText(range);
            let lookup = commands.find((ref) => ref[0].toUpperCase() == code.toUpperCase()) || ['', ''];

            if (code.startsWith(':')) {
                let altRange = new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, 20));
                code = document.getText(altRange);
                let match = regex.exec(code);
                if (match) {
                    let length = match[1].length + match[2].length + 2;
                    let adress = match[1];
                    let constant = match[2];
                    return new vscode.Hover(
                        new vscode.MarkdownString(`Speichert die Konstante \`${constant}\` in Adresse \`${adress}\``),
                        new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, length))
                    );
                }
                return new vscode.Hover(new vscode.MarkdownString(''), range);
            } else {
                return new vscode.Hover(new vscode.MarkdownString(lookup[1]), range);
            }
        },
    });
    const provider1 = vscode.languages.registerCompletionItemProvider('toy', {
        provideCompletionItems(
            document: vscode.TextDocument,
            position: vscode.Position,
            token: vscode.CancellationToken,
            context: vscode.CompletionContext
        ) {
            let lst = [];
            let index = 0;
            commands.forEach((ref) => {
                let name = ref[0];
                let desc = ref[1];
                const item = new vscode.CompletionItem(name);
                item.documentation = new vscode.MarkdownString(desc);
                item.kind = vscode.CompletionItemKind.Enum;
                item.detail = 'OP-Code: ' + index++;
                lst.push(item);
            });
            return lst;

            // a simple completion item which inserts `Hello World!`
            //const simpleCompletion = new vscode.CompletionItem('Hello World!');
            //
            //// a completion item that inserts its text as snippet,
            //// the `insertText`-property is a `SnippetString` which will be
            //// honored by the editor.
            //const snippetCompletion = new vscode.CompletionItem('Good part of the day');
            //snippetCompletion.insertText = new vscode.SnippetString('Good ${1|morning,afternoon,evening|}. It is ${1}, right?');
            //const docs: any = new vscode.MarkdownString("Inserts a snippet that lets you select [link](x.ts).");
            //snippetCompletion.documentation = docs;
            //docs.baseUri = vscode.Uri.parse('http://example.com/a/b/c/');
            //
            //// a completion item that can be accepted by a commit character,
            //// the `commitCharacters`-property is set which means that the completion will
            //// be inserted and then the character will be typed.
            //const commitCharacterCompletion = new vscode.CompletionItem('console');
            //commitCharacterCompletion.commitCharacters = ['.'];
            //commitCharacterCompletion.documentation = new vscode.MarkdownString('Press `.` to get `console.`');
            //
            //// a completion item that retriggers IntelliSense when being accepted,
            //// the `command`-property is set which the editor will execute after
            //// completion has been inserted. Also, the `insertText` is set so that
            //// a space is inserted after `new`
            //const commandCompletion = new vscode.CompletionItem('new');
            //commandCompletion.kind = vscode.CompletionItemKind.Keyword;
            //commandCompletion.insertText = 'new ';
            //commandCompletion.command = { command: 'editor.action.triggerSuggest', title: 'Re-trigger completions...' };
            //
            //// return all completion items as array
            //return [
            //	//simpleCompletion,
            //	//snippetCompletion,
            //	//commitCharacterCompletion,
            //	//commandCompletion
            //
            //];
        },
    });

    context.subscriptions.push(provider1, pro);
}
