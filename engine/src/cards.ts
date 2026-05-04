import lodash from 'lodash'
import { lift } from './utils'

export enum Suit {
    Clubs = "c",
    Diamonds = "d",
    Hearts = "h",
    Spades = "s"
}

export class Suits {
    private constructor() {
    }

    static toString(suit: Suit): string {
        return suit
    }
    
    static parse(suit: string): Suit | undefined {
        return this.SuitLookup[suit]
    }

    private static SuitLookup: { [key: string]: Suit } = {
        c: Suit.Clubs,
        d: Suit.Diamonds,
        h: Suit.Hearts,
        s: Suit.Spades
    }

    static readonly All: ReadonlySet<Suit> = new Set(Object.values(this.SuitLookup))
}

export enum Rank {
    Two = 2,
    Three = 3,
    Four = 4,
    Five = 5,
    Six = 6,
    Seven = 7,
    Eight = 8,
    Nine = 9,
    Ten = "T",
    Jack = "J",
    Queen = "Q",
    King = "K",
    Ace = "A"
}

export class Ranks {
    private constructor() {
    }

    static toString(rank: Rank): string {
        return rank.toString()
    }

    static parse(rank: string): Rank | undefined {
        return Ranks.RankLookup[rank]
    }

    static consecutive(rank1: Rank, rank2: Rank) {
        return Ranks.ConsecutiveRankLookup[rank1.valueOf()].some(value => value === rank2)
    }

    private static RankLookup: { [key: string]: Rank } = {
        2: Rank.Two,
        3: Rank.Three,
        4: Rank.Four,
        5: Rank.Five,
        6: Rank.Six,
        7: Rank.Seven,
        8: Rank.Eight,
        9: Rank.Nine, 
        T: Rank.Ten,
        J: Rank.Jack,
        Q: Rank.Queen,
        K: Rank.King,
        A: Rank.Ace
    }

    static readonly All: ReadonlySet<Rank> = new Set(Object.values(this.RankLookup))

    private static ConsecutiveRankLookup: { [key: number | string]: [Rank, Rank] } = {
        2: [Rank.Ace, Rank.Three],
        3: [Rank.Two, Rank.Four],
        4: [Rank.Three, Rank.Five],
        5: [Rank.Four, Rank.Six],
        6: [Rank.Five, Rank.Seven],
        7: [Rank.Six, Rank.Eight],
        8: [Rank.Seven, Rank.Nine],
        9: [Rank.Eight, Rank.Ten],
        T: [Rank.Nine, Rank.Jack],
        J: [Rank.Ten, Rank.Queen],
        Q: [Rank.Jack, Rank.King],
        K: [Rank.Queen, Rank.Ace],
        A: [Rank.King, Rank.Two]
    }
}

export class Card {
    constructor(readonly rank: Rank, readonly suit: Suit) {}

    equals(card: Card): boolean {
        return this.sameRank(card) && this.sameSuit(card)
    }

    sameRank(card: Card): boolean {
        return this.rank === card.rank
    }

    sameSuit(card: Card): boolean {
        return this.suit === card.suit
    }

    consecutive(card: Card): boolean {
        return Ranks.consecutive(this.rank, card.rank)
    }

    suitedConsecutive(card: Card): boolean {
        return this.sameSuit(card) && this.consecutive(card)
    }

    toString(): string {
        return `${Ranks.toString(this.rank)}${Suits.toString(this.suit)}`
    }
}

export class Cards {
    private constructor() {
    }

    static parse(card: string): Card | undefined {
        return Cards.CardLookup[`__${card}`]
    }

