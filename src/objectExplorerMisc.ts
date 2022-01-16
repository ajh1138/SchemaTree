import * as azdata from 'azdata';

export class ObjectExplorerActionsContext implements azdata.ObjectExplorerContext {
	public connectionProfile?: azdata.IConnectionProfile;
	public nodeInfo?: azdata.NodeInfo;
	public isConnectionNode: boolean = false;
}

export function ObjectExplorerNodeToNodeInfo(nodeIn: azdata.objectexplorer.ObjectExplorerNode): azdata.NodeInfo {
	let nodeOut: azdata.NodeInfo = {
		nodePath: nodeIn.nodePath,
		nodeType: nodeIn.nodeType,
		nodeStatus: nodeIn.nodeStatus,
		isLeaf: nodeIn.isLeaf,
		label: nodeIn.label
	};

	return nodeOut;
}