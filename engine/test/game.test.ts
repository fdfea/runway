import 'jest-extended'
import { Cards, Rank, Suit, Suits } from '../src/cards'
import { FoundationPile, Game, TableauPile } from '../src/game'

test("FoundationPile", () => {
    const cards = new FoundationPile(Cards._Ad)
    Cards.All.values()
        .filter(card => card.suit === Suit.Diamonds)
        .forEach(card => (cards.add(card)))
    expect(cards.complete()).toBeTrue()
})

test("TableauPile", () => {
    const cards = new TableauPile([Cards._Ts, Cards._2d, Cards._8d, Cards._6c])
    expect(cards.size()).toBe(4)
    expect(cards.reveal()).toBeFalse()
    expect(cards.add(Cards._Js)).toBeTrue()
    expect(cards.add(Cards._9s)).toBeFalse()
    expect(cards.add(Cards._Qs)).toBeTrue()
    expect(cards.size()).toBe(6)
    expect(cards.clear()).toBeTrue()
    expect(cards.size()).toBe(3)
    expect(cards.reveal()).toBeTrue()
    expect(cards.add(Cards._Ad)).toBeTrue()
    expect(cards.add(Cards._Kd)).toBeTrue()
    expect(cards.front()).toBe(Cards._Kd)
    expect(cards.back()).toBe(Cards._2d)
    expect(cards.size()).toBe(5)
    expect(cards.hiddenRemaining()).toBe(2)
    expect(cards.clear()).toBeTrue()
    expect(cards.front()).toBe(undefined)
    expect(cards.back()).toBe(undefined)
    expect(cards.reveal()).toBeTrue()
    expect(cards.front()).toBe(Cards._8d)
    expect(cards.back()).toBe(Cards._8d)
    expect(cards.clear()).toBeTrue()
    expect(cards.hiddenRemaining()).toBe(1)
    expect(cards.reveal()).toBeTrue()
    expect(cards.hiddenRemaining()).toBe(0)
    expect(cards.depleted()).toBeFalse()
    expect(cards.clear()).toBeTrue()
    expect(cards.depleted()).toBeTrue()
})

test("Game", () => {
    const game = new Game
    expect(game.finished()).toBeFalse()
    expect(game.getScore()).toBe(0);
    expect(game.getFoundationPiles().length).toBe(Suits.All.size)
    expect(game.getTableauPiles().length).toBe(Game.TableauPiles)
    expect(game.getFoundationPiles().every(pile => 
        pile.size() === 1 && pile.front()!.rank === Rank.Ace
    )).toBeTrue()
    expect(game.getTableauPiles().every((pile, index) =>
        pile.size() === index + 1
    )).toBeTrue()
    expect(game.getStockPile().size()).toBe(20)
    expect(game.getScorePile()).toBeEmpty()
})
