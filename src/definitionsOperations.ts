import * as vscode from 'vscode';
import * as azdata from 'azdata';

import SchemaItem from './schemaItem';
import { ObjectExplorerNodeToNodeInfo } from './objectExplorerMisc';

export const getTableDefinition = async (item: SchemaItem) => {
	console.log("getting table def...");
	let fullObjectName = item.schemaName + '.' + item.objectName;

	try {
		let oeActionsContext = await getObjectExplorerActionsContext(item);
		await vscode.commands.executeCommand("objectExplorer.scriptAsCreate", oeActionsContext);
	} catch (err) {
		vscode.window.showErrorMessage(`Error getting definition for ${fullObjectName}. ${err}`);
	}
};

export const getProcDefinition = async (item: SchemaItem) => {
	let definition = "";
	let fullObjectName = item.schemaName + '.' + item.objectName;

	try {
		let objectDefinitionSql = "SELECT OBJECT_DEFINITION(OBJECT_ID('" + fullObjectName + "')) AS myDefinition;";

		let connectionUri = await azdata.connection.getUriForConnection(item.connectionProfile!.connectionId);
		let qprov = azdata.dataprotocol.getProvider<azdata.QueryProvider>(item.connectionProfile!.providerId, azdata.DataProviderType.QueryProvider);
		let qresult = await qprov.runQueryAndReturn(connectionUri, objectDefinitionSql);

		definition = qresult.rows[0][0].displayValue;
	} catch (err) {
		vscode.window.showInformationMessage(`Error getting definition for ${fullObjectName}. ${err}`);
	} finally {
		return new Promise<string>((resolve, reject) => {
			resolve(definition);
		});
	}
};

export const getObjectExplorerActionsContext = async (item: SchemaItem) => {
	try {
		let oeItemType = (item.itemType === "table") ? "Table" : "Database";

		let foundNodes = await azdata.objectexplorer.findNodes(item.connectionProfile!.connectionId, oeItemType, item.schemaName, item.objectName, item.databaseName, [""]);
		let myOeNode = foundNodes[0];
		let nodeInfo = ObjectExplorerNodeToNodeInfo(myOeNode);
		let oeActionsContext: azdata.ObjectExplorerContext = {
			isConnectionNode: false,
			connectionProfile: { providerName: "MSSQL", id: item.connectionProfile!.connectionId, ...item.connectionProfile! },
			nodeInfo: nodeInfo
		};

		return new Promise<azdata.ObjectExplorerContext>((resolve, reject) => {
			resolve(oeActionsContext);
		});

	} catch (err) {
		vscode.window.showErrorMessage(`Error getting object context for ${item.objectName}. ${err}`);
	}
};
