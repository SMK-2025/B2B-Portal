export function wrapCityIndex(index: number, length: number) {
  return length > 0 ? ((index % length) + length) % length : 0;
}
export function cityDragPosition(origin: number, dx: number, spacing: number) {
  const position = origin - dx / spacing;
  const active = Math.round(position);
  return { active, fraction: position - active };
}
export function cityOrbitPose(position: number, viewport: number) {
  const mobile = viewport <= 700;
  const a = Math.abs(position),
    side = Math.sign(position);
  const near = mobile ? viewport * 0.36 : Math.min(viewport * 0.23, 275);
  const far = mobile ? viewport * 0.68 : Math.min(viewport * 0.49, 590);
  const x = side * (a <= 1 ? a * near : near + (a - 1) * (far - near));
  const y = -50;
  const angle = -side * Math.min(a, 1) * 18;
  // Project each card separately, then normalize its projected bounding box.
  // Outer cards match the visible trailing edge of their nearer neighbour.
  const width = mobile ? 225 : Math.max(270, Math.min(viewport * 0.3, 370));
  const half = width / 2, perspective = 700;
  const radians = angle * Math.PI / 180;
  const depth = half * Math.sin(radians) / perspective;
  const left = -half * Math.cos(radians) / (1 - depth);
  const right = half * Math.cos(radians) / (1 + depth);
  const scaleX = width / (right - left);
  const edgeRatio = (1 - Math.abs(depth)) / (1 + Math.abs(depth));
  const outerProgress = Math.max(0, Math.min(1, a - 1));
  const scaleY = (1 - Math.abs(depth)) * (1 - outerProgress * (1 - edgeRatio));
  const centerOffset = (left + right) * 0.5 * scaleX;
  return {
    transform: `translate3d(calc(-50% + ${x - centerOffset}px), ${y}%, 0px) scale(${scaleX}, ${scaleY}) perspective(${perspective}px) rotateY(${angle}deg)`,
    zIndex: Math.round(100 - a * 20),
    filter: `brightness(${Math.max(0.5, 1 - a * 0.14)})`,
    opacity: Math.max(0, Math.min(1, 3 - a)),
  };
}
export function cityOrbitSlots(length: number) {
  return length >= 5
    ? [-2, -1, 0, 1, 2]
    : length === 4
      ? [-1, 0, 1, 2]
      : length === 3
        ? [-1, 0, 1]
        : length === 2
          ? [0, 1]
          : length === 1
            ? [0]
            : [];
}