    static readonly _2c: Card = new Card(Rank.Two, Suit.Clubs)
    static readonly _3c: Card = new Card(Rank.Three, Suit.Clubs)
    static readonly _4c: Card = new Card(Rank.Four, Suit.Clubs)
    static readonly _5c: Card = new Card(Rank.Five, Suit.Clubs)
    static readonly _6c: Card = new Card(Rank.Six, Suit.Clubs)
    static readonly _7c: Card = new Card(Rank.Seven, Suit.Clubs)
    static readonly _8c: Card = new Card(Rank.Eight, Suit.Clubs)
    static readonly _9c: Card = new Card(Rank.Nine, Suit.Clubs)
    static readonly _Tc: Card = new Card(Rank.Ten, Suit.Clubs)
    static readonly _Jc: Card = new Card(Rank.Jack, Suit.Clubs)
    static readonly _Qc: Card = new Card(Rank.Queen, Suit.Clubs)
    static readonly _Kc: Card = new Card(Rank.King, Suit.Clubs)
    static readonly _Ac: Card = new Card(Rank.Ace, Suit.Clubs)
    static readonly _2d: Card = new Card(Rank.Two, Suit.Diamonds)
    static readonly _3d: Card = new Card(Rank.Three, Suit.Diamonds)
    static readonly _4d: Card = new Card(Rank.Four, Suit.Diamonds)
    static readonly _5d: Card = new Card(Rank.Five, Suit.Diamonds)
    static readonly _6d: Card = new Card(Rank.Six, Suit.Diamonds)
    static readonly _7d: Card = new Card(Rank.Seven, Suit.Diamonds)
    static readonly _8d: Card = new Card(Rank.Eight, Suit.Diamonds)
    static readonly _9d: Card = new Card(Rank.Nine, Suit.Diamonds)
    static readonly _Td: Card = new Card(Rank.Ten, Suit.Diamonds)
    static readonly _Jd: Card = new Card(Rank.Jack, Suit.Diamonds)
    static readonly _Qd: Card = new Card(Rank.Queen, Suit.Diamonds)
    static readonly _Kd: Card = new Card(Rank.King, Suit.Diamonds)
    static readonly _Ad: Card = new Card(Rank.Ace, Suit.Diamonds)
    static readonly _2h: Card = new Card(Rank.Two, Suit.Hearts)
    static readonly _3h: Card = new Card(Rank.Three, Suit.Hearts)
    static readonly _4h: Card = new Card(Rank.Four, Suit.Hearts)
    static readonly _5h: Card = new Card(Rank.Five, Suit.Hearts)
    static readonly _6h: Card = new Card(Rank.Six, Suit.Hearts)
    static readonly _7h: Card = new Card(Rank.Seven, Suit.Hearts)
    static readonly _8h: Card = new Card(Rank.Eight, Suit.Hearts)
    static readonly _9h: Card = new Card(Rank.Nine, Suit.Hearts)
    static readonly _Th: Card = new Card(Rank.Ten, Suit.Hearts)
    static readonly _Jh: Card = new Card(Rank.Jack, Suit.Hearts)
    static readonly _Qh: Card = new Card(Rank.Queen, Suit.Hearts)
    static readonly _Kh: Card = new Card(Rank.King, Suit.Hearts)
    static readonly _Ah: Card = new Card(Rank.Ace, Suit.Hearts)
    static readonly _2s: Card = new Card(Rank.Two, Suit.Spades)
    static readonly _3s: Card = new Card(Rank.Three, Suit.Spades)
    static readonly _4s: Card = new Card(Rank.Four, Suit.Spades)
    static readonly _5s: Card = new Card(Rank.Five, Suit.Spades)
    static readonly _6s: Card = new Card(Rank.Six, Suit.Spades)
    static readonly _7s: Card = new Card(Rank.Seven, Suit.Spades)
    static readonly _8s: Card = new Card(Rank.Eight, Suit.Spades)
    static readonly _9s: Card = new Card(Rank.Nine, Suit.Spades)
    static readonly _Ts: Card = new Card(Rank.Ten, Suit.Spades)
    static readonly _Js: Card = new Card(Rank.Jack, Suit.Spades)
    static readonly _Qs: Card = new Card(Rank.Queen, Suit.Spades)
    static readonly _Ks: Card = new Card(Rank.King, Suit.Spades)
    static readonly _As: Card = new Card(Rank.Ace, Suit.Spades)

