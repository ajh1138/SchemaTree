import * as vscode from 'vscode';
import * as azdata from 'azdata';
import SchemaItem from './SchemaItem';
import path = require('path');
import { makeIconPath } from './IconUtils';

type ColumnItemModified = Omit<SchemaItem, "label">;

export default class ColumnItem extends SchemaItem {
	//	public children: SchemaItem[] = new Array();
	public tableName: string = "";
	public columnName: string = "";
	public ordinalPosition: number | null = null;
	public columnDefault: string = "";
	public isNullable: boolean = true;
	public dataType: string = "";
	public characterMaximumLength: number | null = null;
	public characterOctetLength: number | null = null;
	public numericPrecision: number | null = null;
	public numericPrecisionRadix: number | null = null;
	public numericScale: number | null = null;
	public datetimePrecision: number | null = null;
	public characterSetName: string = "";
	public isIdentity: boolean = false;
	public isPK: boolean = false;
	public isFK: boolean = false;
	public fkSchemaAndTableName: string = "";

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
		super(objectName, schemaName, databaseName, itemType, collapsibleState, connectionProfile);
		this.tooltip = `${this.objectName}`;
		this.description = ``;
		this.contextValue = itemType;
		this.connectionProfile = connectionProfile;
		this.databaseName = databaseName;
	};
}