import {
    AnyTypeGuard,
    isFunc,
    isIntersection,
    isKeyed,
    isShape,
    isString,
    nil
} from '@benzed/types'

import { Each } from '@benzed/each'

import { Relational } from '../relational'
import { RelationalPath } from '../path'

import SearchRelational from './search-relational'

//// Main ////

/**
 * Public node has exposed properties for accessing relations to other nodes.
 */
class PublicRelational extends SearchRelational {
    static override is: (input: unknown) => input is PublicRelational =
        isIntersection(
            SearchRelational.is,
            isShape({
                name: isString,
                eachNode: isFunc,
                eachChild: isFunc,
                eachParent: isFunc,
                eachSibling: isFunc,
                eachAncestor: isFunc,
                eachDescendent: isFunc
            }),
            isKeyed('path', 'root', 'parent', 'children')
        ) as AnyTypeGuard

    get name(): string {
        const name = Relational.getPath(this).at(-1)
        return isString(name) ? name : this.constructor.name
    }

    get path(): RelationalPath {
        return Relational.getPath(this)
    }

    get root(): Relational {
        return Relational.getRoot(this)
    }

    get parent(): Relational | nil {
        return Relational.getParent(this)
    }

    get children(): Relational[] {
        return Array.from(this.eachChild())
    }

    eachChild(): Each<Relational> {
        return Relational.eachChild(this)
    }

    eachParent(): Each<Relational> {
        return Relational.eachParent(this)
    }

    eachSibling(): Each<Relational> {
        return Relational.eachSibling(this)
    }

    eachAncestor(): Each<Relational> {
        return Relational.eachAncestor(this)
    }

    eachDescendent(): Each<Relational> {
        return Relational.eachDescendent(this)
    }

    eachNode(): Each<Relational> {
        return Relational.eachNode(this)
    }
}

//// Exports ////

export default PublicRelational

export { PublicRelational, SearchRelational }
