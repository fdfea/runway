import { Card, CardPile, Decks, Rank, Suits, SuitedConsecutiveCards, UnorderedCardPile } from './cards'
import { Move } from './moves'
import { lift } from './utils'

export class FoundationPile extends SuitedConsecutiveCards {
    constructor(card: Card) {
        super(card)
    }
}

export class TableauPile {
    readonly hidden: CardPile
    readonly active: SuitedConsecutiveCards

    constructor() {
        this.hidden = new CardPile
        this.active = new SuitedConsecutiveCards
    }

    empty(): boolean {
        return this.hidden.empty() && this.active.empty()
    }

    reveal(): boolean {
        if (this.active.empty() && lift(this.hidden.draw(), card => this.active.add(card))) {
            return true
        } else {
            return false
        }
    }

    toString(): string {
        return `[${this.hidden}, ${this.active}]`
    }
}

export class Game {
    static readonly TableauPiles: number = 7

    private readonly foundationPiles: FoundationPile[]
    private readonly tableauPiles: TableauPile[]
    private readonly scorePile: UnorderedCardPile
    private readonly stockPile: CardPile

    private score: number = 0

    constructor() {
        const deck = Decks.noAces()
        deck.shuffle()

        this.foundationPiles = [...Suits.All].map(suit => new FoundationPile(new Card(Rank.Ace, suit)))

        this.tableauPiles = new Array(Game.TableauPiles)
        for (let i = 0; i < this.tableauPiles.length; i++) {
            this.tableauPiles[i] = new TableauPile
            for (let j = this.tableauPiles.length; j >= this.tableauPiles.length - i; j--) {
                lift(deck.deal(), card => this.tableauPiles[i].hidden.add(card))
            }
            lift(this.tableauPiles[i].hidden.draw(), card => this.tableauPiles[i].active.add(card))
        }

        this.stockPile = new CardPile([...deck])
        this.scorePile = new UnorderedCardPile
    }

    makeMove(move: Move): void {
        return move.apply(this)
    }

    finished(): boolean {
        return [...this.foundationPiles.values()].every(pile => pile.complete())
    }

    addScore(score: number): void {
        this.score += score
    }

    getScore(): number {
        return this.score
    }

    getFoundationPile(position: number): FoundationPile | undefined {
        return this.foundationPiles[position]
    }

    getFoundationPiles(): FoundationPile[] {
        return this.foundationPiles
    }

    getTableauPile(position: number): TableauPile | undefined {
        return this.tableauPiles[position]
    }

    getTableauPiles(): TableauPile[] {
        return this.tableauPiles
    }

    getScorePile(): UnorderedCardPile {
        return this.scorePile
    }

    getStockPile(): CardPile {
        return this.stockPile
    }
}
