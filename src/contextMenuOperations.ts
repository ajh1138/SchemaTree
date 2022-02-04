import * as vscode from 'vscode';
import * as azdata from 'azdata';
import SchemaItem from './SchemaItem';
import * as schemaOps from './schemaOperations';
import * as definitionsOps from './definitionsOperations';

export async function scriptAsCreate(item: SchemaItem) {
	let fullObjectName = item.schemaName + '.' + item.objectName;
	vscode.window.showInformationMessage(`Script as CREATE for ${fullObjectName}...`);

	switch (item.itemType) {
		case "proc":
			let itemDefinition = await definitionsOps.getProcDefinition(item);
			openQueryWindowWithContent(item, itemDefinition);
			break;
		case "table":
			await definitionsOps.getTableDefinition(item);
			break;
		case "view":
			await definitionsOps.getTableDefinition(item);
			break;
	}
}

async function openQueryWindowWithContent(item: SchemaItem, itemDefinition: string) {
	let doc = await azdata.queryeditor.openQueryDocument({ content: itemDefinition });
	await azdata.queryeditor.connect(doc.uri, item.connectionProfile!.connectionId);
}

export async function scriptAsDrop(item: SchemaItem) {

}

export async function scriptAsAlter(item: SchemaItem) {

}

export async function scriptAsExecute(item: SchemaItem) {

}

export async function selectTop1000(item: SchemaItem) {

}

export async function newQuery(item: SchemaItem, accessor: any) {
	// let oeContext = definitionsOps.getObjectExplorerActionsContext(item);
	// await vscode.commands.executeCommand("objectExplorer.newQuery", accessor, oeContext);
	let connUri = await azdata.connection.getUriForConnection(item.connectionProfile!.connectionId);
	let dProvider = await azdata.dataprotocol.getProvider<azdata.ConnectionProvider>(item.connectionProfile!.providerId, azdata.DataProviderType.ConnectionProvider);
	await dProvider.changeDatabase(connUri, item.databaseName);
	let doc = await azdata.queryeditor.openQueryDocument({ content: "-- Make sure you're in the right database! --" }, item.connectionProfile?.providerId);

	await azdata.queryeditor.connect(doc.uri, item.connectionProfile!.connectionId);

}

export async function editTableData(item: SchemaItem) {
	console.log("edit table data:", item);
	let oeContext = await definitionsOps.getObjectExplorerActionsContext(item);
	console.log("context:", oeContext);
	await vscode.commands.executeCommand("explorer.editData", oeContext);
}

export async function refreshItem(item: SchemaItem) {
	let newKids = await schemaOps.getChildrenOfItem(item);
	console.log("newkids", newKids);
	item.children = newKids;
}