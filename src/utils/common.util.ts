export function getLastArrayItems<T>(arr: T[], count: number): T[] {
	return [...arr].slice(count * -1)
}
