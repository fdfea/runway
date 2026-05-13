import { eq } from "lodash"

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

export class Comparables {
    private constructor() {
    }

    static adjacent<C extends Comparable<C>>(c1: C, c2: C): boolean {
        const compared = c1.compareTo(c2)
        return compared === -1 || compared === 1
    }
}

export class AdjacentList<T extends Comparable<T>> implements Iterable<T> {
    protected items: T[]
    protected includes: Set<T>
    protected bidirectional: boolean

    constructor(item?: T, birdectional: boolean = true) {
        this.items = item ? [item] : []
        this.includes = new Set(this.items)
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
        return this.includes.has(item)
    }

    add(item: T): boolean {
        let added = false
        switch (true) {
            case (this.empty() || this.adjacentRight(item)) && (added = this.addRight(item)): break
            case this.bidirectional && this.adjacentLeft(item) && (added = this.addLeft(item)): break
        }
        return added
    }

    /*
        [3, 4, 5] -> [6, 7, 8] -> force left: no, reverse: no
        [3, 4, 5] -> [8, 7, 6] -> force left: no, reverse: yes
        [5, 4, 3] -> [6, 7, 8] -> force left: yes, reverse: no
        [5, 4, 3] -> [8, 7, 6] -> force left: yes, reverse: yes
        [3, 4, 5] -> [K, A, 2] -> force left: yes, reverse: yes
        [3, 4, 5] -> [2, A, K] -> force left: yes, reverse: no
        [5, 4, 3] -> [K, A, 2] -> force left: no, reverse: yes
        [5, 4, 3] -> [2, A, K] -> force left: no, reverse: no
        reverse if: (!RaL && RaR) || (LaR) || (LaR) || (RaR)
        forward if: RaL || (LaL && !RaR)
    */
    merge(other: AdjacentList<T>): boolean {
        let valid = !other.empty()
        const copy = [...this.items]
        const forward = Boolean(lift(other.left(), left => this.adjacentRight(left)))
            || Boolean(lift(other.left(), left => this.adjacentLeft(left)))
            && !Boolean(lift(other.right(), right => this.adjacentRight(right)))
        for (const item of forward ? other.items : other.items.reverse()) {
            if (!(valid = this.add(item))) {
                this.items = copy
                this.includes = new Set(this.items)
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
        return Boolean(lift(this.left(), left => Comparables.adjacent(left, item)))
    }

    protected adjacentRight(item: T): boolean {
        return Boolean(lift(this.right(), right => Comparables.adjacent(right, item)))
    }

    protected addLeft(item: T): boolean {
        if (this.contains(item)) return false
        this.items.unshift(item)
        this.includes.add(item)
        return true
    }

    protected addRight(item: T): boolean {
        if (this.contains(item)) return false
        this.items.push(item)
        this.includes.add(item)
        return true
    }
}
