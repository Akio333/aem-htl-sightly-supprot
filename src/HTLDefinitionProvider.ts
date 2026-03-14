import * as vscode from 'vscode';

export class HTLDefinitionProvider implements vscode.DefinitionProvider {

    public async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Definition | vscode.LocationLink[] | null | undefined> {
        
        const range = document.getWordRangeAtPosition(position, /["'][^"']+["']/);
        if (!range) return null;

        const word = document.getText(range);
        const classNamePath = word.replace(/["']/g, ''); // "com.example.core.models.MyModel" -> com.example.core.models.MyModel

        // Only search for class name paths
        if (!classNamePath || !classNamePath.includes('.')) {
            return null;
        }

        const className = classNamePath.split('.').pop();
        if (!className) return null;

        const files = await vscode.workspace.findFiles(`**/${className}.java`, '**/node_modules/**');

        if (files.length > 0) {
            // Find the most likely match by checking package
            for (const file of files) {
                const content = (await vscode.workspace.fs.readFile(file)).toString();
                const packageMatch = content.match(/package\s+([a-zA-Z0-9_.]+);/);
                if (packageMatch && classNamePath.startsWith(packageMatch[1])) {
                    return new vscode.Location(file, new vscode.Position(0, 0));
                }
            }

            // Fallback: just return the first file
            return new vscode.Location(files[0], new vscode.Position(0, 0));
        }

        return null;
    }
}
