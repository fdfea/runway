import { Card } from './cards'
import { Game } from './game'

export interface Move {
    apply(game: Game): void
}

export class Moves {
    private constructor() {
    }

    static StockPileToScorePile(): Move {
        return new StockPileToScorePile
    }

    static StockPileToTableauPile(tableauPosition: number): Move {
        return new StockPileToTableauPile(tableauPosition)
    }

    static ScorePileToTableauPile(scorePileCard: Card, tableauPosition: number): Move {
        return new ScoringMove(new ScorePileToTableauPile(scorePileCard, tableauPosition))
    }

    static ScorePileToFoundationPile(scorePileCard: Card, foundationPosition: number): Move {
        return new ScoringMove(new ScorePileToFoundationPile(scorePileCard, foundationPosition))
    }

    static RevealFromTableauPile(tableauPosition: number): Move {
        return new RevealFromTableauPile(tableauPosition)
    }

    static TableauPileToFoundationPile(tableauPosition: number, foundationPosition: number): Move {
        return new ScoringMove(new TableauPileToFoundationPile(tableauPosition, foundationPosition))
    }

    static TableauPileToTableauPile(fromTableauPosition: number, toTableauPosition: number): Move {
        return new TableauPileToTableauPile(fromTableauPosition, toTableauPosition)
    }

    static TableauPileToScorePile(tableauPosition: number) : Move {
        return new TableauPileToScorePile(tableauPosition)
    }
}

abstract class DelegatingMove implements Move {
    private readonly delegate: Move

    constructor(move: Move) {
        this.delegate = move
    }

    apply(game: Game): void {
        return this.delegate.apply(game)
    }
}

class ScoringMove extends DelegatingMove {
    override apply(game: Game): void {
        const score = game.getScorePile().size()
        super.apply(game)
        game.addScore(score)
    }
}

class StockPileToScorePile implements Move {
    apply(game: Game): void {
        const card = game.getStockPile().deal()
        if (!card) {
            throw new Error("Cannot draw card from stock pile")
        } else {
            game.getScorePile().add(card)
        }
    }
}

class StockPileToTableauPile implements Move {
    private readonly tableauPosition: number

    constructor(tableauPosition: number) {
        this.tableauPosition = tableauPosition
    }

    apply(game: Game): void {
        const tableauPile = game.getTableauPile(this.tableauPosition)
        if (!tableauPile) {
            throw Error(`Tableau pile ${this.tableauPosition} does not exist`)
        }
        if (!tableauPile.empty()) {
            throw Error(`Tableau pile ${this.tableauPosition} is not available`)
        }
        const card = game.getStockPile().deal()
        if (!card) {
            throw Error("Cannot draw card from stock pile")
        }
        tableauPile.add(card)
    }
}

class ScorePileToTableauPile implements Move {
    private readonly scorePileCard: Card
    private readonly tableauPosition: number

    constructor(scorePileCard: Card, tableauPosition: number) {
        this.scorePileCard = scorePileCard
        this.tableauPosition = tableauPosition
    }

    apply(game: Game): void {
        const tableauPile = game.getTableauPile(this.tableauPosition)
        if (!tableauPile) {
            throw Error(`Tableau pile ${this.tableauPosition} does not exist`)
        }
        const scorePile = game.getScorePile()
        if(!scorePile.contains(this.scorePileCard)) {
            throw Error(`Score pile does not contain card ${this.scorePileCard}`)
        }
        const added = tableauPile.add(this.scorePileCard)
        if (!added) {
            throw Error(`Cannot add ${this.scorePileCard} to tableau pile ${this.tableauPosition}`)
        }
        scorePile.remove(this.scorePileCard)
    }
}

class ScorePileToFoundationPile implements Move {
    private readonly scorePileCard: Card
    private readonly foundationPosition: number

    constructor(scorePileCard: Card, foundationPosition: number) {
        this.scorePileCard = scorePileCard
        this.foundationPosition = foundationPosition
    }

