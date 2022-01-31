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

    let myProvider = new SchemaTreeProvider();

    let connectionList: string[] = new Array();




    initTreeStructure();

    azdata.connection.registerConnectionEventListener({
        onConnectionEvent(eventType: azdata.connection.ConnectionEventType, ownerUri: string, profile: azdata.IConnectionProfile) {
            try {
                switch (eventType) {
                    case "onConnect":
                        if (connectionList.includes(profile.id)) {
                            console.log("already listed.");
                        } else {
                            connectionList.push(profile.id);
                            //  connectionEventHandlers.handleOnConnectEvent(profile);
                            myProvider.refresh();
                        }
                        break;
                    case "onConnectionChanged":
                        connectionEventHandlers.handleOnConnectionChangedEvent(profile);
                        break;
                    case "onDisconnect":
                        //connectionEventHandlers.handleOnDisconnectEvent(profile);
                        (async () => {
                            azdata.connection.getActiveConnections().then((conns) => {
                                let activeConnectionIds = conns.map((x) => { return x.connectionId; });

                                if (!activeConnectionIds.includes(profile.id)) {
                                    let connIndex = connectionList.indexOf(profile.id);
                                    connectionList.splice(connIndex, 1);
                                    myProvider.refresh();
                                }
                            });
                        })();
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
        myProvider.refresh();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('schematree.selectTop1000', (myItem: SchemaItem) => {
        contextMenuOperations.selectTop1000(myItem);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('schematree.editData', (myItem: SchemaItem) => {
        contextMenuOperations.editTableData(myItem);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('schematree.whatever', (myItem: azdata.objectexplorer.ObjectExplorerNode) => {
        console.log("oe node", myItem);
        // contextMenuOperations.editTableData(myItem);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('schematree.newQuery', (myItem: SchemaItem, accessor: any) => {
        console.log("accessor", accessor);
        console.log("myitem", myItem);
        contextMenuOperations.newQuery(myItem, accessor);
    }));

    function initTreeStructure() {
        vscode.window.createTreeView('schematree-view', {
            treeDataProvider: myProvider
        });
    }
}

export function deactivate() {
}


