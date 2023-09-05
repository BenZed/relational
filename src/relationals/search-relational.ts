import { AnyTypeGuard, isIntersectionOf, isKeyed } from '@benzed/types'

import { Relational } from '../relational'

//// Main ////

/**
 * A search node has properties on it relevant to finding other nodes.
 */
class SearchRelational extends Relational {
    static override is: (input: unknown) => input is SearchRelational =
        isIntersectionOf(
            Relational.is,
            isKeyed('find', 'has', 'assert') as AnyTypeGuard
        )

    get find() {
        return Relational.find(this)
    }

    get has() {
        return Relational.has(this)
    }

    get assert() {
        return Relational.assert(this)
    }
}

//// Exports ////

export default SearchRelational

export { SearchRelational }
