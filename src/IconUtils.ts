import path = require("path");

export function makeIconPath(iconName: string) {
	let iconPath = {
		light: path.join(__filename, '..', '..', 'resources', iconName),
		dark: path.join(__filename, '..', '..', 'resources', iconName)
	};

	return iconPath;
}