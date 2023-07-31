import { Each, each } from '@benzed/each'
import { GenericObject } from '@benzed/types'

import { $$parent, getParent } from './parent'
import { Relational } from './relational'
import { Callable } from '@benzed/callable'

//// Helper ////

type ChildKeys<T> = Exclude<keyof T, typeof $$parent>

/**
 * Any property of a given node that is also a node
 */
export type Children<T extends Relational> = {
    [K in ChildKeys<T> as T[K] extends Relational ? K : never]: T[K]
}

/**
 * Get the children of a node
 */
export function getChildren<T extends Relational>(node: T): Children<T> {
    const children: GenericObject = {}

    for (const [key, descriptor] of each.defined.descriptorOf(node)) {
        if (
            key !== $$parent &&
            key !== Callable.context &&
            Relational.is(descriptor.value)
        )
            children[key] = node[key]
    }

    return children as Children<T>
}

export function getRoot(node: Relational): Relational {
    return eachParent(node).toArray().at(-1) ?? node
}

//// Iterators ////

export function eachChild(node: Relational): Each<Relational> {
    const children = getChildren(node)
    return each.valueOf(children)
}

export function eachParent<T extends Relational>(node: T): Each<Relational> {
    return each(function* () {
        let parent = getParent(node)
        while (parent) {
            yield parent
            parent = getParent(parent)
        }
    })
}

export function eachSibling<T extends Relational>(node: T): Each<Relational> {
    return each(function* () {
        const parent = getParent(node)
        if (parent) {
            for (const child of eachChild(parent)) {
                if (child !== node) yield child
            }
        }
    })
}

export function eachAncestor<T extends Relational>(node: T): Each<Relational> {
    return each(function* () {
        for (const parent of eachParent(node)) {
            yield parent
            yield* eachSibling(parent)
        }
    })
}

export function eachDescendant<T extends Relational>(
    node: T
): Each<Relational> {
    return each(function* () {
        let current: Relational[] = [node]
        const found = new Set<Relational>()

        while (current.length > 0) {
            const next: Relational[] = []
            for (const node of current) {
                // In case of circular references
                if (!found.has(node)) found.add(node)
                else continue

                const children = eachChild(node).toArray()
                yield* children
                next.push(...children)
            }

            current = next
        }
    })
}

/**
 * From any node in the tree, iterate through every node in a given
 * node's tree.
 */
export function eachNode<T extends Relational>(node: T): Each<Relational> {
    return each(function* () {
        const root = getRoot(node)
        yield root
        yield* eachDescendant(root)
    })
}
