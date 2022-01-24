'use strict';

import * as vscode from 'vscode';
import * as azdata from 'azdata';

import * as DAL from './SchemaTreeDataAccessLayer';
import SchemaItem from './schemaItem';
import { getProcDefinition, getTableDefinition } from './definitionsOperations';
import ColumnItem from './ColumnItem';
import { cpuUsage } from 'process';
import { parse } from 'path';
import { makeIconPath } from './IconUtils';

const nodesToSkip = ["Service Broker", "Storage", "Security"];

const ITEM_COLLAPSED = vscode.TreeItemCollapsibleState.Collapsed;
const ITEM_NONE = vscode.TreeItemCollapsibleState.None;
const ITEM_EXPANDED = vscode.TreeItemCollapsibleState.Expanded;


export async function getChildrenOfItem(item: SchemaItem): Promise<SchemaItem[]> {
	let children: SchemaItem[] = new Array<SchemaItem>();

	switch (item.itemType) {
		case "connection":
			children = await getDatabasesFromConnection(item.connectionProfile!);
			break;
		case "database":
			children = await makeFoldersForDatabase(item.databaseName, item.connectionProfile);
			break;
		case "tablesFolder":
			children = await getTablesForDatabase(item.databaseName, item.connectionProfile!);
			break;
		case "tablesSchemaFolder":
			children = item.children;
			break;
		case "table":
			children = await getColumnsForTable(item);
			let folders = await makeFoldersForTable(item);
			children.push(...folders);
			break;
		case "procsFolder":
			//				getProcsFromObjectExplorer(item);
			children = await getProcsForDatabase(item.databaseName, item.connectionProfile!);
			break;
		case "procsSchemaFolder":
			children = item.children;
			break;
		case "viewsFolder":
			children = await getViewsForDatabase(item.databaseName, item.connectionProfile!);
			break;
		case "columnsFolder":
			children = await getColumnsForTable(item);
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
	}

	return new Promise<SchemaItem[]>((resolve, reject) => {
		resolve(children);
	});
}

export async function getConnections(): Promise<SchemaItem[]> {
	let items: SchemaItem[] = new Array();

	try {
		var conns = await azdata.connection.getConnections(false).then((connections) => { return connections; });
		var activeConnections = await azdata.connection.getActiveConnections().then((connections) => { return connections; });
		console.log("activeConnections:", activeConnections);
		var activeConnectionIds = activeConnections.map((c) => { return c.connectionId; });

		for (let i = 0; i < conns.length; i++) {
			let thisConn = conns[i];
			if (activeConnectionIds.includes(thisConn.connectionId)) {
				let connectionItem: SchemaItem = new SchemaItem(thisConn.serverName, "", "", "connection", ITEM_COLLAPSED, thisConn);
				items.push(connectionItem);
			}
		};
	} catch (err) {
		vscode.window.showErrorMessage(`Error in getConnections(). ${err}`);
	} finally {
		return new Promise<SchemaItem[]>((resolve, reject) => {
			resolve(items);
		});
	}
};

export async function makeFoldersForDatabase(databaseName: string, connectionProfile: azdata.connection.ConnectionProfile | undefined): Promise<SchemaItem[]> {
	let folders: SchemaItem[] = new Array<SchemaItem>();

	let tblFolder = new SchemaItem("Tables", "", databaseName, "tablesFolder", ITEM_COLLAPSED, connectionProfile);
	let viewsFolder = new SchemaItem("Views", "", databaseName, "viewsFolder", ITEM_COLLAPSED, connectionProfile);
	let procsFolder = new SchemaItem("Procs", "", databaseName, "procsFolder", ITEM_COLLAPSED, connectionProfile);

	folders.push(tblFolder);
	folders.push(viewsFolder);
	folders.push(procsFolder);

	return new Promise<SchemaItem[]>((resolve, reject) => {
		resolve(folders);
	});
}

