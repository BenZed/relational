import { each } from '@benzed/each'

import type { Relational } from './relational'

import { eachParent } from './relations'
import { getChildren } from './children'

//// Types ////

export type RelationalPath = PropertyKey[]

//// Main ////

export function getPath(
    relational: Relational,
    from?: Relational
): RelationalPath {
    const path: RelationalPath = []

    let foundFrom = false
    for (const parent of eachParent(relational)) {
        const children = getChildren(parent) as Record<PropertyKey, Relational>
        for (const [name, child] of each.entryOf(children)) {
            if (child === relational) {
                path.push(name)
                relational = parent
                break
            }
        }

        if (from && parent === from) {
            foundFrom = true
            break
        }
    }

    if (from && !foundFrom) {
        throw new Error(
            'Given reference node is not a parent of the input module.'
        )
    }

    return path.reverse()
}
