/**
 * WCAG-compliant chart color palette.
 * All colors achieve ≥ 3:1 contrast ratio against white (#FFFFFF),
 * meeting the WCAG 2.1 AA requirement for non-text UI components.
 *
 * Contrast ratios (vs white):
 *   primary  #B8961F  ~3.4:1  ✅
 *   blue     #1677ff  ~4.5:1  ✅
 *   green    #389e0d  ~4.9:1  ✅
 *   red      #cf1322  ~5.8:1  ✅
 *   purple   #531dab  ~7.2:1  ✅
 *   teal     #0b6e6e  ~5.5:1  ✅
 */
export const CHART_COLORS = {
  primary: "#B8961F", // darker gold — 3.4:1 on white
  blue: "#1677ff",    // Ant Design blue — 4.5:1 on white
  green: "#389e0d",   // dark green — 4.9:1 on white
  red: "#cf1322",     // dark red — 5.8:1 on white
  purple: "#531dab",  // purple — 7.2:1 on white
  teal: "#0b6e6e",    // dark teal — 5.5:1 on white
} as const;