    private static CardLookup: { [key: string]: Card } = {
        __2c: Cards._2c,
        __3c: Cards._3c,
        __4c: Cards._4c,
        __5c: Cards._5c,
        __6c: Cards._6c,
        __7c: Cards._7c,
        __8c: Cards._8c,
        __9c: Cards._9c,
        __Tc: Cards._Tc,
        __Jc: Cards._Jc,
        __Qc: Cards._Qc,
        __Kc: Cards._Kc,
        __Ac: Cards._Ac,
        __2d: Cards._2d,
        __3d: Cards._3d,
        __4d: Cards._4d,
        __5d: Cards._5d,
        __6d: Cards._6d,
        __7d: Cards._7d,
        __8d: Cards._8d,
        __9d: Cards._9d,
        __Td: Cards._Td,
        __Jd: Cards._Jd,
        __Qd: Cards._Qd,
        __Kd: Cards._Kd,
        __Ad: Cards._Ad,
        __2h: Cards._2h,
        __3h: Cards._3h,
        __4h: Cards._4h,
        __5h: Cards._5h,
        __6h: Cards._6h,
        __7h: Cards._7h,
        __8h: Cards._8h,
        __9h: Cards._9h,
        __Th: Cards._Th,
        __Jh: Cards._Jh,
        __Qh: Cards._Qh,
        __Kh: Cards._Kh,
        __Ah: Cards._Ah,
        __2s: Cards._2s,
        __3s: Cards._3s,
        __4s: Cards._4s,
        __5s: Cards._5s,
        __6s: Cards._6s,
        __7s: Cards._7s,
        __8s: Cards._8s,
        __9s: Cards._9s,
        __Ts: Cards._Ts,
        __Js: Cards._Js,
        __Qs: Cards._Qs,
        __Ks: Cards._Ks,
        __As: Cards._As
    }

    static readonly All: ReadonlySet<Card> = new Set(Object.values(this.CardLookup))
}

export interface HasCards extends Iterable<Card> {
    [Symbol.iterator](): IterableIterator<Card>
    contains(card: Card): boolean
    empty(): boolean
    size(): number
}

export interface InsertableHasCards extends HasCards {
    add(card: Card): boolean
}

export interface RemoveableHasCards extends HasCards {
    remove(card: Card): boolean
}

export interface ClearableHasCards extends HasCards {
    clear(): boolean
}

export interface OrderedHasCards extends HasCards {
    top(): Card | undefined
    bottom(): Card | undefined
}

export abstract class CardSet implements HasCards {
    protected cards: Set<Card>

    constructor()
    constructor(cards: Iterable<Card>)

    constructor(cards?: Iterable<Card>) {
        this.cards = new Set(cards ?? [])
    }
    
    [Symbol.iterator](): IterableIterator<Card> {
        return this.cards[Symbol.iterator]()
    }

    contains(card: Card): boolean {
        return this.cards.has(card)
    }

    empty(): boolean {
        return !this.cards.size
    }

    size(): number {
        return this.cards.size
    }

    suits(): Set<Suit> {
        return new Set([...this].map(card => card.suit))
    }

    ranks(): Set<Rank> {
        return new Set([...this].map(card => card.rank))
    }

    readonly(): ReadonlySet<Card> {
        return this.cards
    }
}

export abstract class InsertableCardSet extends CardSet implements InsertableHasCards {
    add(card: Card): boolean {
        if (!this.contains(card)) {
            this.cards.add(card)
            return true
        }
        return false
    }
}

export abstract class MutableCardSet extends InsertableCardSet implements RemoveableHasCards, ClearableHasCards {
    remove(card: Card): boolean {
        return this.cards.delete(card)
    }

    clear(): boolean {
        const wasEmpty = this.empty()
        this.cards = new Set
        return !wasEmpty
    }
}

export class UnorderedCardPile extends MutableCardSet {
    addAll(cards: HasCards): void {
        this.cards = this.cards.union(new Set([...cards]))
    }

    override toString(): string {
        return `[${[...this.cards].join(", ")}]`
    }
}

