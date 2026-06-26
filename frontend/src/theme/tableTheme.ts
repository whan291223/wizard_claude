// Felt themes for the game table, ported from Game Table.dc.html.

export interface TableTheme {
  base: string
  g1: string
  g2: string
  o1: string
  o2: string
  o3: string
}

export type TableThemeName = 'Emerald' | 'Sapphire' | 'Burgundy' | 'Twilight'

export const TABLE_THEMES: Record<TableThemeName, TableTheme> = {
  Emerald:  { base: '#123524', g1: '#1d5236', g2: '#0c2417', o1: '#155047', o2: '#0e3a30', o3: '#08231d' },
  Sapphire: { base: '#0e1f3a', g1: '#1b3a66', g2: '#081427', o1: '#1a3f6e', o2: '#102a4e', o3: '#08152e' },
  Burgundy: { base: '#2a0e14', g1: '#5a1822', g2: '#1c0509', o1: '#5e1a24', o2: '#3a0f16', o3: '#1c070b' },
  Twilight: { base: '#1c1233', g1: '#3a2363', g2: '#0f0820', o1: '#3a2a66', o2: '#241a4a', o3: '#0f0a22' },
}

export const DEFAULT_THEME: TableThemeName = 'Twilight'

/** Full felt background image (layered texture + radial wash). */
export function feltBg(t: TableTheme): string {
  return [
    'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.02) 0.6px, transparent 1.2px)',
    'repeating-linear-gradient(45deg, transparent 0 2px, rgba(255,255,255,0.014) 2px 4px)',
    'repeating-linear-gradient(-45deg, transparent 0 2px, rgba(0,0,0,0.05) 2px 4px)',
    `radial-gradient(ellipse 80% 70% at 50% 42%, ${t.g1} 0%, ${t.g2} 78%)`,
  ].join(',')
}

/** Radial wash for the oval table surface. */
export function ovalBg(t: TableTheme): string {
  return `radial-gradient(ellipse at 50% 40%, ${t.o1} 0%, ${t.o2} 64%, ${t.o3} 100%)`
}

export function getTableTheme(name: TableThemeName = DEFAULT_THEME): TableTheme {
  return TABLE_THEMES[name] || TABLE_THEMES.Twilight
}
