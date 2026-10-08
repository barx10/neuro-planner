// Dempede farger. Brukes kun som markør (stripe, prikk, ring), aldri som tekstfarge.
export const TASK_COLORS = [
  '#e5484d', // rød
  '#f2a33a', // rav
  '#30a46c', // grønn
  '#12a594', // blågrønn
  '#3e63dd', // blå
  '#6e56cf', // fiolett
  '#d6409f', // rosa
  '#8d8d86', // sand
]

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
