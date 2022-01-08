import * as vscode from 'vscode';
import * as azdata from 'azdata';

export async function runQueryWithConnection(myQuery: string, conn: azdata.connection.ConnectionProfile): Promise<azdata.SimpleExecuteResult> {
	let connectionUri = await azdata.connection.getUriForConnection(conn.connectionId);
	let queryProv = azdata.dataprotocol.getProvider<azdata.QueryProvider>(conn.providerId, azdata.DataProviderType.QueryProvider);
	let queryResult = await queryProv.runQueryAndReturn(connectionUri, myQuery);
	console.log("qry result", queryResult);

	return new Promise<azdata.SimpleExecuteResult>((resolve, reject) => {
		resolve(queryResult);
	});
}

