export const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
export const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
export const phase = (t, start, end) => smooth((t - start) / (end - start));
export const partInfo = {
  battery: { label: '乾電池', role: '電源', description: '乾電池 ↔ 電源：電気エネルギーを供給します。' },
  switch: { label: 'スイッチ', role: 'スイッチ', description: 'スイッチ ↔ スイッチ：回路をつないだり、切ったりします。' },
  led: { label: 'LED基板', role: '負荷', description: 'LED ↔ 負荷：電気エネルギーを光に変えます。' },
};
export function animationStep(progress, direction, seconds, duration = 6) {
  const value = clamp(progress + direction * seconds / duration);
  return { value, direction: value === 0 || value === 1 ? 0 : direction };
}
export function circuitState(mode, switchClosed) {
  return { closed: mode === 'circuit' && switchClosed, lit: mode === 'circuit' && switchClosed };
}
export function statusFor(progress) {
  if (progress <= .001) return '組み立てた状態';
  if (progress >= .999) return '分解した状態';
  if (progress < .45) return '外側をひらいています';
  return '中の部品が見えてきました';
}
