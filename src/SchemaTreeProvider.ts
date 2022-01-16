import * as vscode from 'vscode';
import * as azdata from 'azdata';

import SchemaItem from './SchemaItem';
import * as DAL from './SchemaTreeDataAccessLayer';
import { table } from 'console';
import { resolve } from 'path';
import { Schema } from 'inspector';

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

		try {
			var conns = await azdata.connection.getConnections(false).then((connections) => { return connections; });
			var activeConnections = await azdata.connection.getActiveConnections().then((connections) => { return connections; });
			var activeConnectionIds = activeConnections.map((c) => { return c.connectionId; });

			for (let i = 0; i < conns.length; i++) {
				let thisConn = conns[i];
				let connectionItem: SchemaItem = new SchemaItem(thisConn.serverName, "", "", "connection", this.ITEM_COLLAPSED, thisConn);
				items.push(connectionItem);
			};
		} catch (err) {
			vscode.window.showErrorMessage(`Error in getConnections(). ${err}`);
		} finally {
			return new Promise<SchemaItem[]>((resolve, reject) => {
				resolve(items);
			});
		}
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
				children = await this.getTablesForDatabase(item.databaseName, item.connectionProfile!);
				break;
			case "tablesSchemaFolder":
				children = item.children;
				break;
			case "procsFolder":
				this.getProcsFromObjectExplorer(item);
				children = await this.getProcsForDatabase(item.databaseName, item.connectionProfile!);
				break;
			case "procsSchemaFolder":
				children = item.children;
				break;
			case "viewsFolder":
				children = await this.getViewsForDatabase(item.databaseName, item.connectionProfile!);
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
		}

		return new Promise<SchemaItem[]>((resolve, reject) => {
			resolve(children);
		});
	}

	private async makeFoldersForDatabase(databaseName: string, connectionProfile: azdata.connection.ConnectionProfile | undefined): Promise<SchemaItem[]> {
		let folders: SchemaItem[] = new Array<SchemaItem>();

		let tblFolder = new SchemaItem("Tables", "", databaseName, "tablesFolder", this.ITEM_COLLAPSED, connectionProfile);
		let viewsFolder = new SchemaItem("Views", "", databaseName, "viewsFolder", this.ITEM_COLLAPSED, connectionProfile);
		let procsFolder = new SchemaItem("Procs", "", databaseName, "procsFolder", this.ITEM_COLLAPSED, connectionProfile);

		folders.push(tblFolder);
		folders.push(viewsFolder);
		folders.push(procsFolder);

		return new Promise<SchemaItem[]>((resolve, reject) => {
			resolve(folders);
		});
	}

	private async getDatabasesFromConnection(conn: azdata.connection.ConnectionProfile): Promise<SchemaItem[]> {
		let dbFolders: SchemaItem[] = new Array();
		let dbListSql = "select [name] from sys.databases WHERE name NOT IN('master', 'tempdb', 'model', 'msdb') order by name;";

		try {
			let qResult = await DAL.runQueryWithConnection(dbListSql, conn);

			qResult.rows.map((r) => {
				let dbName = r[0].displayValue;
				let item = new SchemaItem(dbName, "", dbName, "database", this.ITEM_COLLAPSED, conn);
				dbFolders.push(item);
			});
		} catch (err) {
			vscode.window.showErrorMessage(`Error running query in getDatabasesFromConnection(). ${err}`);
		} finally {
			return new Promise<SchemaItem[]>((resolve, reject) => {
				resolve(dbFolders);
			});
		}
	}

	private async getTablesForDatabase(databaseName: string, connectionProfile: azdata.connection.ConnectionProfile): Promise<SchemaItem[]> {
		let result: SchemaItem[] = new Array();

		try {
			let tableListSql = `SELECT SCHEMA_NAME(schema_id) AS [Schema], name FROM sys.objects WHERE type = 'U' ORDER BY [Schema], name;`;
			let tablesList = await this.getItemsFromConnection(tableListSql, databaseName, "table", connectionProfile!);
			result = this.separateIntoSchemas(tablesList, "tablesSchemaFolder");
		} catch (error) {
			console.error('Exception ' + error);
			vscode.window.showErrorMessage(`Error in . ${error}`);
		} finally {
			return new Promise<SchemaItem[]>((resolve, reject) => {
				resolve(result);
			});
		}
	}

	private async getProcsForDatabase(databaseName: string, connectionProfile: azdata.connection.ConnectionProfile): Promise<SchemaItem[]> {
		let tableListSql = `SELECT ROUTINE_SCHEMA, ROUTINE_NAME, ROUTINE_DEFINITION FROM ${databaseName}.INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_TYPE = 'PROCEDURE';`;
		let procs = await this.getItemsFromConnection(tableListSql, databaseName, "proc", connectionProfile!);
		let result = this.separateIntoSchemas(procs, "procsSchemaFolder");

		return new Promise<SchemaItem[]>((resolve, reject) => {
			resolve(result);
		});
	}

	private async getViewsForDatabase(databaseName: string, connectionProfile: azdata.connection.ConnectionProfile): Promise<SchemaItem[]> {
		let tableListSql = `SELECT SCHEMA_NAME(schema_id) AS [Schema], name FROM sys.objects WHERE type = 'V' ORDER BY [Schema], name;`;
		let result = await this.getItemsFromConnection(tableListSql, databaseName, "view", connectionProfile!);

		return new Promise<SchemaItem[]>((resolve, reject) => {
			resolve(result);
		});
	}

	private async getItemsFromConnection(itemListSql: string, dbName: string, itemType: string, conn: azdata.connection.ConnectionProfile) {
		let myItems: SchemaItem[] = new Array();

		let qResult = await DAL.runQueryWithConnection(itemListSql, conn);

		try {
			qResult.rows.map((r) => {
				let item = new SchemaItem(r[1].displayValue, r[0].displayValue, dbName, itemType, this.ITEM_COLLAPSED, conn);
				myItems.push(item);
			});
		} catch (err) {
			console.log("error running query:", itemListSql);
			vscode.window.showErrorMessage(`Error running query in getItemsFromConnection(). ${err}`);
		} finally {
			return myItems;
		}
	}

	private async getProcsFromObjectExplorer(item: SchemaItem): Promise<SchemaItem[]> {
		let procs: SchemaItem[] = new Array();
		let foundNodes = await azdata.objectexplorer.findNodes(item.connectionProfile!.connectionId, "StoredProcedure", item.schemaName, ".", item.databaseName, [""]);

		console.log("procs - foundNodes", foundNodes);

		return new Promise((resolve, reject) => {
			resolve(procs);
		});
	}

	private separateIntoSchemas(itemsIn: SchemaItem[], foldersItemType: string): SchemaItem[] {
		let schemaFolders: SchemaItem[] = new Array();
		let allSchemas = itemsIn.map((x) => { return x.schemaName; });
		let schemas = [...new Set(allSchemas)];
		let sampleItem = itemsIn[0];

		schemas.forEach((schemaName) => {
			let thisSchemaFolder = new SchemaItem(schemaName, schemaName, sampleItem.databaseName, foldersItemType, this.ITEM_COLLAPSED, sampleItem.connectionProfile);
			let theseItems = itemsIn.filter((f) => { return f.schemaName === schemaName; });

			thisSchemaFolder.children = theseItems;
			schemaFolders.push(thisSchemaFolder);
		});

		return schemaFolders;
	}
}









