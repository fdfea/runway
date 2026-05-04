import 'jest-extended'
import { Cards, Decks, Rank, Suits } from '../src/cards'
import { Game, TableauPile } from '../src/game'

test("TableauPile", () => {
    const cards = new TableauPile()
    expect(cards.empty()).toBeTrue()

    cards.hidden.add(Cards._9d)
    cards.hidden.add(Cards._Tc)
    expect(cards.hidden.size()).toBe(2)
    expect(cards.hidden.top()).toBe(Cards._Tc)
    expect(cards.hidden.bottom()).toBe(Cards._9d)
    expect(cards.active.size()).toBe(0)
    expect(cards.active.top()).toBe(undefined)
    expect(cards.active.bottom()).toBe(undefined)

    expect(cards.reveal()).toBeTrue()
    expect(cards.reveal()).toBeFalse()
    expect(cards.hidden.size()).toBe(1)
    expect(cards.hidden.top()).toBe(Cards._9d)
    expect(cards.hidden.bottom()).toBe(Cards._9d)
    expect(cards.active.size()).toBe(1)
    expect(cards.active.top()).toBe(Cards._Tc)
    expect(cards.active.bottom()).toBe(Cards._Tc)
})

test("Game", () => {
    const game = new Game
    expect(game.finished()).toBeFalse()
    expect(game.getScore()).toBe(0);
    expect(game.getFoundationPiles().length).toBe(Suits.All.size)
    expect(game.getTableauPiles().length).toBe(Game.TableauPiles)
    expect(game.getFoundationPiles().every(pile => 
        pile.size() === 1 && pile.top()!.rank === Rank.Ace
    )).toBeTrue()
    expect(game.getTableauPiles().every((pile, index) =>
        pile.active.size() === 1 && pile.hidden.size() === index
    )).toBeTrue()
    expect(game.getStockPile().size()).toBe(20)
    expect(game.getScorePile()).toBeEmpty()
})
