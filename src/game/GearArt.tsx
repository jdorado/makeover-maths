import { assetRoot } from './game'
import type { Gear } from './game'

/** The shop and character use the same illustrated item, with face-sized makeup overlays. */
export function GearArt({ item, wearing = false }: { item: Gear; wearing?: boolean }) {
  const face = wearing && (item.slot === 'eyes' || item.slot === 'lips')
  return <img className="mm-gear-image" src={`${assetRoot}gear/${item.id}${face ? '-worn' : ''}.webp`} alt={item.name} draggable={false} />
}
