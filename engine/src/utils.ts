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
    RIGHT,
    LEFT,
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
        if (this._direction === Direction.LEFT) {
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
        return Boolean(lift(this.left(), left => left.compareTo(item) <= 0))
            && Boolean(lift(this.right(), right => right.compareTo(item) >= 0))
    }

    add(item: T): boolean {
        if (this.empty()) {
            return this.addRight(item)
        }
        let added = false
        const adjacentRight = this.adjacentRight(item)
        const adjacentLeft = this.adjacentLeft(item)
        switch (this._direction) {
            case Direction.BIDIRECTIONAL:
                if (adjacentRight) {
                    added = this.addRight(item)
                } else if (adjacentLeft) {
                    added = this.addLeft(item)
                } break
            case Direction.RIGHT:
                if (adjacentRight) {
                    added = this.addRight(item)
                } break
            case Direction.LEFT:
                if (adjacentLeft) {
                    added = this.addLeft(item)
                } break
            case Direction.UNKNOWN:
                if (adjacentRight) {
                    this._direction = Direction.RIGHT
                    added = this.addRight(item)
                } else if (adjacentLeft) {
                    this._direction = Direction.LEFT
                    added = this.addLeft(item)
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
        const leftAdjacentRight = this.adjacentRight(other.left()!)
        const rightAdjacentRight = this.adjacentRight(other.right()!)
        const leftAdjacentLeft = this.adjacentLeft(other.left()!)
        const rightAdjacentLeft = this.adjacentLeft(other.right()!)
        switch (this._direction) {
            case Direction.BIDIRECTIONAL:
                switch (true) {
                    case leftAdjacentRight:
                        merged = this.combineRight(other.items)
                        break
                    case rightAdjacentRight:
                        merged = this.combineRight(other.items.reverse())
                        break
                    case leftAdjacentLeft:
                        merged = this.combineLeft(other.items.reverse())
                        break
                    case rightAdjacentLeft:
                        merged = this.combineLeft(other.items)
                        break
                } break
            case Direction.RIGHT:
                switch (true) {
                    case leftAdjacentRight:
                        merged = this.combineRight(other.items)
                        break
                    case rightAdjacentRight:
                        merged = this.combineRight(other.items.reverse())
                        break
                } break
            case Direction.LEFT:
                switch (true) {
                    case leftAdjacentLeft:
                        merged = this.combineLeft(other.items.reverse())
                        break
                    case rightAdjacentLeft:
                        merged = this.combineLeft(other.items)
                        break
                } break
            case Direction.UNKNOWN:
                switch (true) {
                    case leftAdjacentLeft:
                    case rightAdjacentLeft:
                        merged = this.combineRight(other.items)
                        break
                    case leftAdjacentRight:
                    case rightAdjacentRight:
                        merged = this.combineRight(other.items.reverse())
                        break
                }
                this._direction = Direction.RIGHT
                break
        }
        return merged
    }

    left(): T | undefined {
        return this.items.at(0)
    }

    right(): T | undefined {
        return this.items.at(-1)
    }

    direction(): Direction {
        return this._direction
    }

    toString(): string {
        switch (this._direction) {
            case Direction.BIDIRECTIONAL:
                return `[${this.left()} <-> ${this.right()}]`
            case Direction.RIGHT:
                return `[${this.left()} -> ${this.right()}]`
            case Direction.LEFT:
                return `[${this.right()} -> ${this.left()}]`
            case Direction.UNKNOWN:
                return "[]"
        }
    }

    protected adjacentLeft(item: T): boolean {
        return Boolean(lift(this.left(), l => l.compareTo(item) > 0 && l.adjacentTo(item)))
    }

    protected adjacentRight(item: T): boolean {
        return Boolean(lift(this.right(), r => r.compareTo(item) < 0 && r.adjacentTo(item)))
    }

    protected addLeft(item: T): boolean {
        const prevSize = this.size()
        this.items.unshift(item)
        return this.size() > prevSize
    }

    protected addRight(item: T): boolean {
        const prevSize = this.size()
        this.items.push(item)
        return this.size() > prevSize
    }

    protected combineLeft(items: T[]): boolean {
        const prevSize = this.size()
        this.items = [...items, ...this.items]
        return this.size() > prevSize
    }

    protected combineRight(items: T[]): boolean {
        const prevSize = this.size()
        this.items = [...this.items, ...items]
        return this.size() > prevSize
    }
}
