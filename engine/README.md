# Game (to be titled)

Backend card library and rules implementation for Game.

# CLI Runner

Run `npm start` to begin.

The initial state of the game will be displayed, e.g:
```
Foundation Piles:
    0. [Ac]
    1. [Ad]
    2. [Ah]
    3. [As]
Tableau Piles:
    4. [(0), [9s]]
    5. [(1), [4s]]
    6. [(2), [Jc]]
    7. [(3), [4h]]
    8. [(4), [6h]]
    9. [(5), [5c]]
   10. [(6), [6s]]
Score Pile:
   11. []
Stock Pile:
   12. (20)
Score:
    0
```

Each stack of cards is labeled with an index (0-12), which is how the player will identify which piles they wish to act on.

The player will be prompted for a single line of input until a valid move can be parsed. A valid move usually consists of two indices, the pile from which to move and the pile to move to, respectivley. Exceptions include: (1) when moving a card from the score pile, the player must also include the card to move as a third argument and (2) when revealing a hidden card from a tableau pile, only one argument is necessary, the index of the pile.

Some examples of valid input (depending on the state of the game) include:
* `12 11` (Draw from the stock pile to the score pile)
* `5 1` (Move from tableau pile to foundation pile)
* `7` (Reveal hidden card from tableau pile)
* `11 6 Th` (Move Th from the score pile to tableau pile)

When a valid move is parsed, it will be applied to the game. If the move cannot be applied to the current state of the game, an error message will be displayed and the player will be prompted for a new move. 

When the game is complete the final score will be displayed. 
