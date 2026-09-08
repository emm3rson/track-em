/**
 * Module-level singleton that lets the Obligations segment controller
 * communicate its current segment to the global tab-swipe handler in AppRoot.
 *
 * This is intentionally a simple mutable ref (like globalSwipeGuard) so that
 * AppRoot can read it synchronously inside its PanResponder callbacks without
 * needing React context or prop-drilling.
 */

type ObligationsSegment = "payables" | "receivables" | null;

let _currentSegment: ObligationsSegment = null;

/** Call this from useObligationsSegmentController to keep the guard in sync. */
export function setObligationsSegment(segment: ObligationsSegment): void {
  _currentSegment = segment;
}

/**
 * Returns true if the global tab swipe (AppRoot) should be suppressed because
 * the Obligations screen wants to handle the gesture internally.
 *
 * - dx < 0 (swipe left)  → suppress only when on "payables" (segment will switch to receivables)
 * - dx > 0 (swipe right) → suppress only when on "receivables" (segment will switch back to payables)
 * - no segment registered (null) → never suppress
 */
export function isObligationsSegmentSwipe(dx: number): boolean {
  if (_currentSegment === "payables" && dx < 0) return true;
  if (_currentSegment === "receivables" && dx > 0) return true;
  return false;
}
