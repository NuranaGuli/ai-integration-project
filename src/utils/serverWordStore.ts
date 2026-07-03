declare global {
  var __serverBannedWords: Set<string> | undefined;
}

if (!global.__serverBannedWords) {
  global.__serverBannedWords = new Set<string>();
}

export const serverWordStore = global.__serverBannedWords;

export function addServerWord(word: string): void {
  serverWordStore.add(word.trim().toLowerCase());
}

export function removeServerWord(word: string): void {
  serverWordStore.delete(word.trim().toLowerCase());
}

export function getServerWords(): string[] {
  return [...serverWordStore].sort();
}

export function isServerBanned(word: string): boolean {
  return serverWordStore.has(word.trim().toLowerCase());
}
