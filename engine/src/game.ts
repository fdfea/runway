import { Card, Deck, Decks, Rank, Ranks, SuitedConsecutiveCardSet, Suits, UnorderedCardSet } from './cards'
import { Move } from './moves'
import { lift } from './utils'

export class FoundationPile extends SuitedConsecutiveCardSet {

    constructor(card: Card) {
        super(card)
    }

    complete(): boolean {
        return [...Ranks.All].every(rank => this.ranks().has(rank))
    }

    override toString(): string {
        if (this.complete()) {
            return `[${this.front()?.suit} ✓]`
        } else {
            return super.toString()
        }
    }
}

export class TableauPile extends SuitedConsecutiveCardSet {
    private readonly hidden: UnorderedCardSet

    constructor(cards: Iterable<Card>) {
        super(undefined, false)
        this.hidden = new UnorderedCardSet(cards)
        this.reveal()
    }

    reveal(): boolean {
        return this.empty() && Boolean(lift(this.hidden.draw(), card => this.add(card)))
    }

    hiddenRemaining(): number {
        return this.hidden.size()
    }

    depleted(): boolean {
        return this.empty() && this.hidden.empty()
    }

    override toString(): string {
        return `[${this.hiddenRemaining()}, ${super.toString()}]`
    }
}

export class Game {
    static readonly TableauPiles: number = 7

    private readonly foundationPiles: FoundationPile[]
    private readonly tableauPiles: TableauPile[]
    private readonly scorePile: UnorderedCardSet
    private readonly stockPile: Deck

    private score: number = 0

    constructor() {
        const deck = Decks.noAces()
        deck.shuffle()

        this.foundationPiles = [...Suits.All].map(suit => new FoundationPile(new Card(Rank.Ace, suit)))
        this.tableauPiles = new Array(Game.TableauPiles)
        for (let i = 0; i < this.tableauPiles.length; i++) {
            const cards: Array<Card> = []
            for (let j = this.tableauPiles.length; j >= this.tableauPiles.length - i; j--) {
                lift(deck.deal(), card => cards.push(card))
            }
            this.tableauPiles[i] = new TableauPile(cards)
        }

        this.scorePile = new UnorderedCardSet
        this.stockPile = deck
    }

    makeMove(move: Move): void {
        return move.apply(this)
    }

    finished(): boolean {
        return this.foundationPiles.values().every(pile => pile.complete())
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

    getScorePile(): UnorderedCardSet {
        return this.scorePile
    }

    getStockPile(): Deck {
        return this.stockPile
    }
}
