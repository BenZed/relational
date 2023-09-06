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
    eachInHierarchy,
    eachParent,
    eachSibling
} from './relations'

import { getPath } from './path'

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

interface FindTerms<T extends object = object> {
    get inChildren(): this
    get inSiblings(): this
    get inDescendants(): this
    inDescendantsFiltered(input: FindInput<T>): this
    inDescendantsExcept(input: FindInput<T>): this

    get inParents(): this
    get inAncestors(): this
    get inHierarchy(): this
    inHierarchyFiltered(input: FindInput<T>): this
    inHierarchyExcept(input: FindInput<T>): this

    get or(): this
}

interface Find<S extends Relational = Relational, T extends object = object>
    extends FindTerms<T> {
    <I extends FindInput<T>>(input?: I): FindOutput<S, I> | nil

    get all(): FindAll<S, T>
}

interface FindAll<S extends Relational = Relational, T extends object = object>
    extends FindTerms<T> {
    <I extends FindInput<T>>(input?: I): FindOutput<S, I>[]
}

interface Has<T extends object = object> extends FindTerms<T> {
    <I extends FindInput<T>>(input: I): boolean
}

interface Assert<S extends Relational = Relational, T extends object = object>
    extends FindTerms<T> {
    <I extends FindInput<T>>(input: I, error?: string): FindOutput<S, I>
}

interface FindConstructor {
    new <S extends Relational = Relational, T extends object = object>(
        source: Relational
    ): Find<S, T>
    new <S extends Relational = Relational, T extends object = object>(
        source: Relational,
        flag: FindFlag.All
    ): FindAll<S, T>
    new <T extends object = object>(
        source: Relational,
        flag: FindFlag.Has
    ): Has<T>
    new <S extends Relational = Relational, T extends object = object>(
        source: Relational,
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
        this._each = eachChild(source)
    }

    //// Interface ////

    get [Callable.signature]() {
        return this.find
    }

    get or() {
        this._mergeOnIncrement = true
        return this
    }

    get all() {
        this._flag = FindFlag.All
        return this
    }

    get inChildren() {
        return this._incrementEach(eachChild(this.source))
    }

    get inSiblings() {
        return this._incrementEach(eachSibling(this.source))
    }

    get inDescendants() {
        return this._incrementEach(eachDescendant(this.source))
    }

    inDescendantsFiltered(input: FindInput<object>) {
        const filter = toFindPredicate(input)
        return this._incrementEach(eachDescendant(this.source, filter))
    }

    inDescendantsExcept(input: FindInput<object>) {
        const filter = toFindPredicate(input)
        const except = (x: object) => !filter(x)
        return this._incrementEach(eachDescendant(this.source, except))
    }

    get inParents() {
        return this._incrementEach(eachParent(this.source))
    }

    get inAncestors() {
        return this._incrementEach(eachAncestor(this.source))
    }

    get inHierarchy() {
        return this._incrementEach(eachInHierarchy(this.source))
    }

    inHierarchyFiltered(input: FindInput<object>) {
        const filter = toFindPredicate(input)
        return this._incrementEach(eachInHierarchy(this.source, filter))
    }

    inHierarchyExcept(input: FindInput<object>) {
        const filter = toFindPredicate(input)
        const except = (x: object) => !filter(x)
        return this._incrementEach(eachInHierarchy(this.source, except))
    }

    //// Helper ////

    find(input?: FindInput<object>, error?: string): unknown {
        const findPredicate = input ? toFindPredicate(input) : pass

        const found = new Set<Relational>()
        const { _flag: flag } = this

        iterators: for (const node of this._each) {
            if (found.has(node)) continue

            const pass = findPredicate(node)
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
                    )} could not find ${toFindPredicateName(input)}`
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

function toFindPredicate<T extends object>(i: FindInput<T>): FindPredicate<T> {
    if (hasStaticTypeGuard(i)) return i.is

    if (!isFunc(i) || Relational.is(i)) {
        return Comparable.is(i)
            ? x => i[Comparable.equals](x)
            : x => Object.is(i, x)
    }

    if (isClass(i)) return x => x instanceof i

    return i
}

function toFindPredicateName<T extends object>(input?: FindInput<T>): string {
    let name = input && 'name' in input ? input.name : ''

    // assume type guard with convention isModuleName
    if (name.startsWith('is')) name = name.slice(0, 2)

    // assume anonymous type guard
    if (!name) return Relational.name

    return name
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
    FindAll,
    Has,
    Assert
}
