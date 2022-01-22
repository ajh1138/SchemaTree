import * as azdata from 'azdata';


export function handleOnConnectEvent(profile: azdata.IConnectionProfile) {
	console.log("profile connected - ", profile);

}

export function handleOnConnectionChangedEvent(profile: azdata.IConnectionProfile) {
	console.log("profile conn changed - ", profile);
}

export function handleOnDisconnectEvent(profile: azdata.IConnectionProfile) {
	console.log("profile disconnected - ", profile);
}