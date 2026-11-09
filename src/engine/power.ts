import type { Device } from './types'

/** What the power source is called to the player: consoles and TVs run from the mains, the rest from a battery. */
export const powerWord = (d: Pick<Device, 'category'>) => (d.category === 'console' || d.category === 'tv' ? 'Power supply' : 'Battery')
