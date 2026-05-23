// Player-facing rules for the in-game Rules popup.
// The authoritative rule reference is rules.txt at the project root.

export interface RulesSection {
  heading: string
  body: string
}

export const RULES_SECTIONS: RulesSection[] = [
  {
    heading: 'Goal',
    body:
      'Move all cards onto the four Foundation piles with the lowest score possible.',
  },
  {
    heading: 'The Piles',
    body:
      '4 FOUNDATION PILES (top row) — Each starts with one Ace. You may build on either side of each pile, adding cards of the same suit in consecutive rank order. A pile is complete when it holds all 13 cards of its suit.\n\n' +
      '7 TABLEAU PILES (middle row) — Each has a face-down "hidden" stack and a face-up "active" run on top. At the start, piles hold 1–7 hidden cards (left to right), with the top card of each revealed. You can add cards to the active run only if they match the suit and are consecutive in rank with the current top card. Any card may be played onto a pile with no active cards.\n\n' +
      'SCORE PILE (bottom-right area) — Starts empty. All cards here are visible. Think of it as a holding area — but using it costs you points.\n\n' +
      'STOCK PILE (bottom-left) — The remaining ~20 cards, all face-down. Draw from here to put cards into play.',
  },
  {
    heading: 'Legal Moves',
    body:
      '1. STOCK → SCORE PILE: Draw the top card from the Stock and place it face-up on the Score pile.\n\n' +
      '2. STOCK → TABLEAU: Draw the top card from the Stock directly onto a Tableau pile whose active run is currently empty.\n\n' +
      '3. SCORE → TABLEAU: Move any card from the Score pile onto a Tableau pile, if the card is suited-consecutive with the current top of that pile (or the pile\'s active run is empty).\n\n' +
      '4. SCORE → FOUNDATION: Move any card from the Score pile onto the matching Foundation pile, if it\'s the next consecutive card of that suit.\n\n' +
      '5. REVEAL HIDDEN CARD: Flip the top hidden card of a Tableau pile face-up, starting a new active run. Only legal when the active run of that pile is empty.\n\n' +
      '6. TABLEAU → FOUNDATION: Move the entire active run from a Tableau pile onto a Foundation pile. Either end of the run must connect consecutively to the Foundation pile\'s top card.\n\n' +
      '7. TABLEAU → TABLEAU: Move the entire active run from one Tableau pile onto another. Either end of the moving run must connect consecutively to the top of the destination pile (or the destination\'s active run must be empty).\n\n' +
      '8. TABLEAU → SCORE PILE: Move the entire active run from a Tableau pile onto the Score pile. Only legal once the Stock pile is completely empty.',
  },
  {
    heading: 'Scoring',
    body:
      'Your score starts at 0. Certain moves add a penalty equal to the number of cards currently in the Score pile at the moment you make the move:\n\n' +
      '  • Score → Tableau\n' +
      '  • Score → Foundation\n' +
      '  • Tableau → Foundation\n\n' +
      'All other moves are free. Keep the Score pile small to keep penalties low.',
  },
  {
    heading: 'How to Win',
    body:
      'The game is finished when all four Foundation piles are complete. Minimize your score to win — a perfect game ends with a score of 0.',
  },
]
