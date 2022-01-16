// tree icon by Mithun Raj on freeicons.io

'use strict';

import * as vscode from 'vscode';
import * as azdata from 'azdata';

import SchemaItem from './schemaItem';
import SchemaTreeProvider from './SchemaTreeProvider';
import { ObjectExplorerNodeToNodeInfo } from './objectExplorerMisc';
import { getProcDefinition, getTableDefinition } from './definitionsOperations';


let theItems: SchemaItem[] = new Array();

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
                if (eventType === "onConnect") {
                    console.log("connection owner:", ownerUri);
                    loadStructureForConnection();
                }
            } catch (ex) {
                console.log("error on this shizzle", ex);
            }
        }
    });

    context.subscriptions.push(vscode.commands.registerCommand('schematree.helloWorld', () => {
        loadStructureForConnection();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('schematree.showTreeEvent', (thingy) => {
        // The code you place here will be executed every time your command is executed
        console.log("thingy:", thingy);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('schematree.showCurrentConnection', () => {

    }));

    context.subscriptions.push(vscode.commands.registerCommand('schematree.showDefinition', (myItem: SchemaItem) => {
        console.log("myItem", myItem);
        getObjectDefinition(myItem);
    }));
}

// this method is called when your extension is deactivated
export function deactivate() {
}

function loadStructureForConnection() {
    vscode.window.showInformationMessage('Loading SchemaTree for current connections...');

    vscode.window.createTreeView('schematree-view', {
        treeDataProvider: new SchemaTreeProvider()
    });
}

async function getObjectDefinition(item: SchemaItem) {
    let fullObjectName = item.schemaName + '.' + item.objectName;
    vscode.window.showInformationMessage(`Loading definition for ${fullObjectName}...`);

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