export async function getDatabasesFromConnection(conn: azdata.connection.ConnectionProfile): Promise<SchemaItem[]> {
	let dbFolders: SchemaItem[] = new Array();
	let dbListSql = "select [name] from sys.databases WHERE name NOT IN('master', 'tempdb', 'model', 'msdb') order by name;";

	try {
		let qResult = await DAL.runQueryWithConnection(dbListSql, conn);

		qResult.rows.map((r) => {
			let dbName = r[0].displayValue;
			let item = new SchemaItem(dbName, "", dbName, "database", ITEM_COLLAPSED, conn);
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

export async function getTablesForDatabase(databaseName: string, connectionProfile: azdata.connection.ConnectionProfile): Promise<SchemaItem[]> {
	let result: SchemaItem[] = new Array();

	try {
		let tableListSql = `SELECT SCHEMA_NAME(schema_id) AS [Schema], name FROM sys.objects WHERE type = 'U' ORDER BY [Schema], name;`;
		let tablesList = await getItemsFromConnection(tableListSql, databaseName, "table", connectionProfile!);
		console.log("tablesList: ", tablesList);
		result = separateIntoSchemas(tablesList, "tablesSchemaFolder");
	} catch (error) {
		console.error('Exception ' + error);
		vscode.window.showErrorMessage(`Error in . ${error}`);
	} finally {
		return new Promise<SchemaItem[]>((resolve, reject) => {
			resolve(result);
		});
	}
}

export async function getProcsForDatabase(databaseName: string, connectionProfile: azdata.connection.ConnectionProfile): Promise<SchemaItem[]> {
	let tableListSql = `SELECT ROUTINE_SCHEMA, ROUTINE_NAME, ROUTINE_DEFINITION FROM ${databaseName}.INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_TYPE = 'PROCEDURE';`;
	let procs = await getItemsFromConnection(tableListSql, databaseName, "proc", connectionProfile!);
	let result = separateIntoSchemas(procs, "procsSchemaFolder");

	return new Promise<SchemaItem[]>((resolve, reject) => {
		resolve(result);
	});
}

export async function getViewsForDatabase(databaseName: string, connectionProfile: azdata.connection.ConnectionProfile): Promise<SchemaItem[]> {
	let tableListSql = `SELECT SCHEMA_NAME(schema_id) AS [Schema], name FROM sys.objects WHERE type = 'V' ORDER BY [Schema], name;`;
	let result = await getItemsFromConnection(tableListSql, databaseName, "view", connectionProfile!);

	return new Promise<SchemaItem[]>((resolve, reject) => {
		resolve(result);
	});
}

export async function getItemsFromConnection(itemListSql: string, dbName: string, itemType: string, conn: azdata.connection.ConnectionProfile) {
	let myItems: SchemaItem[] = new Array();

	let qResult = await DAL.runQueryWithConnection(itemListSql, conn);

	try {
		qResult.rows.map((r) => {
			let item = new SchemaItem(r[1].displayValue, r[0].displayValue, dbName, itemType, ITEM_COLLAPSED, conn);
			myItems.push(item);
		});
	} catch (err) {
		console.log("error running query:", itemListSql);
		vscode.window.showErrorMessage(`Error running query in getItemsFromConnection(). ${err}`);
	} finally {
		return myItems;
	}
}

export function separateIntoSchemas(itemsIn: SchemaItem[], foldersItemType: string): SchemaItem[] {
	let schemaFolders: SchemaItem[] = new Array();
	let allSchemas = itemsIn.map((x) => { return x.schemaName; });
	let schemas = [...new Set(allSchemas)];
	let sampleItem = itemsIn[0];
	console.log("tables in:", itemsIn);
	schemas.forEach((schemaName) => {
		let thisSchemaFolder = new SchemaItem(schemaName, schemaName, sampleItem.databaseName, foldersItemType, ITEM_COLLAPSED, sampleItem.connectionProfile);
		let theseItems = itemsIn.filter((f) => { return f.schemaName === schemaName; });

		thisSchemaFolder.children = theseItems;
		schemaFolders.push(thisSchemaFolder);
	});

	return schemaFolders;
}

function makeFoldersForTable(parent: SchemaItem): Promise<SchemaItem[]> {
	let result: SchemaItem[] = new Array();
	//let columnsFolder = new SchemaItem(parent.objectName, parent.schemaName, parent.databaseName, "columnsFolder", ITEM_COLLAPSED, parent.connectionProfile);
	let keysFolder = new SchemaItem(parent.objectName, parent.schemaName, parent.databaseName, "keysFolder", ITEM_COLLAPSED, parent.connectionProfile);

	//result.push(columnsFolder);
	result.push(keysFolder);

	return new Promise<SchemaItem[]>((resolve, reject) => {
		resolve(result);
	});
}

async function getColumnsForTable(table: SchemaItem): Promise<SchemaItem[]> {
	let results: SchemaItem[] = new Array();

	let colSql = `SELECT 
					COLUMN_NAME, 
					ORDINAL_POSITION, 
					COLUMN_DEFAULT, 
					IS_NULLABLE, 
					DATA_TYPE, 
					CHARACTER_MAXIMUM_LENGTH,
					CHARACTER_OCTET_LENGTH,
					NUMERIC_PRECISION,
					NUMERIC_PRECISION_RADIX,
					NUMERIC_SCALE,
					DATETIME_PRECISION,
					CHARACTER_SET_NAME
				FROM 
					INFORMATION_SCHEMA.COLUMNS
				WHERE
					TABLE_SCHEMA = '${table.schemaName}'
				AND 
					TABLE_NAME = '${table.objectName}'
				ORDER BY 
					ORDINAL_POSITION;`;

	let queryResults = await DAL.runQueryWithConnection(colSql, table.connectionProfile!);

	if (queryResults.rowCount > 0) {
		queryResults.rows.forEach((x) => {
			let col = new ColumnItem(x[0].displayValue, table.schemaName, table.databaseName, "column", ITEM_NONE, table.connectionProfile);
			col.tableName = table.objectName;
			col.ordinalPosition = parseInt(x[1].displayValue);
			col.columnDefault = x[2].displayValue;
			col.isNullable = (x[3].displayValue === "YES") ? true : false;
			col.dataType = x[4].displayValue;
			col.characterMaximumLength = parseInt(x[5].displayValue);
			col.characterOctetLength = parseInt(x[6].displayValue);
			col.numericPrecision = parseInt(x[7].displayValue);
			col.numericPrecisionRadix = parseInt(x[8].displayValue);
			col.numericScale = parseInt(x[9].displayValue);
			col.datetimePrecision = parseInt(x[10].displayValue);
			col.characterSetName = x[11].displayValue;

			col.label = makeColumnLabel(col);
			col.iconPath = makeIconPath(determineColumnIcon(col));

			results.push(col);
		});
	}

	return new Promise<SchemaItem[]>((resolve, reject) => {
		resolve(results);
	});
}

function makeColumnLabel(col: ColumnItem): string {
	let description = `${col.dataType}`;
	let result = `${col.objectName} `;

	description = (col.isPK) ? `PK, ${description}` : description;
	description = (col.dataType.toUpperCase().indexOf("VARCHAR") > -1) ? `${description}(${col.characterMaximumLength})` : description;
	description = (col.isNullable) ? `${description}, NULL` : `${description}, NOT NULL`;

	result = `${result} (${description})`;

	return result;
}

function determineColumnIcon(col: ColumnItem): string {
	let result = "icon-column.svg";

	result = (col.isPK) ? "icon-primary-key.svg" : result;
	result = (col.isFK) ? "icon-foreign-key.svg" : result;

	return result;
}