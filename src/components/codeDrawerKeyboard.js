export function shouldPreserveNativeCopy(event) {
  const target = event?.target;
  if (typeof Element !== "undefined" && target instanceof Element) {
    const editableTarget = target.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
    );
    if (editableTarget) return true;
  }

  const selection = typeof window !== "undefined" ? window.getSelection?.() : null;
  return Boolean(selection?.toString());
}
