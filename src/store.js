import { create } from 'zustand'

const COMMON = ['rosa', 'cafe', 'dorado', 'cian']

// En cada clic sale otro color; el azul aparece rara vez.
function nextVariant(current) {
  if (current !== 'azul' && Math.random() < 1 / 12) return 'azul'
  const options = COMMON.filter((v) => v !== current)
  return options[(Math.random() * options.length) | 0]
}

export const useStore = create((set) => ({
  count: 1,
  // variant: el color que viene; shown: el que se ve (cambia a mitad de la voltereta).
  variant: 'rosa',
  shown: 'rosa',
  inc: () => set((state) => ({ count: state.count + 1, variant: nextVariant(state.variant) })),
}))
