export function log(...args: unknown[]) {
	const date = new Date().toLocaleDateString('en-GB').replaceAll('/', '-');
	const time = new Date().toLocaleTimeString();

	console.log(`[${date} ${time}]`, ...args);
}

export function logError(...args: unknown[]) {
	const date = new Date().toLocaleDateString('en-GB').replaceAll('/', '-');
	const time = new Date().toLocaleTimeString();

	console.error(`[${date} ${time}]`, ...args);
}
//
// export function logWarn(...args: unknown[]) {
// 	const date = new Date().toLocaleDateString('en-GB').replaceAll('/', '-');
// 	const time = new Date().toLocaleTimeString();
//
// 	console.warn(`[${date} ${time}]`, ...args);
// }
