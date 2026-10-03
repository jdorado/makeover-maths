import type { Gear } from './game'

/** Small vector wardrobe assets share the room's soft lavender and gold palette. */
export function GearArt({ item, wearing = false }: { item: Gear; wearing?: boolean }) {
  if (wearing && (item.slot === 'eyes' || item.slot === 'lips')) return <svg viewBox="0 0 100 40" role="img" aria-label={item.name} style={{ color: item.colour }}>{item.slot === 'eyes' ? <path d="M8 24q16-14 30 0m24 0q16-14 30 0" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" /> : <path d="M12 20q18-21 38-9 20-12 38 9-38 30-76 0Z" fill="currentColor" />}</svg>
  const sporty = item.occasion === 'sport'
  return <svg viewBox="0 0 100 80" role="img" aria-label={item.name} style={{ color: item.colour }}>
    <defs><linearGradient id={`shine-${item.id}`} x2="1" y2="1"><stop stopColor="currentColor" /><stop offset="1" stopColor="#fff1db" /></linearGradient></defs>
    <g fill={`url(#shine-${item.id})`} stroke="#725770" strokeWidth="2.5" strokeLinejoin="round">
      {item.slot === 'bag' && (sporty ? <><rect x="22" y="22" width="57" height="48" rx="14" /><path d="M38 23V13h25v10M22 33l-10 22m67-22 10 22M32 45h37v18H32Z" /><path d="M45 28h12" fill="none" /></> : <><path d="M20 29h62l5 40H15ZM33 29V17c0-14 37-14 37 0v12" /><path d="M19 37h65M50 34v12" fill="none" /><circle cx="50" cy="46" r="4" fill="#f2d890" /></>)}
      {item.slot === 'shoes' && (sporty ? <><path d="M15 28h27l7 21 32 7q9 2 10 13H9V54Z" /><path d="M9 62h81M33 37l16-3M37 43l17-3M40 49l18-3" fill="none" /></> : <><path d="M14 42q18 19 35-6l8-17 13 6-5 25q9 4 24 7v11H45q-16-1-19-13L16 70h-6Z" /><path d="m54 36 13 6" fill="none" /></>)}
      {item.slot === 'accessory' && (sporty ? <><path d="M12 49q38-39 76 0l-5 12q-33-33-66 0Z" /><path d="m49 29 4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1Z" fill="#f2d890" /></> : item.occasion === 'garden' ? <><path d="M12 58q38-33 76 0" fill="none" stroke="#789a7d" strokeWidth="6" />{[25, 50, 75].map((x, i) => <g key={x} transform={`translate(${x} ${i === 1 ? 34 : 44})`}>{[0, 60, 120].map(a => <ellipse key={a} rx="6" ry="13" transform={`rotate(${a})`} />)}<circle r="4" fill="#f2d890" /></g>)}</> : <><path d="m15 57-6-31 26 17 15-31 15 31 26-17-6 31Z" /><path d="M15 57h70v10H15Z" /><circle cx="50" cy="44" r="6" fill="#f2d890" /></>)}
      {item.slot === 'eyes' && <><path d="M15 25h70v40H15Z" /><path d="M15 25V15h70v10" fill="#fff8ee" />{[30, 50, 70].map(x => <circle key={x} cx={x} cy="44" r="7" />)}<path d="m81 9 3 5 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1Z" fill="#f2d890" /></>}
      {item.slot === 'lips' && <><rect x="34" y="40" width="30" height="31" rx="3" /><path d="M38 40V17l22-8v31Z" /><path d="M34 49h30" fill="none" /><path d="m78 18 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="#f2d890" /></>}
    </g>
  </svg>
}
