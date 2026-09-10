/** Milliseconds: vibration, pause, vibration. No claim of amplitude control. */
export const mobilePatterns = [
  { id: 'tap', name: 'タップ', detail: '短いクリック', pattern: [25] },
  { id: 'success', name: '完了', detail: 'トン、トン', pattern: [35, 70, 55] },
  { id: 'warning', name: '注意', detail: '間をあけて2回', pattern: [65, 150, 65] },
  { id: 'error', name: 'エラー', detail: '3回のパルス', pattern: [45, 65, 45, 65, 65] },
] as const;

export function scalePattern(pattern: readonly number[], scale: number): number[] {
  const factor = Number.isFinite(scale) ? Math.min(3, Math.max(0.5, scale)) : 1;
  return pattern.map((ms, i) => i % 2 ? ms : Math.round(ms * factor));
}
