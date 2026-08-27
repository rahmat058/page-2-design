import { describe, expect, it } from 'vitest'
import type { ColorToken, NormalizedDesign } from '../shared/types'
import { buildDesignSystem } from '../sidepanel/lib/design-system'

function color(partial: Partial<ColorToken> & Pick<ColorToken, 'id' | 'hex' | 'count'>): ColorToken {
  return {
    name: partial.name ?? partial.hex,
    nameInferred: true,
    rgba: partial.hex,
    hsl: '',
    oklch: '',
    original: [partial.hex],
    area: partial.area ?? partial.count,
    properties: partial.properties ?? ['background-color'],
    elementIds: partial.elementIds ?? [],
    role: partial.role ?? 'accent',
    roleInferred: true,
    nearDuplicates: [],
    kind: partial.kind ?? 'solid',
    css: partial.css ?? partial.hex,
    ...partial,
  }
}

function stubDesign(colors: ColorToken[], buttonElementIds: string[] = []): NormalizedDesign {
  return {
    metadata: {
      title: 'Riley',
      hostname: 'rileyapp.com',
      url: 'https://rileyapp.com/',
      scannedAt: new Date().toISOString(),
      ogTitle: 'Riley',
    },
    tokens: {
      colors,
      typography: [],
      spacing: [],
      radii: [],
      shadows: [],
      borders: [],
      opacity: [],
      zIndex: [],
      breakpoints: [],
    },
    assets: [],
    content: [],
    sections: [],
    components: buttonElementIds.length
      ? [
          {
            id: 'comp_button_1',
            kind: 'button',
            name: 'Button',
            nameInferred: true,
            confidence: 0.8,
            elementIds: buttonElementIds,
            notes: '',
          },
        ]
      : [],
    coverage: { relevantElements: 0, visibleTextBlocks: 0 },
    limitations: [],
  } as unknown as NormalizedDesign
}

