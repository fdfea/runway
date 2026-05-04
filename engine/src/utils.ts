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