export class CardPile extends MutableCardSet implements OrderedHasCards {
    draw(): Card | undefined {
        const top = this.top()
        if (top) {
            this.remove(top)
        }
        return top
    }

    top(): Card | undefined {
        return [...this][this.size() - 1]
    }

    bottom(): Card | undefined {
        return [...this][0]
    }

    override toString(): string {
        return `(${this.cards.size})`
    }
}

// foundation pile
// ace + can insert/merge on either side
// 
// tableau pile
// can only insert/merge on top

export class SuitedConsecutiveCards extends InsertableCardSet implements ClearableHasCards, OrderedHasCards {
    private topCard: Card | undefined
    private bottomCard: Card | undefined

    // Stable rank order: Ace(1) < 2 < 3 … < 9 < T < J < Q < K(13)
    private static readonly RANK_ORDER: Readonly<Record<string, number>> = {
        A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
        '7': 7, '8': 8, '9': 9, T: 10, J: 11, Q: 12, K: 13
    }

    private static rankIndex(card: Card): number {
        return SuitedConsecutiveCards.RANK_ORDER[card.rank.toString()] ?? 0
    }

    /** Re-sort the internal Set so iteration is always Ace → King. */
    private sortCards(): void {
        this.cards = new Set(
            [...this.cards].sort((a, b) =>
                SuitedConsecutiveCards.rankIndex(a) - SuitedConsecutiveCards.rankIndex(b)
            )
        )
    }

    constructor(card?: Card) {
        super()
        lift(card, c => this.add(c))
    }

    top(): Card | undefined {
        return this.topCard
    }

    bottom(): Card | undefined {
        return this.bottomCard
    }

    complete(): boolean {
        return [...Ranks.All].every(rank => this.ranks().has(rank))
    }

    clear(): boolean {
        const wasEmpty = this.empty()
        this.cards = new Set
        this.topCard = undefined
        this.bottomCard = undefined
        return !wasEmpty
    }

    override add(card: Card): boolean {
        if (this.empty()) {
            super.add(card)
            this.topCard = card
            this.bottomCard = card
            return true
        }
        
        if (!(this.top()!.suitedConsecutive(card))) {
            return false
        }

        const added = super.add(card)
        if (added) {
            this.topCard = card
            this.sortCards()
        }
        return added
    }

    merge(cards: SuitedConsecutiveCards): boolean {
        if (cards.empty()) {
            return false
        } else if (this.empty()) {
            this.cards = new Set([...cards])
            this.topCard = cards.top()
            this.bottomCard = cards.bottom()
            this.sortCards()
            return true
        }
        
        const previousSize: number = this.size()
        if (this.top()!.suitedConsecutive(cards.top()!)) {
            this.cards = new Set([...cards, ...this])
            this.topCard = cards.bottom()
        } else if (this.top()!.suitedConsecutive(cards.bottom()!)) {
            this.cards = new Set([...cards, ...this])
            this.topCard = cards.top()
        }
        if (this.size() > previousSize) {
            this.sortCards()
            return true
        }
        return false
    }

    override toString(): string {
        if (this.empty()) {
            return "[]"
        } else if (this.size() == 1) {
            return `[${this.top()}]`
        } else if (this.complete()){
            return `[${this.bottom()} ✓]`
        } else {
            return `[${this.bottom()} -> ${this.top()}]`
        }
    }
}

export class Deck extends MutableCardSet {
    deal(): Card | undefined {
        const [top, ...remaining] = this
        this.cards = new Set(remaining)
        return top
    }

    shuffle(): void {
        this.cards = new Set(lodash.shuffle([...this]))
    }
}

export class Decks {
    private constructor() {
    }

    static standard(): Deck {
        return new Deck([...Cards.All])
    }

    static noAces(): Deck {
        const deck = this.standard()
        deck.remove(Cards._Ac)
        deck.remove(Cards._Ad)
        deck.remove(Cards._Ah)
        deck.remove(Cards._As)
        return deck
    }
}
