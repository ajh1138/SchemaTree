import * as vscode from 'vscode';
import * as azdata from 'azdata';

export default class SchemaItem extends vscode.TreeItem {
	public children: SchemaItem[] = new Array();

	public getChildren(): SchemaItem[] {
		return this.children;
	}

	constructor(
		public objectName: string,
		public schemaName: string,
		public itemType: string,
		public collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly connectionProfile?: azdata.connection.ConnectionProfile
	) {
		super("", collapsibleState);
		this.tooltip = `${this.objectName}-foo`;
		this.description = ``;
		this.contextValue = itemType;
		this.connectionProfile = connectionProfile;

		if (itemType === "proc" || itemType === "table") {
			this.label = this.schemaName + '.' + this.objectName;
		} else if (this.itemType === "schema") {
			this.label = this.schemaName;
		}
		else {
			this.label = this.objectName;
		}
	};
}