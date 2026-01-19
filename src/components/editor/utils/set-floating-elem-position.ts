const VERTICAL_GAP = 10
const HORIZONTAL_OFFSET = 5

export function setFloatingElemPosition(
  targetRect: DOMRect | null,
  floatingElem: HTMLElement,
  anchorElem: HTMLElement,
  isLink: boolean = false,
  verticalGap: number = VERTICAL_GAP,
  horizontalOffset: number = HORIZONTAL_OFFSET
): void {
  if (targetRect === null) {
    floatingElem.style.opacity = "0"
    floatingElem.style.transform = "translate(-10000px, -10000px)"
    return
  }

  const floatingElemRect = floatingElem.getBoundingClientRect()

  let top = targetRect.top - floatingElemRect.height - verticalGap
  let left = targetRect.left - horizontalOffset

  if (top < 8) {
    // adjusted height for link element if the element is at top
    top +=
      floatingElemRect.height +
      targetRect.height +
      verticalGap * (isLink ? 9 : 2)
  }

  const viewportWidth = window.innerWidth
  if (left + floatingElemRect.width > viewportWidth - 8) {
    left = viewportWidth - floatingElemRect.width - horizontalOffset - 8
  }

  floatingElem.style.opacity = "1"
  floatingElem.style.position = "fixed"
  floatingElem.style.top = `${top}px`
  floatingElem.style.left = `${left}px`
  floatingElem.style.transform = "translate(0, 0)"
}
