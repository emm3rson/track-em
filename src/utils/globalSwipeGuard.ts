const _swipeLockOwners = new Set<string>();

export function lockGlobalSwipe(ownerId: string): void {
  _swipeLockOwners.add(ownerId);
}

export function unlockGlobalSwipe(ownerId: string): void {
  _swipeLockOwners.delete(ownerId);
}

export function isGlobalSwipeLocked(): boolean {
  return _swipeLockOwners.size > 0;
}
