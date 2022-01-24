import * as vscode from 'vscode';
import * as azdata from 'azdata';
import path = require('path');
import { makeIconPath } from './IconUtils';

export default class SchemaItem extends vscode.TreeItem {
	private _iconName: string = "";

	public children: SchemaItem[] = new Array();

	public get iconName() {
		return this._iconName;
	}

	public set iconName(val) {
		this._iconName = val;
	}

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
	};
}