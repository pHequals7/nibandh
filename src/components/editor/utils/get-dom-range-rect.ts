export function getDOMRangeRect(
  nativeSelection: Selection,
  rootElement: HTMLElement
): DOMRect | null {
  const domRange = nativeSelection.getRangeAt(0)
  const rect = domRange.getBoundingClientRect()

  if (rect.width === 0 && rect.height === 0) {
    return null
  }

  if (!rootElement.contains(domRange.commonAncestorContainer)) {
    return null
  }

  return rect
}
