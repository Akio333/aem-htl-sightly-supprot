import * as vscode from 'vscode';
import * as path from 'path';

export class HTLCompletionItemProvider implements vscode.CompletionItemProvider {
    
    private sightlyAttributes = [
        'data-sly-use',
        'data-sly-unwrap',
        'data-sly-text',
        'data-sly-attribute',
        'data-sly-element',
        'data-sly-test',
        'data-sly-set',
        'data-sly-list',
        'data-sly-repeat',
        'data-sly-resource',
        'data-sly-include',
        'data-sly-template',
        'data-sly-call'
    ];

    public async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[]> {
        const linePrefix = document.lineAt(position).text.substr(0, position.character);
        const completionItems: vscode.CompletionItem[] = [];

        // 1. Auto complete for data-sly-* tags
        if (linePrefix.endsWith('data-sly-') || linePrefix.endsWith('<sly ')) {
            this.sightlyAttributes.forEach(attr => {
                const item = new vscode.CompletionItem(attr, vscode.CompletionItemKind.Property);
                completionItems.push(item);
            });
            return completionItems;
        }

        // 2. Java model path auto complete for data-sly-use
        const useRegex = /data-sly-use(?:\.[a-zA-Z0-9_]+)?=(["'])$/;
        const useMatch = linePrefix.match(useRegex);
        if (useMatch) {
            // Provide java classes
            const javaFiles = await vscode.workspace.findFiles('**/*.java', '**/node_modules/**');
            
            for (const file of javaFiles) {
                try {
                    const content = (await vscode.workspace.fs.readFile(file)).toString();
                    const packageMatch = content.match(/package\s+([a-zA-Z0-9_.]+);/);
                    const classMatch = content.match(/public\s+class\s+([a-zA-Z0-9_]+)/);
                    
                    if (packageMatch && classMatch) {
                        const fullyQualifiedName = `${packageMatch[1]}.${classMatch[1]}`;
                        const item = new vscode.CompletionItem(fullyQualifiedName, vscode.CompletionItemKind.Class);
                        item.detail = 'Java Model';
                        completionItems.push(item);
                    }
                } catch (e) {
                    // Ignore read errors
                }
            }
            return completionItems;
        }

        // 3. Completion support for Model or properties items
        // Find previously defined models in the current document
        const documentText = document.getText();
        const modelVarRegex = /data-sly-use\.([a-zA-Z0-9_]+)=["']([^"']+)["']/g;
        let match;
        const models: Record<string, string> = {};
        
        while ((match = modelVarRegex.exec(documentText)) !== null) {
            models[match[1]] = match[2];
        }

        // Check if inside expression
        const lastOpen = linePrefix.lastIndexOf('${');
        const lastClose = linePrefix.lastIndexOf('}');
        const inExpression = lastOpen > -1 && lastOpen > lastClose;

        if (inExpression) {
            // Check for @ options
            const atRegex = /@\s*([a-zA-Z0-9_]*)$/;
            const atMatch = linePrefix.match(atRegex);
            if (atMatch) {
                const options = [
                    'context', 'format', 'scheme', 'domain', 'extension', 
                    'prependPath', 'appendPath', 'fragment', 'query', 
                    'join', 'type', 'text', 'i18n', 'locale', 'hint', 'timezone'
                ];
                options.forEach(opt => {
                    const item = new vscode.CompletionItem(opt, vscode.CompletionItemKind.Keyword);
                    item.insertText = new vscode.SnippetString(`${opt}='$1'`);
                    completionItems.push(item);
                });
                return completionItems;
            }

            // Implicit objects and model names when typing something like `${var`
            const wordRegex = /\$\{([a-zA-Z0-9_]*)$/;
            const wordMatch = linePrefix.match(wordRegex);
            if (wordMatch) {
                const implicitObjects = [
                    'properties', 'pageProperties', 'inheritedPageProperties',
                    'component', 'componentContext', 'currentDesign', 'currentNode',
                    'currentPage', 'currentSession', 'designer', 'editContext',
                    'log', 'out', 'pageManager', 'reader', 'request', 'response',
                    'resource', 'resourceDesign', 'resourcePage', 'slyWcmHelper', 'xssAPI'
                ];
                implicitObjects.forEach(obj => {
                    const item = new vscode.CompletionItem(obj, vscode.CompletionItemKind.Variable);
                    completionItems.push(item);
                });

                Object.keys(models).forEach(model => {
                    const item = new vscode.CompletionItem(model, vscode.CompletionItemKind.Variable);
                    item.detail = models[model];
                    completionItems.push(item);
                });
            }

            // Check if typing properties.*
            const propsRegex = /properties\.$/;
            const propsMatch = linePrefix.match(propsRegex);
            if (propsMatch) {
                const dialogProps = await this.getDialogProperties(document.uri);
                dialogProps.forEach(prop => {
                    const item = new vscode.CompletionItem(prop, vscode.CompletionItemKind.Property);
                    item.detail = 'Dialog Property';
                    completionItems.push(item);
                });
                return completionItems;
            }

            // Check if typing a model variable: eq. `myModel.`
            const dotRegex = /([a-zA-Z0-9_]+)\.$/;
            const dotMatch = linePrefix.match(dotRegex);
            if (dotMatch) {
                const varName = dotMatch[1];
                if (models[varName]) {
                    const className = models[varName];
                    // Find properties for this model
                    const props = await this.getModelProperties(className);
                    props.forEach(prop => {
                        const item = new vscode.CompletionItem(prop, vscode.CompletionItemKind.Property);
                        item.detail = `Property of ${className}`;
                        completionItems.push(item);
                    });
                    return completionItems;
                }
            }
        }

        return completionItems;
    }

    private async getDialogProperties(docUri: vscode.Uri): Promise<string[]> {
        const dialogProps = new Set<string>();
        try {
            // Assume the HTL file is in the component folder. Component folder might be the active file's folder.
            const componentDir = path.dirname(docUri.fsPath);
            const dialogPaths = [
                path.join(componentDir, '_cq_dialog', '.content.xml'),
                path.join(componentDir, 'cq:dialog', '.content.xml')
            ];

            for (const dialogPath of dialogPaths) {
                try {
                    const uri = vscode.Uri.file(dialogPath);
                    const content = (await vscode.workspace.fs.readFile(uri)).toString();
                    
                    // Simple regex extraction for name="./propertyName"
                    // Doing regex because we don't want to add bulky XML parsers to the extension if we can avoid it
                    const nameRegex = /name="(?:.\/)?([^"]+)"/g;
                    let match;
                    while ((match = nameRegex.exec(content)) !== null) {
                        const propName = match[1];
                        // exclude slashes, at signs, or implicit references
                        if (!propName.includes('/') && !propName.startsWith('@')) {
                            dialogProps.add(propName);
                        }
                    }
                } catch (e) {
                    // Try next path if not found
                }
            }
        } catch (e) {
            console.error('Failed to get dialog properties', e);
        }
        return Array.from(dialogProps);
    }

    private async getModelProperties(className: string): Promise<string[]> {
        const properties: string[] = [];
        const classNameOnly = className.includes('.') ? className.split('.').pop()! : className;
        
        const files = await vscode.workspace.findFiles(`**/${classNameOnly}.java`, '**/node_modules/**');
        
        if (files.length > 0) {
            const file = files[0];
            const content = (await vscode.workspace.fs.readFile(file)).toString();
            
            // Extract getters (works for classes with 'public' or interfaces without 'public')
            // e.g. public String getTitle() -> title
            const getterRegex = /\b[a-zA-Z0-9_<>\[\]\.]+\s+get([A-Z][a-zA-Z0-9_]*)\s*\(\)/g;
            let match;
            while ((match = getterRegex.exec(content)) !== null) {
                const propStr = match[1];
                const propName = propStr.charAt(0).toLowerCase() + propStr.slice(1);
                properties.push(propName);
            }

            // Extract is boolean getters
            // e.g. public boolean isActive() -> active
            const isRegex = /\b[a-zA-Z0-9_<>\[\]\.]+\s+is([A-Z][a-zA-Z0-9_]*)\s*\(\)/g;
            while ((match = isRegex.exec(content)) !== null) {
                const propStr = match[1];
                const propName = propStr.charAt(0).toLowerCase() + propStr.slice(1);
                properties.push(propName);
            }
        }
        
        return properties;
    }
}
