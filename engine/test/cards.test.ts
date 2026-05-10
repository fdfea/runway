import 'jest-extended'
import { Cards, Decks, Rank, Ranks, Suit, SuitedConsecutiveCardSet, Suits, UnorderedCardSet } from '../src/cards'

test("Suits", () => {
    expect(Suits.All.size).toBe(4)

    expect(Suits.parse("c")).toBe(Suit.Clubs)
    expect(Suits.parse("h")).toBe(Suit.Hearts)
    expect(Suits.parse("S")).toBeUndefined()
    expect(Suits.parse("1")).toBeUndefined()
})

test("Ranks", () => {
    expect(Ranks.All.size).toBe(13)

    expect(Ranks.parse("2")).toBe(Rank.Two)
    expect(Ranks.parse("T")).toBe(Rank.Ten)
    expect(Ranks.parse("A")).toBe(Rank.Ace)
    expect(Ranks.parse("10")).toBeUndefined()
    expect(Ranks.parse("1")).toBeUndefined()
    expect(Ranks.parse("B")).toBeUndefined()
})

test("Cards", () => {
    expect(Cards.All.size).toBe(52)

    expect(Cards.parse("2h")).toBe(Cards._2h)
    expect(Cards.parse("9c")).toBe(Cards._9c)
    expect(Cards.parse("Jd")).toBe(Cards._Jd)
    expect(Cards.parse("As")).toBe(Cards._As)
    expect(Cards.parse("10h")).toBeUndefined()
    expect(Cards.parse("4a")).toBeUndefined()
    expect(Cards.parse("AA")).toBeUndefined()
    expect(Cards.parse("dd")).toBeUndefined()

    expect(Cards._5d.toString()).toBe("5d")
    expect(Cards._Qs.toString()).toBe("Qs")

    expect(Cards._4d.sameSuit(Cards._Qd)).toBeTrue()
    expect(Cards._4d.sameSuit(Cards._Qh)).toBeFalse()

    expect(Cards._Th.sameRank(Cards._Ts)).toBeTrue()
    expect(Cards._Jh.sameRank(Cards._Ts)).toBeFalse()

    expect(Cards._2c.consecutive(Cards._Ac)).toBeTrue()
    expect(Cards._2c.consecutive(Cards._Ah)).toBeTrue()
    expect(Cards._2c.consecutive(Cards._3d)).toBeTrue()
    expect(Cards._Kc.consecutive(Cards._Ac)).toBeTrue()
    expect(Cards._Ac.consecutive(Cards._Kd)).toBeTrue()
    expect(Cards._Ac.consecutive(Cards._3c)).toBeFalse()
    expect(Cards._Ks.consecutive(Cards._Ks)).toBeFalse()

    expect(Cards._2c.suitedConsecutive(Cards._3c)).toBeTrue()
    expect(Cards._Ah.suitedConsecutive(Cards._2h)).toBeTrue()
    expect(Cards._2c.suitedConsecutive(Cards._3d)).toBeFalse()
    expect(Cards._Ah.suitedConsecutive(Cards._Ah)).toBeFalse()
})

test("Standard deck", () => {
    const deck = Decks.standard()
    expect(deck.size()).toBe(52)
    expect(deck.empty()).toBeFalse()
    expect(deck.remove(Cards._Ad)).toBeTrue()

    const card = deck.deal()
    expect(card).toBe(Cards._2c)
    expect(deck.contains(Cards._2c)).toBeFalse()
    expect(deck.size()).toBe(50)
    
    const deckCopy = new Set([...deck])
    deck.shuffle()
    expect(deck).not.toEqual(deckCopy)

    expect([...deck.ranks()]).toIncludeSameMembers([...Ranks.All])
    expect([...deck.suits()]).toIncludeSameMembers([...Suits.All])
})

test("UnorderedCardSet", () => {
    const cards1 = new UnorderedCardSet([Cards._7d, Cards._2d])
    const cards2 = new UnorderedCardSet([Cards._3h, Cards._6s, Cards._7d])
    expect(cards1.size()).toBe(2)
    expect(cards2.size()).toBe(3)

    cards1.merge(cards2)
    expect(cards1.size()).toBe(4)
    expect(cards2.size()).toBe(3)
})

test("SuitedConsecutiveCardSet", () => {
    const cards1 = new SuitedConsecutiveCardSet(Cards._Ah)
    expect(cards1.size()).toBe(1)
    expect(cards1.add(Cards._2h)).toBeTrue()
    expect(cards1.add(Cards._2h)).toBeFalse()
    expect(cards1.add(Cards._3h)).toBeTrue()
    expect(cards1.add(Cards._5h)).toBeFalse()
    expect(cards1.add(Cards._Kh)).toBeFalse()
    expect(cards1.size()).toBe(3)
    expect(cards1.top()).toBe(Cards._3h)
    expect(cards1.bottom()).toBe(Cards._Ah)

    const cards2 = new SuitedConsecutiveCardSet(Cards._5h)
    expect(cards2.size()).toBe(1)
    expect(cards2.add(Cards._4h)).toBeTrue()
    expect(cards2.add(Cards._6h)).toBeFalse()
    expect(cards2.size()).toBe(2)
    expect(cards2.top()).toBe(Cards._4h)
    expect(cards2.bottom()).toBe(Cards._5h)

    expect(cards1.merge(cards2)).toBeTrue()
    expect(cards1.size()).toBe(5)
    expect(cards1.top()).toBe(Cards._5h)
    expect(cards1.bottom()).toBe(Cards._Ah)

    const cards3 = new SuitedConsecutiveCardSet()
    expect(cards3.size()).toBe(0)
    expect(cards1.merge(cards3)).toBeFalse()
    expect(cards1.size()).toBe(5)
    expect(cards3.merge(cards1)).toBeTrue()
    expect(cards3.size()).toBe(5)

    const cards4 = new SuitedConsecutiveCardSet(Cards._6h)
    expect(cards4.add(Cards._7h)).toBeTrue()
    expect(cards4.add(Cards._8h)).toBeTrue()
    expect(cards4.add(Cards._9h)).toBeTrue()
    expect(cards4.add(Cards._Th)).toBeTrue()
    expect(cards4.add(Cards._Jh)).toBeTrue()
    expect(cards4.add(Cards._Qh)).toBeTrue()
    expect(cards4.add(Cards._Kh)).toBeTrue()
    expect(cards4.top()).toBe(Cards._Kh)
    expect(cards4.bottom()).toBe(Cards._6h)

    expect(cards3.merge(cards4)).toBeTrue()
    expect(cards3.top()).toBe(Cards._Kh)
    expect(cards3.bottom()).toBe(Cards._Ah)
})
