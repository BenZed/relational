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

type FindOutput<T extends FindInput<object>> = ToRelational<
    T extends Guard<infer T1> | Predicate<infer T1>
        ? T1
        : T extends
              | Struct<infer T2>
              | AbstractStruct<infer T2>
              | Class<infer T2>
              | AbstractClass<infer T2>
        ? T2
        : T
>

type ToRelational<T extends object> = T extends Relational ? T : T & Relational

interface FindRelational<T extends object = object> {
    <I extends FindInput<T>>(input?: I): FindOutput<I> | nil
    get inChildren(): FindRelational<T>
    get inSiblings(): FindRelational<T>
    get inDescendants(): FindRelational<T>
    get inParents(): FindRelational<T>
    get inAncestors(): FindRelational<T>
    get inNodes(): FindRelational<T>
    get or(): FindRelational<T>
    get all(): FindRelationals<T>
}

interface FindRelationals<T extends object = object> {
    <I extends FindInput<T>>(input?: I): FindOutput<I>[]
    get inChildren(): FindRelationals<T>
    get inSiblings(): FindRelationals<T>
    get inDescendants(): FindRelationals<T>
    get inParents(): FindRelationals<T>
    get inAncestors(): FindRelationals<T>
    get inNodes(): FindRelationals<T>
    get or(): FindRelationals<T>
}

interface HasRelational<T extends object = object> {
    <I extends FindInput<T>>(input: I): boolean
    get inChildren(): HasRelational<T>
    get inSiblings(): HasRelational<T>
    get inDescendants(): HasRelational<T>
    get inParents(): HasRelational<T>
    get inAncestors(): FindRelationals<T>
    get inNodes(): FindRelationals<T>
    get or(): FindRelationals<T>
}

interface AssertRelational<T extends object = object> {
    <I extends FindInput<T>>(input: I, error?: string): FindOutput<I>
    get inChildren(): AssertRelational<T>
    get inSiblings(): AssertRelational<T>
    get inDescendants(): AssertRelational<T>
    get inParents(): AssertRelational<T>
    get inAncestors(): AssertRelational<T>
    get inNodes(): AssertRelational<T>
    get or(): AssertRelational<T>
}

interface FindConstructor {
    new <T extends object = object>(source: Relational): FindRelational<T>
    new <T extends object = object>(
        source: Relational,
        flag: FindFlag.All
    ): FindRelationals<T>
    new <T extends object = object>(
        source: Relational,
        flag: FindFlag.Has
    ): HasRelational<T>
    new <T extends object = object>(
        source: Relational,
        flag: FindFlag.Assert,
        error?: string
    ): AssertRelational<T>
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
