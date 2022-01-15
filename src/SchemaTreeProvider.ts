import * as vscode from 'vscode';
import * as azdata from 'azdata';

import SchemaItem from './SchemaItem';
import * as DAL from './SchemaTreeDataAccessLayer';
import { table } from 'console';
import { resolve } from 'path';

export default class SchemaTreeProvider implements vscode.TreeDataProvider<SchemaItem>{

	treeStructure: SchemaItem[];

	procsFolder?: SchemaItem;

	nodesToSkip = ["Service Broker", "Storage", "Security"];

	ITEM_COLLAPSED = vscode.TreeItemCollapsibleState.Collapsed;
	ITEM_NONE = vscode.TreeItemCollapsibleState.None;
	ITEM_EXPANDED = vscode.TreeItemCollapsibleState.Expanded;

	constructor() {
		this.treeStructure = new Array();
	}

	getTreeItem(element: SchemaItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element;
	}

	getChildren(element?: SchemaItem): vscode.ProviderResult<SchemaItem[]> {
		if (element) {
			return element.children;
		} else {
			vscode.window.showInformationMessage("Getting connection nodes...");

			return this.buildConnectionsTree();
		}
	}

	private async buildConnectionsTree(): Promise<SchemaItem[]> {
		let items: SchemaItem[] = new Array();

		//	let testItem = new SchemaItem("test", "test", "folder", this.ITEM_COLLAPSED);
		//items.push(testItem);

		var conns = await azdata.connection.getConnections(false).then((connections) => { return connections; });
		var activeConnections = await azdata.connection.getActiveConnections().then((connections) => { return connections; });
		var activeConnectionIds = activeConnections.map((c) => { return c.connectionId; });

		for (let i = 0; i < conns.length; i++) {
			let thisConn = conns[i];
			let connectionItem: SchemaItem = new SchemaItem(thisConn.serverName, "", "connection", this.ITEM_COLLAPSED);
			console.log("thisConn", thisConn);
			// get the items if this connection is active...
			if (activeConnectionIds.includes(thisConn.connectionId)) {
				let dbFolders = await this.getDatabasesFromConnection(thisConn);
				connectionItem.children.push(...dbFolders);

				let schemaFolders = await this.getSchemasFromConnection(thisConn);


				let tableFolder = new SchemaItem("Tables", "", "folder", this.ITEM_COLLAPSED);
				let procFolder = new SchemaItem("Procs", "", "folder", this.ITEM_COLLAPSED);

				let tableItems = await this.getTablesFromConnection(thisConn);
				let procItems = await this.getProcsFromConnection(thisConn);

				tableFolder.children.push(...tableItems);
				procFolder.children.push(...procItems);

				tableFolder = this.separateIntoSchemas(tableFolder, schemaFolders);
				procFolder = this.separateIntoSchemas(procFolder, schemaFolders);

				connectionItem.children.push(tableFolder);
				connectionItem.children.push(procFolder);
			}

			items.push(connectionItem);
		};

		return new Promise<SchemaItem[]>((resolve, reject) => {
			resolve(items);
		});
	};


	private async getItemsFromConnection(itemListSql: string, itemType: string, conn: azdata.connection.ConnectionProfile) {
		let myItems: SchemaItem[] = new Array();

		let qResult = await DAL.runQueryWithConnection(itemListSql, conn);

		qResult.rows.map((r) => {
			let item = new SchemaItem(r[1].displayValue, r[0].displayValue, itemType, this.ITEM_NONE, conn);
			myItems.push(item);
		});

		return myItems;
	}

	private async getDatabasesFromConnection(conn: azdata.connection.ConnectionProfile): Promise<SchemaItem[]> {
		let dbFolders: SchemaItem[] = new Array();
		let dbListSql = "select [name] from sys.databases WHERE name NOT IN('master', 'tempdb', 'model', 'msdb') order by name";

		let qResult = await DAL.runQueryWithConnection(dbListSql, conn);

		qResult.rows.map((r) => {
			let item = new SchemaItem(r[0].displayValue, "", "folder", this.ITEM_COLLAPSED);
			dbFolders.push(item);
		});

		return new Promise<SchemaItem[]>((resolve, reject) => {
			resolve(dbFolders);
		});
	}

	private async getSchemasFromConnection(conn: azdata.connection.ConnectionProfile): Promise<SchemaItem[]> {
		let result: SchemaItem[] = new Array();
		let schemaListSql = "SELECT Name FROM sys.schemas ORDER BY Name;";

		let qResult = await DAL.runQueryWithConnection(schemaListSql, conn);

		qResult.rows.map((r) => {
			let item = new SchemaItem(r[0].displayValue, "", "folder", this.ITEM_COLLAPSED);
			result.push(item);
		});

		return new Promise<SchemaItem[]>((resolve, reject) => {
			resolve(result);
		});
	}

	private async getProcsFromConnection(conn: azdata.connection.ConnectionProfile): Promise<SchemaItem[]> {
		let procListSql = "SELECT SCHEMA_NAME(schema_id) AS[Schema], name FROM sys.objects WHERE type = 'P' ORDER BY SCHEMA_NAME(schema_id)";
		let result = await this.getItemsFromConnection(procListSql, "proc", conn);

		return new Promise<SchemaItem[]>((resolve, reject) => {
			resolve(result);
		});
	}

	private async getTablesFromConnection(conn: azdata.connection.ConnectionProfile): Promise<SchemaItem[]> {
		let tableListSql = "SELECT SCHEMA_NAME(schema_id) AS[Schema], name FROM sys.objects WHERE type = 'U' ORDER BY SCHEMA_NAME(schema_id)";
		let result = await this.getItemsFromConnection(tableListSql, "table", conn);

		return new Promise<SchemaItem[]>((resolve, reject) => {
			resolve(result);
		});
	}

	private separateIntoSchemas(folderIn: SchemaItem, schemaFolders: SchemaItem[]): SchemaItem {
		let resultFolder = new SchemaItem(folderIn.objectName, folderIn.schemaName, folderIn.itemType, folderIn.collapsibleState);
		let currentSchemaName = "";

		schemaFolders.forEach((schemaFolder) => {
			currentSchemaName = schemaFolder.objectName;
			let thisSchemasItems = folderIn.children.filter((y) => { return y.schemaName === currentSchemaName; });

			if (thisSchemasItems.length > 0) {
				schemaFolder.children.push(...thisSchemasItems);
				resultFolder.children.push(schemaFolder);
			}
		});

		return resultFolder;
	}
}







