import 'jest-extended'
import { Cards } from '../src/cards'
import { Game } from '../src/game'
import { Moves } from '../src/moves'

test("StockPileToScorePile", () => {
    const game = new Game

    expect(game.getStockPile().size()).toBe(20)
    expect(game.getScorePile().size()).toBe(0)
    const move = Moves.StockPileToScorePile()
    game.makeMove(move)
    expect(game.getStockPile().size()).toBe(19)
    expect(game.getScorePile().size()).toBe(1)

    while (!game.getStockPile().empty()) game.getStockPile().deal()
    expect(() => game.makeMove(move)).toThrow()
    expect(game.getStockPile().size()).toBe(0)
    expect(game.getScorePile().size()).toBe(1)

    expect(game.getScore()).toBe(0)
})

test("StockPileToTableauPile", () => {
    const game = new Game
    game.getScorePile().add(Cards._9c)

    const badPileMove = Moves.StockPileToTableauPile(10)
    expect(() => game.makeMove(badPileMove)).toThrow()
    expect(game.getStockPile().size()).toBe(20)

    const move = Moves.StockPileToTableauPile(1)
    expect(() => game.makeMove(move)).toThrow()
    expect(game.getStockPile().size()).toBe(20)
    expect(game.getTableauPile(1)?.active.size()).toBe(1)

    game.getTableauPile(1)?.active.clear()
    expect(game.getTableauPile(1)?.active.size()).toBe(0)
    game.makeMove(move)
    expect(game.getStockPile().size()).toBe(19)
    expect(game.getTableauPile(1)?.active.size()).toBe(1)

    while (!game.getStockPile().empty()) game.getStockPile().deal()
    game.getTableauPile(1)?.active.clear()
    expect(game.getStockPile().size()).toBe(0)
    expect(game.getTableauPile(1)?.active.size()).toBe(0)
    expect(() => game.makeMove(move)).toThrow()
    expect(game.getStockPile().size()).toBe(0)
    expect(game.getTableauPile(1)?.active.size()).toBe(0)

    expect(game.getScore()).toBe(0)
})

test("ScorePileToTableauPile", () => {
    const game = new Game
    game.getScorePile().add(Cards._6s)
    game.getScorePile().add(Cards._7s)
    expect(game.getScorePile().size()).toBe(2)

    const badPileMove = Moves.ScorePileToTableauPile(Cards._6s, -1)
    expect(() => game.makeMove(badPileMove)).toThrow()
    expect(game.getScorePile().size()).toBe(2)

    game.getTableauPile(2)?.active.clear()
    expect(game.getTableauPile(2)?.active.size()).toBe(0)
    const badCardMove = Moves.ScorePileToTableauPile(Cards._As, 2)
    expect(() => game.makeMove(badCardMove)).toThrow()
    expect(game.getScorePile().size()).toBe(2)
    expect(game.getTableauPile(2)?.active.size()).toBe(0)

    const valid6sMove = Moves.ScorePileToTableauPile(Cards._6s, 2)
    game.makeMove(valid6sMove)
    expect(game.getScorePile().size()).toBe(1)
    const valid7sMove = Moves.ScorePileToTableauPile(Cards._7s, 2)
    game.makeMove(valid7sMove)
    expect(game.getScorePile().size()).toBe(0)
    expect(game.getTableauPile(2)?.active.size()).toBe(2)

    expect(game.getScore()).toBe(3)
})

test("ScorePileToFoundationPile", () => {
    const game = new Game
    game.getScorePile().add(Cards._Ks)
    game.getScorePile().add(Cards._2c)
    game.getScorePile().add(Cards._3c)
    game.getScorePile().add(Cards._4c)
    expect(game.getScorePile().size()).toBe(4)

    const badPileMove = Moves.ScorePileToFoundationPile(Cards._6s, 4)
    expect(() => game.makeMove(badPileMove)).toThrow()
    expect(game.getScorePile().size()).toBe(4)

    game.getFoundationPile(0)?.clear()
    game.getFoundationPile(0)?.add(Cards._As)
    expect(game.getFoundationPile(0)?.size()).toBe(1)
    const badCardMove = Moves.ScorePileToFoundationPile(Cards._As, 0)
    expect(() => game.makeMove(badCardMove)).toThrow()
    expect(game.getScorePile().size()).toBe(4)
    expect(game.getFoundationPile(0)?.size()).toBe(1)

    const validKsMove = Moves.ScorePileToFoundationPile(Cards._Ks, 0)
    game.makeMove(validKsMove)
    expect(game.getScorePile().size()).toBe(3)
    expect(game.getFoundationPile(0)?.size()).toBe(2)

    expect(game.getScore()).toBe(4)
})

