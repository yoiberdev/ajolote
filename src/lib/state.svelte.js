// Estado del ajolote que comparten la escena y el rótulo de color.
const COMMON = ['rosa', 'cafe', 'dorado', 'cian']

// En cada clic sale otro color; el azul aparece rara vez.
function nextVariant(current) {
  if (current !== 'azul' && Math.random() < 1 / 12) return 'azul'
  const options = COMMON.filter((v) => v !== current)
  return options[(Math.random() * options.length) | 0]
}

// variant: el color que viene; shown: el que se ve (cambia a mitad de la voltereta).
export const game = $state({ count: 1, variant: 'rosa', shown: 'rosa' })

export function inc() {
  game.count += 1
  game.variant = nextVariant(game.variant)
}
