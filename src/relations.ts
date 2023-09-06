import { Each, each } from '@benzed/each'

import { getParent } from './parent'
import { Relational } from './relational'
import { getChildren } from './children'
import { pass as everyDescendent } from '@benzed/util'

export function getRoot(relational: Relational): Relational {
    return eachParent(relational).toArray().at(-1) ?? relational
}

//// Iterators ////

export function eachChild(relational: Relational): Each<Relational> {
    const children = getChildren(relational)
    return each.valueOf(children)
}

export function eachParent<T extends Relational>(
    relational: T
): Each<Relational> {
    return each(function* () {
        let parent = getParent(relational)
        while (parent) {
            yield parent
            parent = getParent(parent)
        }
    })
}

export function eachSibling<T extends Relational>(
    relational: T
): Each<Relational> {
    return each(function* () {
        const parent = getParent(relational)
        if (parent) {
            for (const child of eachChild(parent)) {
                if (child !== relational) yield child
            }
        }
    })
}

export function eachAncestor<T extends Relational>(
    relational: T
): Each<Relational> {
    return each(function* () {
        for (const parent of eachParent(relational)) {
            yield parent
            yield* eachSibling(parent)
        }
    })
}

export function eachDescendant<T extends Relational>(
    relational: T,

    /**
     * Only child {@link Relational}s that pass the provided
     * {@link generationFilter} method will have their own descendants iterated.
     */
    generationFilter: (input: Relational) => boolean = everyDescendent
): Each<Relational> {
    return each(function* () {
        let currentGeneration: Relational[] = [relational]
        const found = new Set<Relational>()

        while (currentGeneration.length > 0) {
            const nextGeneration: Relational[] = []
            for (const relational of currentGeneration) {
                // In case of circular references
                if (found.has(relational)) continue
                else found.add(relational)

                for (const child of eachChild(relational)) {
                    yield child
                    if (generationFilter(child)) nextGeneration.push(child)
                }
            }

            currentGeneration = nextGeneration
        }
    })
}

export function eachInHierarchy<T extends Relational>(
    node: T,
    generationFilter?: (input: Relational) => boolean
): Each<Relational> {
    return each(function* () {
        const root = getRoot(node)
        yield root
        yield* eachDescendant(root, generationFilter)
    })
}
