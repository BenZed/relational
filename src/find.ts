import {
    Func,
    isFunc,
    isTruthy as isNotEmpty,
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
import { Comparable } from '@benzed/immutable'
import { AbstractCallable, Callable } from '@benzed/callable'

import { Relational } from './relational'
import {
    eachAncestor,
    eachChild,
    eachDescendant,
    eachInHierarchy,
    eachParent,
    eachSibling,
    getRoot
} from './relations'

import { getPath } from './path'
import { getParent } from './parent'

/* eslint-disable
    @typescript-eslint/no-explicit-any
*/

//// Helper Types ////

type FindGuard<T extends object = object> = TypeGuard<T, object>

type FindPredicate<T extends object = object> = (input: T) => boolean

//// Types ////

type FindInput<T extends object> =
    | T
    | FindGuard<T>
    | FindPredicate<T>
    | Class<T>
    | AbstractClass<T>
    | StaticTypeGuard<T>

type FindOutput<
    S extends Relational,
    I extends FindInput<object>
> = ToRelational<
    S,
    I extends FindGuard<infer T1> | FindPredicate<infer T1>
        ? T1
        : I extends
              | Struct<infer T2>
              | AbstractStruct<infer T2>
              | Class<infer T2>
              | AbstractClass<infer T2>
        ? T2
        : I
>

type ToRelational<S extends Relational, T extends object> = T extends S
    ? T
    : T & S

interface In<T extends object, R> {
    get children(): Or<T, R>
    get siblings(): Or<T, R>
    get descendants(): Or<T, R>
    descendantsFiltered(input: FindInput<T>): Or<T, R>
    descendantsExcept(input: FindInput<T>): Or<T, R>

    get parents(): Or<T, R>
    get ancestors(): Or<T, R>
    get hierarchy(): Or<T, R>
    hierarchyFiltered(input: FindInput<T>): Or<T, R>
    hierarchyExcept(input: FindInput<T>): Or<T, R>
}

// interface In<T extends object, R> extends RelationalTerms<T, Or<T, R>> {}

type Or<T extends object, R> = R & { get or(): In<T, R> }

interface FindIn<S extends Relational = Relational, T extends object = object> {
    <I extends FindInput<T>>(input: I): FindOutput<S, I> | nil
    all(): S[]
    all<I extends FindInput<T>>(input: I): FindOutput<S, I>[]
    each(): Each<S>
    each<I extends FindInput<T>>(input: I): Each<FindOutput<S, I>>
}

interface Find<S extends Relational = Relational, T extends object = object>
    extends FindIn<S, T> {
    get in(): In<T, FindIn<S, T>>

    parent(): S | nil
    parent<I extends FindInput<T>>(input: I): FindOutput<S, I> | nil
    root(): S | nil
    root<I extends FindInput<T>>(input: I): FindOutput<S, I> | nil
}

interface Assert<S extends Relational = Relational, T extends object = object> {
    <I extends FindInput<T>>(input: I, error?: string): FindOutput<S, I>

    get in(): In<T, AssertIn<S, T>>

    parent(error?: string): S
    parent<I extends FindInput<T>>(input: I, error?: string): FindOutput<S, I>
    root(error?: string): S
    root<I extends FindInput<T>>(input: I, error?: string): FindOutput<S, I>
}

interface AssertIn<
    S extends Relational = Relational,
    T extends object = object
> {
    <I extends FindInput<T>>(input: I, error?: string): FindOutput<S, I>
}

interface Has<T extends object = object> {
    <I extends FindInput<T>>(input: I): boolean
    get in(): In<T, HasIn<T>>

    parent(): boolean
    parent<I extends FindInput<T>>(input: I): boolean
    root(): boolean
    root<I extends FindInput<T>>(input: I): boolean
}

interface HasIn<T extends object = object> {
    <I extends FindInput<T>>(input: I): boolean
}

//
interface FindConstructor {
    new <S extends Relational = Relational, T extends object = object>(
        source: S
    ): Find<S, T>
    new <T extends object = object>(
        source: Relational,
        flag: FindFlag.Has
    ): Has<T>
    new <S extends Relational = Relational, T extends object = object>(
        source: S,
        flag: FindFlag.Assert,
        error?: string
    ): Assert<S, T>
}

enum FindFlag {
    Assert = 0,
    Has = 1,
    All = 2
}

//// Implementation ////

const Find = class extends AbstractCallable<Func> {
    constructor(
        readonly source: Relational,
        private _flag?: FindFlag,
        private readonly _error?: string
    ) {
        super()
        this._iterables = [eachChild(source)]
    }

    override get name() {
        return this._flag === FindFlag.Assert
            ? 'assert'
            : this._flag === FindFlag.Has
            ? 'has'
            : 'find'
    }

    //// Interface ////

    get [Callable.signature]() {
        return this.find
    }

    get in() {
        this._terms.push('in')
        return this
    }

    get or() {
        this._terms.push('or')
        return this
    }

    get all() {
        this._terms.push('all')
        this._flag = FindFlag.All
        return this
    }

    get children() {
        this._updateIterables(eachChild(this.source))
        this._terms.push('children')
        return this
    }

    get siblings() {
        this._updateIterables(eachSibling(this.source))
        this._terms.push('siblings')
        return this
    }

    get descendants() {
        this._updateIterables(eachDescendant(this.source))
        this._terms.push('descendants')
        return this
    }

    descendantsFiltered(input: FindInput<object>) {
        const filter = toFindPredicate(input)
        const eachDescendantFiltered = eachDescendant(this.source, filter)

        this._updateIterables(eachDescendantFiltered)
        this._terms.push('descendants', 'filtered', toFindPredicateName(input))

        return this
    }

    descendantsExcept(input: FindInput<object>) {
        const filter = toFindPredicate(input)
        const eachDescendantExcept = eachDescendant(
            this.source,
            (o: object) => !filter(o)
        )
        this._updateIterables(eachDescendantExcept)
        this._terms.push('descendants', 'except', toFindPredicateName(input))

        return this
    }

    parent(input?: FindInput<object>, error?: string): unknown {
        const parent = getParent(this.source)
        this._updateIterables(parent ? [parent] : [])
        this._terms.push('parent')
        return this.find(input, error)
    }

    get parents() {
        this._updateIterables(eachParent(this.source))
        this._terms.push('parents')
        return this
    }

    root(input?: FindInput<object>, error?: string): unknown {
        this._updateIterables([getRoot(this.source)])
        this._terms.push('root')
        return this.find(input, error)
    }

    get ancestors() {
        this._updateIterables(eachAncestor(this.source))
        this._terms.push('ancestors')
        return this
    }

    get hierarchy() {
        this._updateIterables(eachInHierarchy(this.source))
        this._terms.push('hierarchy')
        return this
    }

    hierarchyFiltered(input: FindInput<object>) {
        const filter = toFindPredicate(input)
        const eachInHierarchyFiltered = eachInHierarchy(this.source, filter)
        this._updateIterables(eachInHierarchyFiltered)
        this._terms.push('hierarchy', 'filtered', toFindPredicateName(input))
        return this
    }

    hierarchyExcept(input: FindInput<object>) {
        const filter = toFindPredicate(input)
        const eachInHierarchyExcept = eachInHierarchy(
            this.source,
            (o: object) => !filter(o)
        )
        this._updateIterables(eachInHierarchyExcept)
        this._terms.push('hierarchy', 'except', toFindPredicateName(input))

        return this
    }

    //// Helper ////

    each(input?: FindInput<object>) {
        this._terms.push('each')
        this._flag = FindFlag.All
        return each(this._iterate(input))
    }

    find(input?: FindInput<object>, error?: string): unknown {
        this._terms.unshift(toFindPredicateName(input))

        const found = [...this._iterate(input)]

        const { _flag: flag } = this

        const has = found.length > 0
        if (flag === FindFlag.Assert && !has) {
            const path = getPath(this.source).join('/')
            const description = this.toString().replace('assert', 'find')
            throw new Error(
                error ??
                    this._error ??
                    `${path} could not ${description}`.trim()
            )
        }

        if (flag === FindFlag.Has) return has

        if (flag === FindFlag.All) return Array.from(found)

        const [first] = found
        return first
    }

    override toString() {
        return `${this.name} ${this._terms.filter(isNotEmpty).join(' ')}`
    }

    //// Iterable ////

    private _terms: string[] = []

    private _iterables: Iterable<Relational>[] = []
    private _updateIterables(iterable: Iterable<Relational>) {
        const updateAsUnion = this._terms.at(-1) === 'or'
        if (!updateAsUnion) this._iterables.length = 0

        this._iterables.push(iterable)
    }

    private *_iterate(input?: FindInput<object>) {
        const findPredicate = input ? toFindPredicate(input) : pass

        const yielded = new Set<Relational>()

        const { _iterables: iterables, _flag: flag } = this

        for (const iterable of iterables) {
            for (const relational of iterable) {
                if (yielded.has(relational) || !findPredicate(relational))
                    continue

                yield relational
                yielded.add(relational)

                if (flag !== FindFlag.All) break
            }
        }
    }
} as FindConstructor

//// Helper ////

function toFindPredicate<T extends object>(
    find: FindInput<T>
): FindPredicate<T> {
    if (hasStaticTypeGuard(find)) return find.is

    if (!isFunc(find) || Relational.is(find)) {
        return Comparable.is(find)
            ? x => find[Comparable.equals](x)
            : x => Object.is(find, x)
    }

    if (isClass(find)) return x => x instanceof find

    return find
}

function toFindPredicateName<T extends object>(input?: FindInput<T>): string {
    let name = input && 'name' in input ? input.name : ''

    // assume type guard with convention isRelationalName
    if (name.startsWith('is')) name = name.replace(/^is/, '')

    // assume anonymous type guard
    return ''
}

//// Exports ////

export {
    FindConstructor,
    FindFlag,
    FindPredicate,
    toFindPredicate,
    FindInput,
    FindOutput,
    Find,
    Has,
    Assert
}