    apply(game: Game): void {
        const foundationPile = game.getFoundationPile(this.foundationPosition)
        if (!foundationPile) {
            throw Error(`Foundation pile ${this.foundationPosition} does not exist`)
        }
        const scorePile = game.getScorePile()
        if(!scorePile.contains(this.scorePileCard)) {
            throw Error(`Score pile does not contain card ${this.scorePileCard}`)
        }
        const added = foundationPile.add(this.scorePileCard)
        if (!added) {
            throw Error(`Cannot add ${this.scorePileCard} to foundation pile ${this.foundationPosition}`)
        }
        scorePile.remove(this.scorePileCard)
    }
}

class RevealFromTableauPile implements Move {
    private readonly tableauPosition: number

    constructor(tableauPosition: number) {
        this.tableauPosition = tableauPosition
    }

    apply(game: Game): void {
        const tableauPile = game.getTableauPile(this.tableauPosition)
        if (!tableauPile) {
            throw Error(`Tableau pile ${this.tableauPosition} does not exist`)
        }
        if (!tableauPile.empty()) {
            throw Error(`Cannot reveal card from tableau pile ${this.tableauPosition} because it has active cards`)
        }
        if (tableauPile.depleted()) {
            throw Error(`Cannot reveal card from tableau pile ${this.tableauPosition} because it is empty`)
        }
        tableauPile.reveal()
    }
}

class TableauPileToFoundationPile implements Move {
    private readonly tableauPosition: number
    private readonly foundationPosition: number

    constructor(tableauPosition: number, foundationPosition: number) {
        this.tableauPosition = tableauPosition
        this.foundationPosition = foundationPosition
    }

    apply(game: Game): void {
        const tableauPile = game.getTableauPile(this.tableauPosition)
        if (!tableauPile) {
            throw Error(`Tableau pile ${this.tableauPosition} does not exist`)
        }
        const foundationPile = game.getFoundationPile(this.foundationPosition)
        if (!foundationPile) {
            throw Error(`Foundation pile ${this.foundationPosition} does not exist`)
        }
        if (tableauPile.empty()) {
            throw Error(`Tableau pile ${this.tableauPosition} has no active cards`)
        }
        if (!foundationPile.merge(tableauPile)) {
            throw Error(`Tableau pile ${this.tableauPosition} cannot be merged into foundation pile ${this.foundationPosition}`)
        }
        tableauPile.clear()
    }
}

class TableauPileToTableauPile implements Move {
    private readonly fromTableauPosition: number
    private readonly toTableauPosition: number

    constructor(fromTableauPosition: number, toTableauPosition: number) {
        this.fromTableauPosition = fromTableauPosition
        this.toTableauPosition = toTableauPosition
    }

    apply(game: Game): void {
        const fromTableauPile = game.getTableauPile(this.fromTableauPosition)
        if (!fromTableauPile) {
            throw Error(`Tableau pile ${this.fromTableauPosition} does not exist`)
        }
        const toTableauPile = game.getTableauPile(this.toTableauPosition)
        if (!toTableauPile) {
            throw Error(`Tableau pile ${this.toTableauPosition} does not exist`)
        }
        if (this.fromTableauPosition === this.toTableauPosition) {
            throw Error(`Tableau pile ${this.fromTableauPosition} cannot merge into itself`)
        }
        if (fromTableauPile.empty()) {
            throw Error(`Tableau pile ${this.fromTableauPosition} has no active cards`)
        }
        if (!toTableauPile.merge(fromTableauPile)) {
            throw Error(`Tableau pile ${this.fromTableauPosition} cannot be merged into tableau pile ${this.toTableauPosition}`)
        }
        fromTableauPile.clear()
    }
}

class TableauPileToScorePile implements Move {
    private readonly tableauPosition: number

    constructor(tableauPosition: number) {
        this.tableauPosition = tableauPosition
    }

    apply(game: Game): void {
        const tableauPile = game.getTableauPile(this.tableauPosition)
        if (!tableauPile) {
            throw Error(`Tableau pile ${this.tableauPosition} does not exist`)
        }
        if (tableauPile.empty()) {
            throw Error(`Tableau pile ${this.tableauPosition} has no active cards`)
        }
        if (!game.getStockPile().empty()) {
            throw Error("Cannot move cards from tableau pile to score pile unless stock pile is empty")
        }
        game.getScorePile().merge(tableauPile)
        tableauPile.clear()
    }
}
