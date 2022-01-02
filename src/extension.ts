// tree icon by Mithun Raj on freeicons.io

'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// The module 'azdata' contains the Azure Data Studio extensibility API
// This is a complementary set of APIs that add SQL / Data-specific functionality to the app
// Import the module and reference it with the alias azdata in your code below

import * as azdata from 'azdata';

import SchemaItem from './schemaItem';
import SchemaTreeProvider from './SchemaTreeProvider';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "schematree" is now active!');

    // connEvtListener.onConnectionEvent(() => )
    azdata.connection.registerConnectionEventListener({
        onConnectionEvent(eventType: azdata.connection.ConnectionEventType, ownerUri: string, profile: azdata.IConnectionProfile) {
            try {
                console.log("connection detected!", eventType, ownerUri, profile);
                loadStructureForConnection();
            } catch {
                console.log("error on this shit");
            }
        }
    });

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    context.subscriptions.push(vscode.commands.registerCommand('schematree.helloWorld', () => {
        // The code you place here will be executed every time your command is executed

        loadStructureForConnection();

    }));

    context.subscriptions.push(vscode.commands.registerCommand('schematree.showCurrentConnection', () => {
        // The code you place here will be executed every time your command is executed

    }));

    context.subscriptions.push(vscode.commands.registerCommand('schematree.showDefinition', (myItem: SchemaItem) => {
        // The code you place here will be executed every time your command is executed

        console.log("args:", myItem);

        let myNode = myItem.objectExplorerNode;

        myNode.payload = myNode.label;

        getObjectDefinition(myNode.label);
    }));
}

// this method is called when your extension is deactivated
export function deactivate() {
}

function loadStructureForConnection() {
    vscode.window.showInformationMessage('Loading SchemaTree from current connection...');

    vscode.window.createTreeView('schematree-view', {
        treeDataProvider: new SchemaTreeProvider()
    });
}


async function getObjectDefinition(objectName: string) {
    vscode.window.showInformationMessage('Loading definition for ' + objectName);

    let objectDefinitionSql = "SELECT OBJECT_DEFINITION(OBJECT_ID('" + objectName + "')) AS myDefinition;";

    let conn: azdata.connection.ConnectionProfile = await azdata.connection.getCurrentConnection().then((connResult) => {
        console.log("connection", connResult);
        return connResult;
    });

    let connectionUri = await azdata.connection.getUriForConnection(conn.connectionId);

    console.log("conn uri", connectionUri);



    let qprov = azdata.dataprotocol.getProvider<azdata.QueryProvider>(conn.providerId, azdata.DataProviderType.QueryProvider);

    //    await qprov.registerOnQueryComplete((queryResult) => { console.log("queryResult:", queryResult); });

    let qresult = await qprov.runQueryAndReturn(connectionUri, objectDefinitionSql);

    console.log("qresult", qresult.rows[0][0].displayValue);

    let itemDefinition = qresult.rows[0][0].displayValue;

    let doc = await azdata.queryeditor.openQueryDocument({ content: itemDefinition });
    await azdata.queryeditor.connect(doc.uri, conn.connectionId);
}