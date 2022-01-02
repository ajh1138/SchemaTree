import * as vscode from 'vscode';
import * as azdata from 'azdata';

import SchemaItem from './SchemaItem';


export default class SchemaTreeProvider implements vscode.TreeDataProvider<SchemaItem>{

	origobjectExplorerNodes: SchemaItem[];

	procsFolder?: SchemaItem;

	nodesToSkip = ["Service Broker", "Storage", "Security"];

	constructor() {
		this.origobjectExplorerNodes = new Array();
	}


	getTreeItem(element: SchemaItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element;
	}

	getChildren(element?: SchemaItem): vscode.ProviderResult<SchemaItem[]> {
		// check for a connection...
		// if (this.checkForConnection()) {
		// 	vscode.window.showInformationMessage("No connection.");
		// 	return Promise.resolve([]);
		// }

		if (element) {
			this.origobjectExplorerNodes.push(element);
			return this.iterateNodes(element);
		} else {
			vscode.window.showInformationMessage("Getting nodes...");

			this.iterateConnections().then((floop) => { console.log("floop", floop); });

			return this.iterateConnections();
		}
	}

	private iterateConnections = (): Thenable<SchemaItem[]> => {
		let items: SchemaItem[] = new Array();



		return azdata.objectexplorer.getActiveConnectionNodes().then((connections) => {
			connections.map((c) => {
				let blah: SchemaItem = new SchemaItem(c.label, vscode.TreeItemCollapsibleState.Collapsed, c, "", "");
				items.push(blah);
			});

			console.log("connections:", items);

			return items;
		});
	};

	private iterateNodes(element: SchemaItem): Thenable<SchemaItem[]> {
		let oldItems: SchemaItem[] = new Array();

		let procs: SchemaItem[] = new Array();

		return element.objectExplorerNode.getChildren().then((children) => {
			children.forEach((child) => {
				if (child.nodeType === "Folder" && this.nodesToSkip.includes(child.label)) {
					// do nothing with skipped nodes
					return;
				}

				if (child.nodeType === "StoredProcedure") {
					let schemaName = child.label.split(".")[0];
					let objectName = child.label.split(".").pop();
					console.log("object (and payload)", schemaName, objectName, child.payload);
					let poop = new SchemaItem(child.label, vscode.TreeItemCollapsibleState.None, child, schemaName, objectName!);
					console.log("procedure...", poop);
					procs.push(poop);
				}
				else if (child.nodeType === "Folder" && child.label === "Stored Procedures") {
					this.procsFolder = new SchemaItem(child.label, vscode.TreeItemCollapsibleState.Expanded, child, "", "");
					oldItems.push(this.procsFolder);
				}
				else {
					let poop = new SchemaItem(child.label, vscode.TreeItemCollapsibleState.Expanded, child, "", "");
					oldItems.push(poop);
				}

			});

			// group the procs by schema...
			console.log("procsFolder", this.procsFolder);
			if (procs !== null && procs.length > 0) {
				let sortedProcs = this.getSchemaSortedFolders(procs, "Procs");
				this.procsFolder!.children = sortedProcs;
				console.log("procsFolder", this.procsFolder);
				oldItems = sortedProcs;
			}

			if (element.children.length > 0) {
				return element.getChildren();
			} else {

				return oldItems;
			}

		});
	}

	private getSchemaSortedFolders(items: SchemaItem[], folderName: string): SchemaItem[] {
		console.log("getting proc folders...", items);
		let folders: SchemaItem[] = new Array();
		let currentSchemaName = "";
		let currentSchemaFolder: SchemaItem;

		items.forEach(element => {
			let addSchemaFolderToOutput = false;

			if (element.schemaName !== currentSchemaName) {
				currentSchemaName = element.schemaName;
				//let objnode: azdata.objectexplorer.ObjectExplorerNode = new azdata.objectexplorer.ObjectExplorerNode();
				currentSchemaFolder = new SchemaItem(currentSchemaName, vscode.TreeItemCollapsibleState.Collapsed, element.objectExplorerNode, currentSchemaName, "");

				addSchemaFolderToOutput = true;
			}

			let newProc = new SchemaItem(element.objectName, vscode.TreeItemCollapsibleState.None, element.objectExplorerNode, currentSchemaName, element.objectName);
			//	newProc.command = { "command": "dataExplorer.scriptAsCreate", "title": "script as create", arguments: [element.objectExplorerNode] };
			newProc.contextValue = "proc";
			currentSchemaFolder.children.push(newProc);

			if (addSchemaFolderToOutput) {
				folders.push(currentSchemaFolder);
				console.log("current schema folder: ", currentSchemaFolder);
			}

		});

		return folders;
	}

	private checkForConnection(): boolean {
		let hasConnections: boolean = false;

		(async () => {
			await azdata.objectexplorer.getActiveConnectionNodes().then((connections) => {
				console.log("connections found:", connections.length, connections, connections.length > 0);
				hasConnections = connections.length > 0;
			});

		}
		)();

		console.log("hasConnections", hasConnections);

		return hasConnections;

	}
}





