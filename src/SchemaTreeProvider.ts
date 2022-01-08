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
		console.log("element", element);
		return element;
	}

	getChildren(element?: SchemaItem): vscode.ProviderResult<SchemaItem[]> {
		if (element) {
			console.log("element.children", element.children);
			return element.children;
		} else {
			vscode.window.showInformationMessage("Getting connection nodes...");

			return this.iterateConnections();
		}
	}

	private async iterateConnections(): Promise<SchemaItem[]> {
		let items: SchemaItem[] = new Array();

		let testItem = new SchemaItem("test", "test", "folder", this.ITEM_COLLAPSED);
		items.push(testItem);

		var conns = await azdata.connection.getConnections(true).then((connections) => { return connections; });


		conns.map((c) => {
			let connectionItem: SchemaItem = new SchemaItem(c.databaseName, "", "folder", this.ITEM_COLLAPSED);

			let tableFolder = new SchemaItem("Tables", "", "folder", this.ITEM_COLLAPSED);
			let procFolder = new SchemaItem("Procs", "", "folder", this.ITEM_COLLAPSED);

			this.getTablesForConnection(c).then((tblResult) => {
				console.log("tables result", tblResult);
				tableFolder.children.push(...tblResult);
				connectionItem.children.push(tableFolder);
			});

			this.getProcsForConnection(c).then((procsResult) => {
				procFolder.children.push(...procsResult);
				connectionItem.children.push(procFolder);
				console.log("procFolder", procFolder);
			});


			this.treeStructure.push(connectionItem);
			testItem.children.push(connectionItem);

		});

		console.log("connections:", items);

		//return items;

		return new Promise<SchemaItem[]>((resolve, reject) => {
			resolve(items);
		});
	};


	private async getItemsFromConnection(itemListSql: string, itemType: string, conn: azdata.connection.ConnectionProfile) {
		let myItems: SchemaItem[] = new Array();

		let qResult = await DAL.runQueryWithConnection(itemListSql, conn);

		qResult.rows.map((r) => {
			let item = new SchemaItem(r[1].displayValue, r[0].displayValue, itemType, this.ITEM_NONE);
			myItems.push(item);
		});
		console.log("myItems", myItems);
		return myItems;
	}

	private async getProcsForConnection(conn: azdata.connection.ConnectionProfile): Promise<SchemaItem[]> {
		let procListSql = "SELECT SCHEMA_NAME(schema_id) AS[Schema], name FROM sys.objects WHERE type = 'P'";
		let result = await this.getItemsFromConnection(procListSql, "proc", conn);

		return new Promise<SchemaItem[]>((resolve, reject) => {
			resolve(result);
		});
	}

	private async getTablesForConnection(conn: azdata.connection.ConnectionProfile): Promise<SchemaItem[]> {
		let tableListSql = "SELECT SCHEMA_NAME(schema_id) AS[Schema], name FROM sys.objects WHERE type = 'U'";
		let result = await this.getItemsFromConnection(tableListSql, "table", conn);

		return new Promise<SchemaItem[]>((resolve, reject) => {
			resolve(result);
		});
	}
}