test("RevealFromTableauPile", () => {
    const game = new Game
    game.getScorePile().add(Cards._9c)

    expect(game.getTableauPile(6)?.active.size()).toBe(1)
    const move = Moves.RevealFromTableauPile(6)
    expect(() => game.makeMove(move)).toThrow()
    expect(game.getTableauPile(6)?.active.size()).toBe(1)

    game.getTableauPile(6)?.active.clear()
    expect(game.getTableauPile(6)?.active.size()).toBe(0)
    expect(game.getTableauPile(6)?.hidden.size()).toBe(6)
    game.makeMove(move)
    expect(game.getTableauPile(6)?.active.size()).toBe(1)
    expect(game.getTableauPile(6)?.hidden.size()).toBe(5)

    game.getTableauPile(6)?.active.clear()
    game.getTableauPile(6)?.hidden.clear()
    expect(game.getTableauPile(6)?.active.size()).toBe(0)
    expect(game.getTableauPile(6)?.hidden.size()).toBe(0)
    expect(() => game.makeMove(move)).toThrow()
    expect(game.getTableauPile(6)?.active.size()).toBe(0)
    expect(game.getTableauPile(6)?.hidden.size()).toBe(0)

    expect(game.getScore()).toBe(0)
})

test("TableauPileToFoundationPile", () => {
    const game = new Game
    game.getTableauPile(0)?.active.clear()
    game.getTableauPile(0)?.active.add(Cards._Jd)
    game.getFoundationPile(0)?.clear()
    game.getFoundationPile(0)?.add(Cards._Qd)
    game.getScorePile().add(Cards._9c)
    
    expect(game.getFoundationPile(0)?.size()).toBe(1)
    const badTableauMove = Moves.TableauPileToFoundationPile(8, 0)
    expect(() => game.makeMove(badTableauMove)).toThrow()
    expect(game.getFoundationPile(0)?.size()).toBe(1)

    expect(game.getTableauPile(0)?.active.size()).toBe(1)
    const badFoundationMove = Moves.TableauPileToFoundationPile(0, 8)
    expect(() => game.makeMove(badFoundationMove)).toThrow()
    expect(game.getTableauPile(0)?.active.size()).toBe(1)

    const move = Moves.TableauPileToFoundationPile(0, 0)
    game.makeMove(move)
    expect(game.getTableauPile(0)?.active.size()).toBe(0)
    expect(game.getFoundationPile(0)?.size()).toBe(2)

    expect(() => game.makeMove(move)).toThrow()
    expect(game.getTableauPile(0)?.active.size()).toBe(0)
    expect(game.getFoundationPile(0)?.size()).toBe(2)

    expect(game.getScore()).toBe(1)
})

test("TableauPileToTableauPile", () => {
    const game = new Game
    game.getTableauPile(3)?.active.clear()
    game.getTableauPile(3)?.active.add(Cards._5h)
    game.getTableauPile(4)?.active.clear()
    game.getTableauPile(4)?.active.add(Cards._4h)
    game.getScorePile().add(Cards._9c)

    const badSameMove = Moves.TableauPileToTableauPile(3, 3)
    expect(() => game.makeMove(badSameMove)).toThrow()
    expect(game.getTableauPile(3)?.active.size()).toBe(1)

    const move = Moves.TableauPileToTableauPile(3, 4)
    game.makeMove(move)
    expect(game.getTableauPile(3)?.active.size()).toBe(0)
    expect(game.getTableauPile(4)?.active.size()).toBe(2)

    expect(() => game.makeMove(move)).toThrow()
    expect(game.getTableauPile(3)?.active.size()).toBe(0)
    expect(game.getTableauPile(4)?.active.size()).toBe(2)

    expect(game.getScore()).toBe(0)
})

test("TableauPileToScorePile", () => {
    const game = new Game
    game.getScorePile().add(Cards._9c)

    expect(game.getTableauPile(5)?.active.size()).toBe(1)
    const badPileMove = Moves.TableauPileToScorePile(9)
    expect(() => game.makeMove(badPileMove)).toThrow()
    expect(game.getTableauPile(5)?.active.size()).toBe(1)
    expect(game.getScorePile().size()).toBe(1)

    game.getTableauPile(5)?.active.clear()
    expect(game.getTableauPile(5)?.active.size()).toBe(0)
    const move = Moves.TableauPileToScorePile(5)
    expect(() => game.makeMove(move)).toThrow()
    expect(game.getTableauPile(5)?.active.size()).toBe(0)
    expect(game.getScorePile().size()).toBe(1)

    game.getTableauPile(5)?.active.add(Cards._5s)
    expect(game.getTableauPile(5)?.active.size()).toBe(1)
    expect(() => game.makeMove(move)).toThrow()
    expect(game.getTableauPile(5)?.active.size()).toBe(1)
    expect(game.getScorePile().size()).toBe(1)

    while (!game.getStockPile().empty()) game.getStockPile().deal()
    game.makeMove(move)
    expect(game.getTableauPile(5)?.active.size()).toBe(0)
    expect(game.getScorePile().size()).toBe(2)

    expect(game.getScore()).toBe(0)
})
