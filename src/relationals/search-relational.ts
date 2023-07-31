import { AnyTypeGuard, isIntersection, isKeyed } from '@benzed/types'

import { Relational } from '../relational'
import { AssertRelational, FindRelational, HasRelational } from '../find'

//// Main ////

/**
 * A search node has properties on it relevant to finding other nodes.
 */
class SearchRelational extends Relational {
    static override is: (input: unknown) => input is SearchRelational =
        isIntersection(
            Relational.is,
            isKeyed('find', 'has', 'assert') as AnyTypeGuard
        )

    get find(): FindRelational<this> {
        return Relational.find(this)
    }

    get has(): HasRelational<this> {
        return Relational.has(this)
    }

    get assert(): AssertRelational<this> {
        return Relational.assert(this)
    }
}

//// Exports ////

export default SearchRelational

export { SearchRelational }
