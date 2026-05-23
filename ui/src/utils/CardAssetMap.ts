import { Card, Rank, Suit } from 'engine'

// Maps an engine Card to the public asset path key used by Phaser loader.
// Asset filenames follow the pattern: {rank_name}_of_{suit_name}.svg
// e.g. Card(Rank.Ten, Suit.Hearts) → key "10_of_hearts"

const RANK_NAMES: Record<string, string> = {
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  'T': '10',
  'J': 'jack',
  'Q': 'queen',
  'K': 'king',
  'A': 'ace',
}

const SUIT_NAMES: Record<string, string> = {
  'c': 'clubs',
  'd': 'diamonds',
  'h': 'hearts',
  's': 'spades',
}

export function cardToKey(card: Card): string {
  const rankStr = card.rank.toString()
  const suitStr = card.suit.toString()
  const rankName = RANK_NAMES[rankStr]
  const suitName = SUIT_NAMES[suitStr]
  return `${rankName}_of_${suitName}`
}

export function cardToPath(card: Card): string {
  return `/assets/cards/${cardToKey(card)}.svg`
}

export const CARD_BACK_KEY = 'card_back'
export const CARD_BACK_PATH = '/assets/cards/card-back.png'

export const BACKGROUND_KEY = 'bg'
export const BACKGROUND_PATH = '/assets/background/green-card-table.jpg'

// Enumerate all 52 cards for the loader
export const ALL_CARD_KEYS: Array<{ key: string; path: string; rank: string; suit: string }> = []

const RANKS_ORDER = ['2','3','4','5','6','7','8','9','T','J','Q','K','A']
const SUITS_ORDER = ['c','d','h','s']

for (const suit of SUITS_ORDER) {
  for (const rank of RANKS_ORDER) {
    const rankName = RANK_NAMES[rank]
    const suitName = SUIT_NAMES[suit]
    ALL_CARD_KEYS.push({
      key: `${rankName}_of_${suitName}`,
      path: `/assets/cards/${rankName}_of_${suitName}.svg`,
      rank,
      suit,
    })
  }
}
