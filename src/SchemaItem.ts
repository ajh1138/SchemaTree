import * as vscode from 'vscode';
import * as azdata from 'azdata';

export default class SchemaItem extends vscode.TreeItem {
	public children: SchemaItem[] = new Array();

	public getChildren(): SchemaItem[] {
		return this.children;
	}

	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public objectExplorerNode: azdata.objectexplorer.ObjectExplorerNode,
		public schemaName: string,
		public objectName: string
	) {
		super(objectExplorerNode.label, collapsibleState);
		this.tooltip = `${objectExplorerNode.label}-foo`;
		this.description = `${this.label}-description`;
		//	this.objectExplorerNode = objectExplorerNode;

	};
}