import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('touch targets accessibility (WCAG 2.5.5 / 2.5.8)', () => {
  const cssPath = join(__dirname, '../styles.css')
  const css = readFileSync(cssPath, 'utf8')

  it('includes pointer: coarse media query for touch devices', () => {
    expect(css).toMatch(/@media[^{]*\(\s*pointer\s*:\s*coarse\s*\)/)
  })

  it('includes max-width: 600px breakpoint for mobile touch screens', () => {
    expect(css).toMatch(/@media[^{]*\(\s*max-width\s*:\s*600px\s*\)/)
  })

  it('enforces 44px min-height and min-width on buttons and interactive elements', () => {
    const coarseBlockMatch = css.match(/@media[^{]*\(\s*pointer\s*:\s*coarse\s*\)[^{]*\{([\s\S]*?)\n\}/)
    expect(coarseBlockMatch).not.toBeNull()
    const coarseBlock = coarseBlockMatch![1]

    expect(coarseBlock).toContain('min-height: 44px')
    expect(coarseBlock).toContain('min-width: 44px')
    expect(coarseBlock).toContain('.btn')
    expect(coarseBlock).toContain('.sound-btn')
    expect(coarseBlock).toContain('.chip')
    expect(coarseBlock).toContain('.toolbar .btn')
    expect(coarseBlock).toContain('.topbar nav a')
  })

  it('ensures chip touch padding is expanded for comfortable mobile tapping', () => {
    const coarseBlockMatch = css.match(/@media[^{]*\(\s*pointer\s*:\s*coarse\s*\)[^{]*\{([\s\S]*?)\n\}/)
    const coarseBlock = coarseBlockMatch![1]
    expect(coarseBlock).toContain('padding: 0.5rem 0.9rem')
  })

  it('enforces 44px min-height on component parts and mode segment tabs on touch devices', () => {
    const coarseBlockMatch = css.match(/@media[^{]*\(\s*pointer\s*:\s*coarse\s*\)[^{]*\{([\s\S]*?)\n\}/)
    expect(coarseBlockMatch).not.toBeNull()
    const coarseBlock = coarseBlockMatch![1]

    expect(coarseBlock).toContain('.part')
    expect(coarseBlock).toContain('.seg a')
    expect(coarseBlock).toMatch(/\.part,\s*\.seg a\s*\{[^}]*min-height:\s*44px/)
    expect(coarseBlock).toContain('padding: 0.5rem 0.75rem')
  })
})
