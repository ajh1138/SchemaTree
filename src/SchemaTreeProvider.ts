import * as vscode from 'vscode';
import * as azdata from 'azdata';

import SchemaItem from './SchemaItem';
import * as schemaOps from './schemaOperations';

export default class SchemaTreeProvider implements vscode.TreeDataProvider<SchemaItem>{
	constructor() {

	}

	isInitialized: boolean = false;

	getTreeItem(element: SchemaItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element;
	}

	getChildren(element?: SchemaItem): vscode.ProviderResult<SchemaItem[]> {
		if (element) {
			// determine the type of item and get its children...
			let children = schemaOps.getChildrenOfItem(element).then((c) => { return c; });
			return children;
		} else {
			if (this.isInitialized) {
				vscode.window.showInformationMessage("SchemaTree is refreshing its connection list.");
			} else {
				this.isInitialized = true;
			}

			return schemaOps.getConnections();
		}
	}

	private _onDidChangeTreeData: vscode.EventEmitter<SchemaItem | undefined | null | void> = new vscode.EventEmitter<SchemaItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<SchemaItem | undefined | null | void> = this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}
}









