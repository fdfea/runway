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
}

export class AdjacentList<T extends Comparable<T>> implements Iterable<T> {
    protected items: T[]
    protected bidirectional: boolean

    constructor(item?: T, birdectional: boolean = true) {
        this.items = item ? [item] : []
        this.bidirectional = birdectional
    }

    [Symbol.iterator](): IterableIterator<T> {
        return this.items.values()
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
        if (this.contains(item)) {
            return false
        } else if (this.empty() || this.adjacentRight(item)) {
            return this.addRight(item)
        } else if (this.bidirectional && this.adjacentLeft(item)) {
            return this.addLeft(item)
        } else {
            return false
        }
    }

    merge(other: AdjacentList<T>): boolean {
        let valid = !other.empty()
        const copy = [...this.items]
        for (const item of other.items) {
            if (!(valid = this.add(item))) {
                this.items = copy
                break
            }
        }
        return valid
    }

    left(): T | undefined {
        return this.items.at(0)
    }

    right(): T | undefined {
        return this.items.at(-1)
    }

    isBidirectional(): boolean {
        return this.bidirectional
    }

    toString(): string {
        if (this.empty()) {
            return "[]"
        } else if (this.size() === 1) {
            return `[${this.right()}]`
        } else if (this.bidirectional) {
            return `[${this.left()} <-> ${this.right()}]`
        } else {
            return `[${this.left()} -> ${this.right()}]`
        }
    }

    protected adjacentLeft(item: T): boolean {
        return Boolean(lift(this.left(), left => left.compareTo(item) === 1))
    }

    protected adjacentRight(item: T): boolean {
        return Boolean(lift(this.right(), right => right.compareTo(item) === -1))
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
}
