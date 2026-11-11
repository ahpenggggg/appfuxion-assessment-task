// Approximates stock iOS/Android layouts; OEM skins and OS versions vary.
export type Platform = 'ios' | 'android';
export type DisplayState = 'collapsed' | 'expanded';

export interface WidthPreset { id: string; label: string; width: number }

export const WIDTH_PRESETS: WidthPreset[] = [
  { id: 'se', label: 'iPhone SE', width: 320 },
  { id: 'android-s', label: 'Small Android', width: 360 },
  { id: 'iphone', label: 'iPhone 15', width: 390 },
  { id: 'pro-max', label: 'Pro Max', width: 430 },
  { id: 'tablet', label: 'Tablet', width: 600 },
];

export interface LineRules { titleLines: number; bodyLines: number; showLargeImage: boolean; showThumbnail: boolean }

export function lineRules(platform: Platform, state: DisplayState, hasImage: boolean): LineRules {
  if (platform === 'ios') {
    return state === 'collapsed'
      ? { titleLines: 1, bodyLines: 4, showLargeImage: false, showThumbnail: hasImage }
      : { titleLines: 3, bodyLines: 12, showLargeImage: hasImage, showThumbnail: false };
  }
  return state === 'collapsed'
    ? { titleLines: 1, bodyLines: 1, showLargeImage: false, showThumbnail: hasImage }
    // Android BigPicture style shows only a short summary next to the image; BigText shows long text.
    : { titleLines: 2, bodyLines: hasImage ? 2 : 8, showLargeImage: hasImage, showThumbnail: false };
}

export function textWidth(platform: Platform, screenWidth: number, withThumbnail: boolean): number {
  const outer = platform === 'ios' ? 16 : 12; // screen edge → card
  const inner = platform === 'ios' ? 14 + 38 + 10 : 16; // card padding (+ app icon on iOS)
  const thumb = withThumbnail ? 48 + 10 : 0;
  return Math.max(80, screenWidth - outer * 2 - inner * 2 - thumb);
}

// Assumes an average character width of 0.5 × font size.
export function estimateLines(text: string, widthPx: number, fontSize: number): number {
  const charsPerLine = Math.max(1, Math.floor(widthPx / (fontSize * 0.5)));
  return text.split('\n').reduce((n, para) => n + Math.max(1, Math.ceil(para.length / charsPerLine)), 0);
}

export interface TruncationReport { titleCut: boolean; bodyCut: boolean; bodyLinesNeeded: number; bodyLinesShown: number }

export function truncationReport(platform: Platform, state: DisplayState, width: number, title: string, body: string, hasImage: boolean): TruncationReport {
  const rules = lineRules(platform, state, hasImage);
  const w = textWidth(platform, width, rules.showThumbnail);
  const titleLines = title ? estimateLines(title, w, 15) : 0;
  const bodyLines = body ? estimateLines(body, w, 14) : 0;
  return {
    titleCut: titleLines > rules.titleLines,
    bodyCut: bodyLines > rules.bodyLines,
    bodyLinesNeeded: bodyLines,
    bodyLinesShown: Math.min(bodyLines, rules.bodyLines),
  };
}
