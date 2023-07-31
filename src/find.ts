import {
    AnyTypeGuard,
    Func,
    isFunc,
    isShape,
    nil,
    TypeGuard
} from '@benzed/types'
import { pass } from '@benzed/util'
import { Each, each } from '@benzed/each'
import { AbstractCallable, Callable } from '@benzed/callable'

import { Relational } from './relational'
import {
    eachAncestor,
    eachChild,
    eachDescendant,
    eachNode,
    eachParent,
    eachSibling
} from './relations'

import { getPath } from './path'

/* eslint-disable
    @typescript-eslint/no-explicit-any
*/

//// Helper Types////

type RelationalTrait<N extends Relational = Relational> = {
    is(input: unknown): input is N
}

type RelationalTypeGuard<N extends Relational = Relational> = TypeGuard<N, N>
type RelationalPredicate<N extends Relational = Relational> = (
    input: N
) => boolean

//// Types ////

type FindInput<N extends Relational = Relational> =
    | N
    | RelationalPredicate<N>
    | RelationalTypeGuard<N>
    | RelationalTrait<N>
type FindOutput<I extends FindInput<any>> = I extends
    | RelationalPredicate<infer N>
    | RelationalTypeGuard<infer N>
    | RelationalTrait<infer N>
    ? N
    : I extends Relational
    ? I
    : never

interface FindRelational<N extends Relational> {
    <I extends FindInput<N>>(input?: I): FindOutput<I> | nil
    get inChildren(): FindRelational<N>
    get inSiblings(): FindRelational<N>
    get inDescendants(): FindRelational<N>
    get inParents(): FindRelational<N>
    get inAncestors(): FindRelational<N>
    get inNodes(): FindRelational<N>
    get or(): FindRelational<N>
    get all(): FindRelationals<N>
}

interface FindRelationals<N extends Relational> {
    <I extends FindInput<N>>(input?: I): FindOutput<I>[]
    get inChildren(): FindRelationals<N>
    get inSiblings(): FindRelationals<N>
    get inDescendants(): FindRelationals<N>
    get inParents(): FindRelationals<N>
    get inAncestors(): FindRelationals<N>
    get inNodes(): FindRelationals<N>
    get or(): FindRelationals<N>
}

interface HasRelational<N extends Relational> {
    <I extends FindInput<N>>(input: I): boolean
    get inChildren(): HasRelational<N>
    get inSiblings(): HasRelational<N>
    get inDescendants(): HasRelational<N>
    get inParents(): HasRelational<N>
    get inAncestors(): FindRelationals<N>
    get inNodes(): FindRelationals<N>
    get or(): FindRelationals<N>
}

interface AssertRelational<N extends Relational> {
    <I extends FindInput<N>>(input: I, error?: string): FindOutput<I>
    get inChildren(): AssertRelational<N>
    get inSiblings(): AssertRelational<N>
    get inDescendants(): AssertRelational<N>
    get inParents(): AssertRelational<N>
    get inAncestors(): AssertRelational<N>
    get inNodes(): AssertRelational<N>
    get or(): AssertRelational<N>
}

interface FindConstructor {
    new <N extends Relational>(source: N): FindRelational<N>
    new <N extends Relational>(
        source: N,
        flag: FindFlag.All
    ): FindRelationals<N>
    new <N extends Relational>(source: N, flag: FindFlag.Has): HasRelational<N>
    new <N extends Relational>(
        source: N,
        flag: FindFlag.Assert,
        error?: string
    ): AssertRelational<N>
}

enum FindFlag {
    Assert = 0,
    Has = 1,
    All = 2
}

//// Implementation ////

const Find = class RelationalFinder extends AbstractCallable<Func> {
    constructor(
        readonly source: Relational,
        private _flag?: FindFlag,
        private readonly _error?: string
    ) {
        super()
        this._each = eachChild(source)
    }

    //// Interface ////

    get [Callable.signature]() {
        return this.find
    }

    get or(): this {
        this._mergeOnIncrement = true
        return this
    }

    get all(): this {
        this._flag = FindFlag.All
        return this
    }

    get inChildren(): this {
        return this._incrementEach(eachChild(this.source))
    }

    get inSiblings(): this {
        return this._incrementEach(eachSibling(this.source))
    }

    get inDescendants(): this {
        return this._incrementEach(eachDescendant(this.source))
    }

    get inParents(): this {
        return this._incrementEach(eachParent(this.source))
    }

    get inAncestors(): this {
        return this._incrementEach(eachAncestor(this.source))
    }

    get inNodes(): this {
        return this._incrementEach(eachNode(this.source))
    }

    //// Helper ////

    find(input?: FindInput, error?: string): unknown {
        const predicate = toPredicate(input)

        const found = new Set<Relational>()
        const { _flag: flag } = this

        iterators: for (const node of this._each) {
            if (found.has(node)) continue

            const pass = predicate(node)
            if (pass) found.add(Relational.is(pass) ? pass : node)

            if (pass && flag !== FindFlag.All) break iterators
        }

        const has = found.size > 0
        if (flag === FindFlag.Assert && !has) {
            throw new Error(
                error ??
                    this._error ??
                    `Node ${getPath(this.source).join(
                        '/'
                    )} Could not find node ${toPredicateName(input)}`
            )
        }

        if (flag === FindFlag.Has) return has

        if (flag === FindFlag.All) return Array.from(found)

        const [first] = found
        return first
    }

    //// Iterators ////

    private _each: Each<Relational>
    private _mergeOnIncrement = false
    private _incrementEach(...iterators: Iterable<Relational>[]): this {
        this._each = this._mergeOnIncrement
            ? each(this._each, ...iterators)
            : each(...iterators)

        return this
    }
} as FindConstructor

//// Helper ////

// TODO should be exchanged with 'isGuardedConstructor'
const isRelationalTrait: (input: unknown) => input is RelationalTrait = isShape(
    {
        is: isFunc as AnyTypeGuard
    }
)

function toPredicate(
    input?: FindInput
): RelationalTypeGuard | RelationalPredicate {
    if (!input) return pass

    if (Relational.is(input)) {
        // return Comparable.is(input)
        //     ? other => input[Comparable.equals](other)
        //     : other => Object.is(input, other)

        return other => Object.is(input, other)
    }

    if (isRelationalTrait(input)) return input.is

    if (isFunc(input)) return input

    throw new Error('Invalid find input.')
}

function toPredicateName(input?: FindInput): string {
    let name = input && 'name' in input ? input.name : ''

    // assume type guard with convention isModuleName
    if (name.startsWith('is')) name = name.slice(0, 2)

    // assume anonymous type guard
    if (!name) return Relational.name

    return name
}

//// Exports ////

export default Find

export {
    Find,
    FindFlag,
    FindConstructor,
    FindInput,
    FindOutput,
    FindRelational,
    FindRelationals,
    HasRelational,
    AssertRelational
}