describe('buildDesignSystem color scales', () => {
  it('prefers brand chromatic colors over high-count grays', () => {
    const model = buildDesignSystem(
      stubDesign([
        color({ id: 'g1', hex: '#E5E5E5', count: 800, area: 90000, role: 'surface' }),
        color({ id: 'g2', hex: '#000000', count: 660, area: 40000, role: 'text' }),
        color({ id: 'g3', hex: '#FFFFFF', count: 500, area: 120000, role: 'surface' }),
        color({ id: 'brown', hex: '#B3804C', count: 40, area: 18000, role: 'accent' }),
        color({ id: 'purple', hex: '#7C6BB5', count: 35, area: 12000, role: 'background' }),
        color({ id: 'peach', hex: '#E8A07A', count: 30, area: 9000, role: 'accent' }),
        color({ id: 'midgray', hex: '#737373', count: 90, area: 8000, role: 'border' }),
        color({ id: 'green', hex: '#22C55E', count: 8, area: 400, role: 'accent' }),
        color({ id: 'amber', hex: '#F59E0B', count: 6, area: 300, role: 'accent' }),
        color({ id: 'red', hex: '#EF4444', count: 5, area: 280, role: 'accent' }),
        color({ id: 'pink', hex: '#FF93AB', count: 50, area: 5000, role: 'accent' }),
      ]),
    )

    const byName = Object.fromEntries(model.scales.map((s) => [s.name, s.baseHex.toLowerCase()]))
    expect(model.scales.map((s) => s.name)).toEqual(['Primary', 'Secondary', 'Accent', 'Neutral'])
    expect(byName.Primary).toBe('#b3804c')
    expect(byName.Secondary).toBe('#7c6bb5')
    expect(['#e8a07a', '#ff93ab']).toContain(byName.Accent)
    expect(byName.Neutral).toBe('#737373')
    expect(['#e5e5e5', '#ffffff', '#000000']).not.toContain(byName.Primary)

    const tones = Object.fromEntries(model.semantic.map((s) => [s.tone, s.hex.toLowerCase()]))
    expect(tones.success).toBe('#22c55e')
    expect(tones.warning).toBe('#f59e0b')
    expect(tones.error).toBe('#ef4444')
    expect(model.semantic).toHaveLength(3)
  })

  it('uses CTA button fill as Primary over pastel gradient oranges', () => {
    const model = buildDesignSystem(
      stubDesign(
        [
          color({
            id: 'orange',
            hex: '#FFA168',
            count: 20,
            area: 90000,
            role: 'accent',
          }),
          color({
            id: 'purple',
            hex: '#6339CC',
            count: 12,
            area: 2400,
            role: 'background',
            elementIds: ['btn-1'],
            properties: ['background-color'],
          }),
          color({ id: 'lavender', hex: '#C4B5FD', count: 18, area: 8000, role: 'accent' }),
          color({ id: 'midgray', hex: '#737373', count: 40, area: 5000, role: 'border' }),
          color({
            id: 'grad',
            hex: '#FFA168',
            count: 1,
            kind: 'gradient',
            css: 'radial-gradient(#FFA168, #fff)',
            role: 'gradient',
          }),
        ],
        ['btn-1'],
      ),
    )

    const byName = Object.fromEntries(model.scales.map((s) => [s.name, s.baseHex.toLowerCase()]))
    expect(byName.Primary).toBe('#6339cc')
    expect(model.primary.toLowerCase()).toBe('#6339cc')
    // No invented Success/Warning/Error when the page has none.
    expect(model.semantic).toHaveLength(0)
  })

  it('maps semantic tokens only from scanned page colors / CSS names', () => {
    const model = buildDesignSystem(
      stubDesign([
        color({ id: 'purple', hex: '#5934C5', count: 20, area: 5000, role: 'background' }),
        color({
          id: 'ok',
          hex: '#16A34A',
          count: 4,
          area: 200,
          role: 'accent',
          original: ['var(--color-success)'],
        }),
        color({
          id: 'warn',
          hex: '#EAB308',
          count: 3,
          area: 180,
          role: 'accent',
          original: ['var(--warning)'],
        }),
        color({
          id: 'bad',
          hex: '#DC2626',
          count: 3,
          area: 160,
          role: 'accent',
          original: ['var(--error)'],
        }),
        color({ id: 'gray', hex: '#6B7280', count: 30, area: 4000, role: 'border' }),
      ]),
    )
    const tones = Object.fromEntries(model.semantic.map((s) => [s.tone, s.hex.toLowerCase()]))
    expect(tones.success).toBe('#16a34a')
    expect(tones.warning).toBe('#eab308')
    expect(tones.error).toBe('#dc2626')
    expect(model.semantic.every((s) => !['#22c55e', '#f59e0b', '#ef4444'].includes(s.hex.toLowerCase()))).toBe(true)
  })

  it('always emits Primary, Secondary, Accent, Neutral and skips neon CTA as Primary', () => {
    const model = buildDesignSystem(
      stubDesign([
        color({ id: 'white', hex: '#FFFFFF', count: 400, area: 120000, role: 'surface' }),
        color({ id: 'black', hex: '#000000', count: 80, area: 8000, role: 'text' }),
        color({ id: 'lime', hex: '#CCFF00', count: 10, area: 900, role: 'accent', elementIds: ['btn-cta'] }),
        color({ id: 'blue', hex: '#1D4CFF', count: 14, area: 1800, role: 'accent' }),
        color({ id: 'steel', hex: '#63789C', count: 180, area: 42000, role: 'text' }),
        color({ id: 'slate', hex: '#7B7B84', count: 90, area: 12000, role: 'border' }),
        color({ id: 'grey', hex: '#808080', count: 70, area: 9000, role: 'border' }),
        color({ id: 'charcoal', hex: '#29292B', count: 40, area: 16000, role: 'text' }),
      ]),
    )
    const names = model.scales.map((s) => s.name)
    expect(names).toEqual(['Primary', 'Secondary', 'Accent', 'Neutral'])
    const byName = Object.fromEntries(model.scales.map((s) => [s.name, s.baseHex.toLowerCase()]))
    expect(byName.Primary).toBe('#63789c')
    expect(byName.Primary).not.toBe('#ccff00')
    expect(['#7b7b84', '#808080', '#1d4cff', '#29292b']).toContain(byName.Secondary)
    expect(byName.Secondary).not.toBe('#ccff00')
    expect(byName.Accent).toBeTruthy()
    expect(byName.Accent).not.toBe('#ccff00')
    expect(['#808080', '#7b7b84', '#29292b']).toContain(byName.Neutral)
  })
})
