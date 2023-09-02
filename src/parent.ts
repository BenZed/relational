import { define } from '@benzed/util'
import { AnyTypeGuard, isKeyed, nil } from '@benzed/types'

import type { Relational } from './relational'

//// Symbol ////

/**
 * {@link PropertyKey} where a {@link Relational}'s parent
 * is
 */
export const $$parent = Symbol('parent-node')

//// Helper ////

export const isRelational: (child: unknown) => child is Relational = isKeyed(
    $$parent
) as AnyTypeGuard

/**
 * Set the parent of a node
 */
export function setParent(child: Relational, parent: Relational | nil): void {
    define.hidden(child, $$parent, parent)
}

/**
 * Get the parent of a node
 */
export function getParent<N extends Relational = Relational>(
    node: Relational
): N | nil {
    return node[$$parent] as N | nil
}
