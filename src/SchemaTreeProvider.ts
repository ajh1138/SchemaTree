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

	procs: SchemaItem[] = new Array();
	tables: SchemaItem[] = new Array();
	views: SchemaItem[] = new Array();

	constructor() {
		this.treeStructure = new Array();
	}

	getTreeItem(element: SchemaItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element;
	}

	getChildren(element?: SchemaItem): vscode.ProviderResult<SchemaItem[]> {
		if (element) {
			// determine the type of item and get its children...
			let children = this.getChildrenOfItem(element).then((c) => { return c; });
			//element.children = children;
			return children;
		} else {
			vscode.window.showInformationMessage("Getting connections...");

			return this.getConnections();
		}
	}

	private async getConnections(): Promise<SchemaItem[]> {
		let items: SchemaItem[] = new Array();

		var conns = await azdata.connection.getConnections(false).then((connections) => { return connections; });
		var activeConnections = await azdata.connection.getActiveConnections().then((connections) => { return connections; });
		var activeConnectionIds = activeConnections.map((c) => { return c.connectionId; });

		for (let i = 0; i < conns.length; i++) {
			let thisConn = conns[i];
			let connectionItem: SchemaItem = new SchemaItem(thisConn.serverName, "", "", "connection", this.ITEM_COLLAPSED, thisConn);
			items.push(connectionItem);
		};

		return new Promise<SchemaItem[]>((resolve, reject) => {
			resolve(items);
		});
	};

	private async getChildrenOfItem(item: SchemaItem): Promise<SchemaItem[]> {
		let children: SchemaItem[] = new Array<SchemaItem>();

		switch (item.itemType) {
			case "connection":
				children = await this.getDatabasesFromConnection(item.connectionProfile!);
				break;
			case "database":
				children = await this.makeFoldersForDatabase(item.databaseName, item.connectionProfile);
				break;
			case "tablesFolder":
				children = await this.getTablesForDatabase(item.databaseName, item.connectionProfile);
				break;
			// case "":

			// 	break;
			// case "":

			// 	break;
			// case "":

			// 	break;
			// case "":

			// 	break;
			// case "":

			// 	break;
			// case "":

			// 	break;
			// case "":

			// 	break;
			// case "":

			// 	break;
		}

		return new Promise<SchemaItem[]>((resolve, reject) => {
			resolve(children);
		});
	}

	private async makeFoldersForDatabase(databaseName: string, connectionProfile: azdata.connection.ConnectionProfile | undefined): Promise<SchemaItem[]> {
		let folders: SchemaItem[] = new Array<SchemaItem>();

		let tblFolder = new SchemaItem("Tables", "", databaseName, "tablesFolder", this.ITEM_COLLAPSED, connectionProfile);
		let viewsFolder = new SchemaItem("Views", "", databaseName, "viewsFolder", this.ITEM_COLLAPSED, connectionProfile);
		let procFolder = new SchemaItem("Procs", "", databaseName, "procsFolder", this.ITEM_COLLAPSED, connectionProfile);

		folders.push(tblFolder);
		folders.push(viewsFolder);
		folders.push(procFolder);

		return new Promise<SchemaItem[]>((resolve, reject) => {
			resolve(folders);
		});
	}

	private async getDatabasesFromConnection(conn: azdata.connection.ConnectionProfile): Promise<SchemaItem[]> {
		let dbFolders: SchemaItem[] = new Array();
		let dbListSql = "select [name] from sys.databases WHERE name NOT IN('master', 'tempdb', 'model', 'msdb') order by name;";

		let qResult = await DAL.runQueryWithConnection(dbListSql, conn);

		qResult.rows.map((r) => {
			let dbName = r[0].displayValue;
			let item = new SchemaItem(dbName, "", dbName, "database", this.ITEM_COLLAPSED, conn);
			dbFolders.push(item);
		});
		console.log("dbFolders", dbFolders);
		return new Promise<SchemaItem[]>((resolve, reject) => {
			resolve(dbFolders);
		});
	}

	private async getTablesForDatabase(databaseName: string, connectionProfile: azdata.connection.ConnectionProfile | undefined): Promise<SchemaItem[]> {
		let tableListSql = `SELECT SCHEMA_NAME(schema_id) AS [Schema], name FROM sys.objects WHERE type = 'U' ORDER BY [Schema], name;`;
		let result = await this.getItemsFromConnection(tableListSql, databaseName, "table", connectionProfile!);

		return new Promise<SchemaItem[]>((resolve, reject) => {
			resolve(result);
		});
	}

	private async getItemsFromConnection(itemListSql: string, dbName: string, itemType: string, conn: azdata.connection.ConnectionProfile) {
		let myItems: SchemaItem[] = new Array();

		let qResult = await DAL.runQueryWithConnection(itemListSql, conn);

		try {
			qResult.rows.map((r) => {
				let item = new SchemaItem(r[1].displayValue, r[0].displayValue, dbName, itemType, this.ITEM_NONE, conn);
				myItems.push(item);
			});
		} catch (err) {
			console.log("err:", err);
		}

		return myItems;
	}



	// private async getSchemasFromDatabase(dbName: string, conn: azdata.connection.ConnectionProfile): Promise<SchemaItem[]> {
	// 	let result: SchemaItem[] = new Array();
	// 	let schemaListSql = `USING ${dbName}; SELECT Name FROM sys.schemas ORDER BY Name;`;

	// 	let qResult = await DAL.runQueryWithConnection(schemaListSql, conn);

	// 	qResult.rows.map((r) => {
	// 		let item = new SchemaItem(r[0].displayValue, "", "folder", this.ITEM_COLLAPSED);
	// 		result.push(item);
	// 	});
	// 	console.log("schemas:", result);
	// 	return new Promise<SchemaItem[]>((resolve, reject) => {
	// 		resolve(result);
	// 	});
	// }

	// private async getProcsFromSchema(schemaName: string, conn: azdata.connection.ConnectionProfile): Promise<SchemaItem[]> {
	// 	let procListSql = `SELECT SCHEMA_NAME(schema_id) AS [Schema], name FROM sys.objects WHERE type = 'P' AND SCHEMA_NAME(schema_id) = '${schemaName}' ORDER BY name;`;
	// 	let result = await this.getItemsFromConnection(procListSql, "proc", conn);
	// 	console.log("procs:", result);
	// 	return new Promise<SchemaItem[]>((resolve, reject) => {
	// 		resolve(result);
	// 	});
	// }

	// private async getTablesFromDatabase(conn: azdata.connection.ConnectionProfile): Promise<SchemaItem[]> {
	// 	let tableListSql = `SELECT SCHEMA_NAME(schema_id) AS [Schema], name FROM sys.objects WHERE type = 'U' WHERE SCHEMA_NAME(schema_id) = '${schemaName}' ORDER BY name;`;
	// 	let result = await this.getItemsFromConnection(tableListSql, "table", conn);

	// 	return new Promise<SchemaItem[]>((resolve, reject) => {
	// 		resolve(result);
	// 	});
	// }

	private separateIntoSchemas(folderIn: SchemaItem, schemaFolders: SchemaItem[]): SchemaItem {
		let resultFolder = new SchemaItem(folderIn.objectName, folderIn.schemaName, folderIn.databaseName, folderIn.itemType, folderIn.collapsibleState);
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









