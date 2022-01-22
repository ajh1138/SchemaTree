// tree icon by Mithun Raj on freeicons.io

'use strict';

import * as vscode from 'vscode';
import * as azdata from 'azdata';

import SchemaItem from './schemaItem';
import * as schemaOps from './schemaOperations';
import * as connectionEventHandlers from './connectionEventHandlers';
import * as contextMenuOperations from './contextMenuOperations';
import { getProcDefinition, getTableDefinition } from './definitionsOperations';
import SchemaTreeProvider from './SchemaTreeProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('"schematree" is now active!');

    let myTreeView: vscode.TreeView<SchemaItem>;
    let myProvider = new SchemaTreeProvider();

    initTreeStructure();

    azdata.connection.registerConnectionEventListener({
        onConnectionEvent(eventType: azdata.connection.ConnectionEventType, ownerUri: string, profile: azdata.IConnectionProfile) {
            try {
                switch (eventType) {
                    case "onConnect":
                        connectionEventHandlers.handleOnConnectEvent(profile);
                        myProvider.refresh();
                        break;
                    case "onConnectionChanged":
                        connectionEventHandlers.handleOnConnectionChangedEvent(profile);
                        break;
                    case "onDisconnect":
                        connectionEventHandlers.handleOnDisconnectEvent(profile);
                        myProvider.refresh();
                        break;
                }
            } catch (ex) {
                console.log("Error in connection event listener: ", ex);
            }
        }
    });

    context.subscriptions.push(vscode.commands.registerCommand('schematree.scriptAsCreate', (myItem: SchemaItem) => {
        contextMenuOperations.scriptAsCreate(myItem);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('schematree.scriptAsDrop', (myItem: SchemaItem) => {
        contextMenuOperations.scriptAsDrop(myItem);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('schematree.scriptAsAlter', (myItem: SchemaItem) => {
        contextMenuOperations.scriptAsAlter(myItem);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('schematree.scriptAsExecute', (myItem: SchemaItem) => {
        contextMenuOperations.scriptAsExecute(myItem);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('schematree.refresh', (myItem: SchemaItem) => {
        // contextMenuOperations.refreshItem(myItem);
        myProvider.refresh();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('schematree.selectTop1000', (myItem: SchemaItem) => {
        contextMenuOperations.selectTop1000(myItem);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('schematree.editData', (myItem: SchemaItem) => {
        contextMenuOperations.editTableData(myItem);
    }));

    function initTreeStructure() {
        myTreeView = vscode.window.createTreeView('schematree-view', {
            treeDataProvider: myProvider
        });

    }
}

export function deactivate() {
}


