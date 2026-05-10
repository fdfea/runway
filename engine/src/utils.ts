export function lift<T, R>(value: T | undefined, fn: (x: T) => R): R | undefined {
    return value === undefined ? undefined : fn(value)
}

export class Component<T> {
    constructor(readonly id: number, readonly object: T) {}
}

export class ComponentRegistry {
    private readonly registry: Map<number, Component<unknown>> = new Map
    private nextId: number = 0

    register<T>(object: T): Component<T> {
        const component = new Component(this.nextId, object)
        this.registry.set(this.nextId++, component)
        return component
    }

    retrieve(id: number): Component<unknown> | undefined {
        return this.registry.get(id)
    }
}

export interface Comparable<T> {
    compareTo(t: T): number
    adjacentTo(t: T): boolean
}

export enum Direction {
    BIDIRECTIONAL,
    ASCENDING,
    DESCENDING,
    UNKNOWN
}

export class AdjacentList<T extends Comparable<T>> implements Iterable<T> {
    protected items: T[]
    protected _direction: Direction

    constructor(item?: T, birdectional: boolean = true) {
        this.items = item ? [item] : []
        this._direction = birdectional ? Direction.BIDIRECTIONAL : Direction.UNKNOWN
    }

    [Symbol.iterator](): IterableIterator<T> {
        const array = [...this.items]
        if (this._direction === Direction.DESCENDING) {
            return array.reverse().values()
        } else {
            return array.values()
        }
    }

    size(): number {
        return this.items.length
    }

    empty(): boolean {
        return !this.size()
    }

    contains(item: T): boolean {
        return Boolean(lift(this.front(), left => left.compareTo(item) <= 0))
            && Boolean(lift(this.back(), right => right.compareTo(item) >= 0))
    }

    add(item: T): boolean {
        if (this.empty()) {
            return this.addBack(item)
        }
        let added = false
        const adjacentLeft = this.adjacentLeft(item)
        const adjacentRight = this.adjacentRight(item)
        switch (this._direction) {
            case Direction.BIDIRECTIONAL:
                if (adjacentRight) {
                    added = this.addBack(item)
                } else if (adjacentLeft) {
                    added = this.addFront(item)
                } break
            case Direction.ASCENDING:
                if (adjacentRight) {
                    added = this.addBack(item)
                } break
            case Direction.DESCENDING:
                if (adjacentLeft) {
                    added = this.addFront(item)
                } break
            case Direction.UNKNOWN:
                if (adjacentRight) {
                    this._direction = Direction.ASCENDING
                    added = this.addBack(item)
                } else if (adjacentLeft) {
                    this._direction = Direction.DESCENDING
                    added = this.addFront(item)
                } break
        }
        return added
    }

    merge(other: AdjacentList<T>): boolean {
        if (other.empty()) {
            return false
        } else if (this.empty()) {
            if (this._direction === Direction.UNKNOWN) {
                this.direction = other.direction
            }
            this.items = other.items
            return true
        }
        let merged = false
        const leftAdjacentLeft = this.adjacentLeft(other.front()!)
        const rightAdjacentLeft = this.adjacentLeft(other.back()!)
        const leftAdjacentRight = this.adjacentRight(other.front()!)
        const rightAdjacentRight = this.adjacentRight(other.back()!)
        switch (this._direction) {
            case Direction.BIDIRECTIONAL:
                switch (true) {
                    case leftAdjacentLeft: merged = this.combineFront(other.items.reverse()); break
                    case rightAdjacentLeft: merged = this.combineFront(other.items); break
                    case leftAdjacentRight: merged = this.combineBack(other.items); break
                    case rightAdjacentRight: merged = this.combineBack(other.items.reverse()); break
                } break
            case Direction.ASCENDING:
                switch (true) {
                    case leftAdjacentRight: merged = this.combineBack(other.items); break
                    case rightAdjacentRight: merged = this.combineBack(other.items.reverse()); break
                } break
            case Direction.DESCENDING:
                switch (true) {
                    case leftAdjacentLeft: merged = this.combineFront(other.items.reverse()); break
                    case rightAdjacentLeft: merged = this.combineFront(other.items); break
                } break
        }
        return merged
    }

    front(): T | undefined {
        return this.items.at(0)
    }

    back(): T | undefined {
        return this.items.at(-1)
    }

    direction(): Direction {
        return this._direction
    }

    toString(): string {
        switch (this._direction) {
            case Direction.BIDIRECTIONAL:
                return `[${this.front()} <-> ${this.back()}]`
            case Direction.ASCENDING:
                return `[${this.front()} -> ${this.back()}]`
            case Direction.DESCENDING:
                return `[${this.back()} -> ${this.front()}]`
            case Direction.UNKNOWN:
                return "[]"
        }
    }

    protected adjacentLeft(item: T): boolean {
        return Boolean(lift(this.front(), l => l.compareTo(item) > 0 && l.adjacentTo(item)))
    }

    protected adjacentRight(item: T): boolean {
        return Boolean(lift(this.back(), r => r.compareTo(item) < 0 && r.adjacentTo(item)))
    }

    protected addFront(item: T): boolean {
        const prevSize = this.size()
        this.items.unshift(item)
        return this.size() > prevSize
    }

    protected addBack(item: T): boolean {
        const prevSize = this.size()
        this.items.push(item)
        return this.size() > prevSize
    }

    protected combineFront(items: T[]): boolean {
        const prevSize = this.size()
        this.items = [...items, ...this.items]
        return this.size() > prevSize
    }

    protected combineBack(items: T[]): boolean {
        const prevSize = this.size()
        this.items = [...this.items, ...items]
        return this.size() > prevSize
    }
}
