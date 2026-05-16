import Readline from 'readline-sync'
import { Cards, Deck, UnorderedCardSet } from './cards'
import { FoundationPile, Game, TableauPile } from './game'
import { Move, Moves } from './moves'
import { Component, ComponentRegistry } from './utils'

const game = new Game
const registry = new ComponentRegistry

class FoundationPileIndex {
    constructor (readonly index: number, readonly pile: FoundationPile) {}
}

class TableauPileIndex {
    constructor (readonly index: number, readonly pile: TableauPile) {}
}

const foundationPileComponents: Array<Component<FoundationPileIndex>> =
    game.getFoundationPiles().map((pile, i) => registry.register(new FoundationPileIndex(i, pile)))
const tableauPileComponents: Array<Component<TableauPileIndex>> =
    game.getTableauPiles().map((pile, i) => registry.register(new TableauPileIndex(i, pile)))
const scorePileComponent: Component<UnorderedCardSet> = registry.register(game.getScorePile())
const stockPileComponent: Component<Deck> = registry.register(game.getStockPile())

console.log("Welcome to Game!")

while (!game.finished()) {
    console.log(renderGame())

    let madeMove: boolean = false
    while (!madeMove) {
        let move : Move | undefined
        do {
            const moveStr: string = Readline.question("Enter move: ")
            if (!(move = readMove(moveStr))) {
                console.log("Error parsing move")
            }
        } while (!move)

        try {
            game.makeMove(move)
            madeMove = true
        } catch (error) {
            console.log(`Error making move: ${(error as Error).message}`)
        }
    }
    
    console.log("\n==================================================")
}

console.log(renderGame())
console.log(`Game finished, score: ${game.getScore()}`)

function readMove(moveStr: string): Move | undefined {
    const moveParts = moveStr.trim().split(/\s+/)
    const fromComponent = registry.retrieve(+moveParts[0])?.object
    const toComponent = registry.retrieve(+moveParts[1])?.object
    const card = Cards.parse(moveParts[2])

    if (fromComponent instanceof TableauPileIndex && toComponent instanceof FoundationPileIndex) {
        const fromIndex = (fromComponent as TableauPileIndex).index
        const toIndex = (toComponent as FoundationPileIndex).index
        return Moves.TableauPileToFoundationPile(fromIndex, toIndex)
    }

    if (fromComponent instanceof TableauPileIndex && !toComponent) {
        const fromIndex = (fromComponent as TableauPileIndex).index
        return Moves.RevealFromTableauPile(fromIndex)
    }

    if (fromComponent instanceof TableauPileIndex && toComponent instanceof TableauPileIndex) {
        const fromIndex = (fromComponent as TableauPileIndex).index
        const toIndex = (toComponent as TableauPileIndex).index
        return Moves.TableauPileToTableauPile(fromIndex, toIndex)
    }

    if (fromComponent instanceof TableauPileIndex && toComponent instanceof UnorderedCardSet) {
        const fromIndex = (fromComponent as TableauPileIndex).index
        return Moves.TableauPileToScorePile(fromIndex)
    }

    if (fromComponent instanceof UnorderedCardSet && toComponent instanceof FoundationPileIndex) {
        const toIndex = (toComponent as FoundationPileIndex).index
        if (card) {
            return Moves.ScorePileToFoundationPile(card, toIndex)
        }
    }

    if (fromComponent instanceof UnorderedCardSet && toComponent instanceof TableauPileIndex) {
        const toIndex = (toComponent as TableauPileIndex).index
        if (card) {
            return Moves.ScorePileToTableauPile(card, toIndex)
        }
    }

    if (fromComponent instanceof Deck && toComponent instanceof TableauPileIndex) {
        const toIndex = (toComponent as TableauPileIndex).index
        return Moves.StockPileToTableauPile(toIndex)
    }

    if (fromComponent instanceof Deck && toComponent instanceof UnorderedCardSet) {
        return Moves.StockPileToScorePile()
    }

    return undefined
}

function renderGame() {
    return `
Foundation Piles:
   ${foundationPileComponents.values().map((c) => `${c.id.toString().padStart(2)}. ${c.object.pile}`).toArray().join('\n   ')}
Tableau Piles:
   ${tableauPileComponents.values().map((c) => `${c.id.toString().padStart(2)}. ${c.object.pile}`).toArray().join('\n   ')}
Score Pile:
   ${scorePileComponent.id}. ${scorePileComponent.object}
Stock Pile:
   ${stockPileComponent.id}. ${stockPileComponent.object}
Score:
    ${game.getScore()}`
}
