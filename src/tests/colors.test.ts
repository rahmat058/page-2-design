import { describe, expect, it } from 'vitest'
import { parseColor, inferColorRole, pagePaletteGroups, colorIsExact } from '../normalize/colors'

describe('color parsing', () => {
  it('parses hex, rgb, hsl, and named colors', () => {
    expect(parseColor('#1d4ed8')?.hex).toBe('#1D4ED8')
    expect(parseColor('#fff')?.hex).toBe('#FFFFFF')
    expect(parseColor('rgb(29, 78, 216)')?.rgba).toBe('rgba(29, 78, 216, 1)')
    expect(parseColor('rgba(0,0,0,0.5)')?.a).toBe(0.5)
    expect(parseColor('hsl(224, 76%, 48%)')).not.toBeNull()
    expect(parseColor('black')?.hex).toBe('#000000')
    expect(parseColor('transparent')?.a).toBe(0)
  })

  it('parses oklch', () => {
    const parsed = parseColor('oklch(0.6 0.1 250)')
    expect(parsed).not.toBeNull()
    expect(parsed?.oklch.startsWith('oklch(')).toBe(true)
  })

  it('rejects unsupported values', () => {
    expect(parseColor('currentcolor')).toBeNull()
    expect(parseColor('color(display-p3 1 0 0)')).toBeNull()
  })

  it('treats only near-identical computed values as exact', () => {
    expect(colorIsExact('rgb(17, 17, 17)', '#111111')).toBe(true)
    expect(colorIsExact('rgb(18, 18, 40)', '#111111')).toBe(false)
  })

  it('infers roles without claiming certainty', () => {
    expect(inferColorRole('#111111', ['color'])).toBe('text')
    expect(inferColorRole('#FFFFFF', ['background-color'])).toBe('surface')
  })

  it('groups page colors as gradients, then primary, then secondary', () => {
    const groups = pagePaletteGroups([
      { id: 'g1', hex: '#FF914D', kind: 'gradient', area: 400, count: 2 },
      { id: 'p1', hex: '#111111', kind: 'solid', area: 8000, count: 40 },
      { id: 'p2', hex: '#FFFFFF', kind: 'solid', area: 9000, count: 20 },
      { id: 'a1', hex: '#7A55FD', kind: 'solid', area: 600, count: 8 },
      { id: 's1', hex: '#E5E7EB', kind: 'solid', area: 80, count: 3 },
    ])
    expect(groups.map((group) => group.key)).toEqual(['gradient', 'primary', 'secondary'])
    expect(groups[0]?.ids).toEqual(['g1'])
    expect(groups[1]?.ids[0]).toBe('p2')
    expect(groups[1]?.ids).toContain('p1')
    expect(groups[1]?.ids).toContain('a1')
    expect(groups[2]?.ids).toEqual(['s1'])
  })
})
