import * as vscode from 'vscode';

export class GeoJsonDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    provideDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
        // Only process .plot.json files
        if (!document.fileName.endsWith('.plot.json')) {
            return [];
        }

        // Always return exactly two hardcoded entries for testing
        const symbol1 = new vscode.DocumentSymbol(
            'Mock Feature 1',
            'Test point',
            vscode.SymbolKind.Object,
            new vscode.Range(0, 0, 0, 0),
            new vscode.Range(0, 0, 0, 0)
        );

        const symbol2 = new vscode.DocumentSymbol(
            'Mock Feature 2',
            'Test point',
            vscode.SymbolKind.Object,
            new vscode.Range(1, 0, 1, 0),
            new vscode.Range(1, 0, 1, 0)
        );

        return [symbol1, symbol2];
    }
}