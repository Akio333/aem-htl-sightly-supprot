import * as vscode from 'vscode';
import { HTLCompletionItemProvider } from './HTLCompletionItemProvider';
import { HTLDefinitionProvider } from './HTLDefinitionProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('AEM HTL Sightly Support extension is now active!');

    const documentSelector: vscode.DocumentSelector = [
        { language: 'html', scheme: 'file' }
    ];

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            documentSelector,
            new HTLCompletionItemProvider(),
            '-', '.', '"', '\'', '@' // trigger characters
        )
    );

    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(
            documentSelector,
            new HTLDefinitionProvider()
        )
    );
}

export function deactivate() {}
