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

interface Find<S extends Relational = Relational, T extends object = object> {
    <I extends FindInput<T>>(input?: I): FindOutput<S, I> | nil
    get inChildren(): Find<S, T>
    get inSiblings(): Find<S, T>
    get inDescendants(): Find<S, T>
    get inParents(): Find<S, T>
    get inAncestors(): Find<S, T>
    get inHierarchy(): Find<S, T>
    get or(): Find<S, T>
    get all(): FindAll<S, T>
}

interface FindAll<
    S extends Relational = Relational,
    T extends object = object
> {
    <I extends FindInput<T>>(input?: I): FindOutput<S, I>[]
    get inChildren(): FindAll<S, T>
    get inSiblings(): FindAll<S, T>
    get inDescendants(): FindAll<S, T>
    get inParents(): FindAll<S, T>
    get inAncestors(): FindAll<S, T>
    get inHierarchy(): FindAll<S, T>
    get or(): FindAll<S, T>
}

interface Has<T extends object = object> {
    <I extends FindInput<T>>(input: I): boolean
    get inChildren(): Has<T>
    get inSiblings(): Has<T>
    get inDescendants(): Has<T>
    get inParents(): Has<T>
    get inAncestors(): Has<T>
    get inHierarchy(): Has<T>
    get or(): Has<T>
}

interface Assert<S extends Relational = Relational, T extends object = object> {
    <I extends FindInput<T>>(input: I, error?: string): FindOutput<S, I>
    get inChildren(): Assert<S, T>
    get inSiblings(): Assert<S, T>
    get inDescendants(): Assert<S, T>
    get inParents(): Assert<S, T>
    get inAncestors(): Assert<S, T>
    get inHierarchy(): Assert<S, T>
    get or(): Assert<S, T>
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

    find(input?: FindInput<object>, error?: string): unknown {
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

function toPredicate(input?: FindInput<object>): FindGuard | FindPredicate {
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

function toPredicateName(input?: FindInput<object>): string {
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
    FindInput,
    FindOutput,
    Find,
    FindAll,
    Has,
    Assert
}
