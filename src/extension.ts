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

// this method is called when your extension is deactivated
export function deactivate() {
}

function loadStructureForConnection() {
    vscode.window.showInformationMessage('Loading SchemaTree for current connections...');

    vscode.window.createTreeView('schematree-view', {
        treeDataProvider: new SchemaTreeProvider()
    });
}

async function scriptAsCreate(item: SchemaItem) {
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