import {
    Func,
    isFunc,
    Class,
    AbstractClass,
    nil,
    TypeGuard,
    AbstractStruct,
    Struct,
    hasStaticTypeGuard,
    StaticTypeGuard,
    isClass
} from '@benzed/types'
import { pass } from '@benzed/util'
import { Each, each } from '@benzed/each'
import { AbstractCallable, Callable } from '@benzed/callable'
import { Comparable } from '@benzed/immutable'

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

type Guard<T extends object = object> = TypeGuard<T, object>

type Predicate<T extends object = object> = (input: T) => boolean

//// Types ////

type FindInput<T extends object = object> =
    | T
    | Guard<T>
    | Predicate<T>
    | Class<T>
    | AbstractClass<T>
    | StaticTypeGuard<T>

type FindOutput<
    T extends FindInput<object>,
    R extends Relational = Relational
> = ToRelational<
    T extends Guard<infer T1> | Predicate<infer T1>
        ? T1
        : T extends
              | Struct<infer T2>
              | AbstractStruct<infer T2>
              | Class<infer T2>
              | AbstractClass<infer T2>
        ? T2
        : T,
    R
>

type ToRelational<T extends object, R extends Relational> = T extends R
    ? T
    : T & R

interface FindRelational<
    R extends Relational = Relational,
    F extends object = object
> {
    <I extends FindInput<F>>(input?: I): FindOutput<I, R> | nil
    get inChildren(): FindRelational<R, F>
    get inSiblings(): FindRelational<R, F>
    get inDescendants(): FindRelational<R, F>
    get inParents(): FindRelational<R, F>
    get inAncestors(): FindRelational<R, F>
    get inHierarchy(): FindRelational<R, F>
    get or(): FindRelational<R, F>
    get all(): FindRelationals<R, F>
}

interface FindRelationals<
    R extends Relational = Relational,
    F extends object = object
> {
    <I extends FindInput<F>>(input?: I): FindOutput<I, R>[]
    get inChildren(): FindRelationals<R, F>
    get inSiblings(): FindRelationals<R, F>
    get inDescendants(): FindRelationals<R, F>
    get inParents(): FindRelationals<R, F>
    get inAncestors(): FindRelationals<R, F>
    get inHierarchy(): FindRelationals<R, F>
    get or(): FindRelationals<R, F>
}

interface HasRelational<T extends object = object> {
    <I extends FindInput<T>>(input: I): boolean
    get inChildren(): HasRelational<T>
    get inSiblings(): HasRelational<T>
    get inDescendants(): HasRelational<T>
    get inParents(): HasRelational<T>
    get inAncestors(): HasRelational<T>
    get inHierarchy(): HasRelational<T>
    get or(): HasRelational<T>
}

interface AssertRelational<
    R extends Relational = Relational,
    F extends object = object
> {
    <I extends FindInput<F>>(input: I, error?: string): FindOutput<I, R>
    get inChildren(): AssertRelational<R, F>
    get inSiblings(): AssertRelational<R, F>
    get inDescendants(): AssertRelational<R, F>
    get inParents(): AssertRelational<R, F>
    get inAncestors(): AssertRelational<R, F>
    get inHierarchy(): AssertRelational<R, F>
    get or(): AssertRelational<R, F>
}

interface FindConstructor {
    new <R extends Relational = Relational, F extends object = object>(
        source: Relational
    ): FindRelational<R, F>
    new <R extends Relational = Relational, F extends object = object>(
        source: Relational,
        flag: FindFlag.All
    ): FindRelationals<R, F>
    new <F extends object = object>(
        source: Relational,
        flag: FindFlag.Has
    ): HasRelational<F>
    new <R extends Relational = Relational, F extends object = object>(
        source: Relational,
        flag: FindFlag.Assert,
        error?: string
    ): AssertRelational<R, F>
}

enum FindFlag {
    Assert = 0,
    Has = 1,
    All = 2
}

//// Implementation ////

const Find = class Finder extends AbstractCallable<Func> {
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

    get inHierarchy(): this {
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
                    `${getPath(this.source).join(
                        '/'
                    )} could not find ${toPredicateName(input)}`
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

function toPredicate(input?: FindInput): Guard | Predicate {
    if (!input) return pass

    if (hasStaticTypeGuard(input)) return input.is

    if (!isFunc(input) || Relational.is(input)) {
        return Comparable.is(input)
            ? other => input[Comparable.equals](other)
            : other => Object.is(input, other)
    }

    if (isClass(input)) {
        return i => i instanceof input
    }

    return input
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
