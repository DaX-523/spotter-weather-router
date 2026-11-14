/** A theme token's current value (from index.css), for drawing code such as the map's canvas,
 * which can't resolve CSS variables itself. */
export function themeColor(
  token: string,
  element: Element = document.documentElement,
): string {
  return getComputedStyle(element).getPropertyValue(`--${token}`).trim();
}
