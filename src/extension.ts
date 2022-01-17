// tree icon by Mithun Raj on freeicons.io

'use strict';

import * as vscode from 'vscode';
import * as azdata from 'azdata';

import SchemaItem from './schemaItem';
import SchemaTreeProvider from './SchemaTreeProvider';
import { getProcDefinition, getTableDefinition } from './definitionsOperations';

export function activate(context: vscode.ExtensionContext) {
    console.log('"schematree" is now active!');

    // azdata.connection.registerConnectionEventListener({
    //     onConnectionEvent(eventType: azdata.connection.ConnectionEventType, ownerUri: string, profile: azdata.IConnectionProfile) {
    //         try {
    //             if (eventType === "onConnect") {
    //                 console.log("connection owner:", ownerUri);
    //                 loadStructureForConnection();
    //             }
    //         } catch (ex) {
    //             console.log("error on this shizzle", ex);
    //         }
    //     }
    // });

    initTreeStructure();

    //vscode.commands.registerCommand("schematree.openConnectionNode", (item: SchemaItem) => { connectionNodeHandler(item); });

    context.subscriptions.push(vscode.commands.registerCommand('schematree.scriptAsCreate', (myItem: SchemaItem) => {
        scriptAsCreate(myItem);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('schematree.scriptAsDrop', (myItem: SchemaItem) => {
        scriptAsDrop(myItem);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('schematree.scriptAsAlter', (myItem: SchemaItem) => {
        scriptAsAlter(myItem);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('schematree.scriptAsExecute', (myItem: SchemaItem) => {
        scriptAsExecute(myItem);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('schematree.refresh', (myItem: SchemaItem) => {
        refreshItem(myItem);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('schematree.selectTop1000', (myItem: SchemaItem) => {
        selectTop1000(myItem);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('schematree.editData', (myItem: SchemaItem) => {
        editTableData(myItem);
    }));
}

export function deactivate() {
}

function initTreeStructure() {
    vscode.window.showInformationMessage('SchemaTree is loading connections...');

    vscode.window.createTreeView('schematree-view', {
        treeDataProvider: new SchemaTreeProvider()
    });
}

async function connectionNodeHandler(item: SchemaItem) {
    vscode.window.showInformationMessage('connection node event received.');
    let connectionIsActive = await isThisConnectionActive(item.connectionProfile!);

    if (!connectionIsActive) {
        vscode.window.showInformationMessage(`Connecting to ${item.objectName}`);

        try {
            // --------- This is where I'm trying to open connections via SchemaTree instead of using the ObjectExplorer ----------- //

            // let foundNodes = await azdata.objectexplorer.findNodes(item.connectionProfile!.connectionId, "Server", "", item.objectName, "", [""]);
            // let myOeNode = foundNodes[0];
            // console.log("nodes", myOeNode);

            // let connectionArgs = {
            //     serverName: item.objectName,
            //     providerName: "MSSQL",
            //     authenticationType: "SqlLogin",
            //     userName: item.connectionProfile!.userName,
            //     password: item.connectionProfile!.password
            // };

            // let nodeInfo = ObjectExplorerNodeToNodeInfo(myOeNode);
            // let oeActionsContext: azdata.ObjectExplorerContext = {
            //     isConnectionNode: false,
            //     connectionProfile: { providerName: "MSSQL", id: item.connectionProfile!.connectionId, ...item.connectionProfile! },
            //     nodeInfo: nodeInfo
            // };
            /////     console.log("server item", item);
            ////    let connResult = await vscode.commands.executeCommand("azdata.connect", connectionArgs);
            // let superSpecialConnectionProfile = { providerName: "MSSQL", id: item.connectionProfile!.connectionId, ...item.connectionProfile! };
            //let connResult: azdata.ConnectionResult = await azdata.connection.connect(superSpecialConnectionProfile, false, false);
            //// console.log("connResult", connResult);
        } catch (error) {
            console.log("error connecting: ", error);
        }

    }
}

async function scriptAsCreate(item: SchemaItem) {
    let fullObjectName = item.schemaName + '.' + item.objectName;
    vscode.window.showInformationMessage(`Script as CREATE for ${fullObjectName}...`);

    let itemDefinition = "";

    switch (item.itemType) {
        case "proc":
            itemDefinition = await getProcDefinition(item);
            break;
        case "table":
            itemDefinition = await getTableDefinition(item);
            break;
        case "view":
            itemDefinition = await getTableDefinition(item);
            break;
    }

    let doc = await azdata.queryeditor.openQueryDocument({ content: itemDefinition });
    await azdata.queryeditor.connect(doc.uri, item.connectionProfile!.connectionId);
}

async function scriptAsDrop(item: SchemaItem) {

}

async function scriptAsAlter(item: SchemaItem) {

}

async function scriptAsExecute(item: SchemaItem) {

}

async function selectTop1000(item: SchemaItem) {

}

async function editTableData(item: SchemaItem) {

}

async function refreshItem(item: SchemaItem) {

}

async function isThisConnectionActive(connProfile: azdata.connection.ConnectionProfile): Promise<boolean> {
    let activeConnections = await azdata.connection.getActiveConnections().then((connections) => { return connections; });
    let activeConnectionIds = activeConnections.map((c) => { return c.connectionId; });

    let connectionIsActive = activeConnectionIds.includes(connProfile.connectionId);
    console.log("connection is active? ", connectionIsActive);
    return new Promise<boolean>((resolve, reject) => {
        resolve(connectionIsActive);
    });
}

