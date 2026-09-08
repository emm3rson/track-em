import { useEffect, useRef } from "react";

import { lockGlobalSwipe, unlockGlobalSwipe } from "./globalSwipeGuard";

let _nextId = 0;

export function useGlobalSwipeLock(locked: boolean): void {
  const ownerIdRef = useRef<string | null>(null);
  if (ownerIdRef.current === null) {
    ownerIdRef.current = `swipeLock_${_nextId++}`;
  }

  useEffect(() => {
    const ownerId = ownerIdRef.current!;
    if (locked) {
      lockGlobalSwipe(ownerId);
    } else {
      unlockGlobalSwipe(ownerId);
    }
    // Always remove this owner on cleanup — safe because Set.delete on a
    // missing key is a no-op. This guarantees the lock is released even if
    // the component unmounts while locked=true.
    return () => {
      unlockGlobalSwipe(ownerId);
    };
  }, [locked]);
}
