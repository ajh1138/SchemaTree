import * as vscode from 'vscode';
import * as azdata from 'azdata';
import path = require('path');
import { makeIconPath } from './IconUtils';

export default class SchemaItem extends vscode.TreeItem {
	public children: SchemaItem[] = new Array();
	public iconName: string = "";

	public getChildren(): SchemaItem[] {
		return this.children;
	}

	public getConnectionProfile(): azdata.connection.ConnectionProfile {
		return this.connectionProfile!;
	}

	constructor(
		public objectName: string,
		public schemaName: string,
		public databaseName: string,
		public itemType: string,
		public collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly connectionProfile?: azdata.connection.ConnectionProfile
	) {
		super("", collapsibleState);
		this.tooltip = `${this.objectName}-foo`;
		this.description = ``;
		this.contextValue = itemType;
		this.connectionProfile = connectionProfile;
		this.databaseName = databaseName;

		if (itemType === "proc" || itemType === "table") {
			this.label = this.schemaName + '.' + this.objectName;
		} else if (this.itemType === "schema") {
			this.label = this.schemaName;
		} else if (this.itemType === "columnsFolder") {
			this.label = "Columns";
		} else if (this.itemType === "keysFolder") {
			this.label = "Keys";
		}
		else {
			this.label = this.objectName;
		}

		switch (this.itemType) {
			case "connection":
				this.iconPath = makeIconPath("icon-server.svg");
				break;
			case "database":
				this.iconPath = makeIconPath("icon-database.svg");
				break;
			case "proc":
				this.iconPath = makeIconPath("icon-stored-procedure.svg");
				break;
			case "table":
				this.iconPath = makeIconPath("icon-table.svg");
				break;
		}
	};
}