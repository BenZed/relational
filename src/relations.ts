import { Each, each } from '@benzed/each'

import { getParent } from './parent'
import { Relational } from './relational'
import { getChildren } from './children'

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
