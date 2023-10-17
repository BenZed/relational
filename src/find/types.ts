//// Types ////

import { Each } from '@benzed/each'
import {
    AbstractClass,
    AbstractStruct,
    Class,
    StaticTypeGuard,
    Struct,
    nil
} from '@benzed/types'

import Relational from '../relational'
import { FindGuard, FindPredicate } from './predicate'
import { Find as _Find, FindOutputFlag } from './implementation'

//// Helper ////

type _FindOutput<I extends FindInput> = I extends
    | FindGuard<infer T1>
    | FindPredicate<infer T1>
    ? T1
    : I extends
          | Struct<infer T2>
          | AbstractStruct<infer T2>
          | Class<infer T2>
          | AbstractClass<infer T2>
    ? T2
    : I

type _FindOutputIntersection<F extends FindOneOrMore> = F extends [
    infer F1,
    ...infer Fr
]
    ? F1 extends FindInput
        ? Fr extends FindOneOrMore
            ? _FindOutput<F1> & _FindOutputIntersection<Fr>
            : _FindOutput<F1>
        : never
    : never

type _AsRelational<S extends Relational, F extends Findable> = F extends S
    ? F
    : S & F

//// Input/Output ////

type Findable = object

type FindInput<T extends Findable = Findable> =
    | T
    | FindGuard<T>
    | FindPredicate<T>
    | Class<T>
    | AbstractClass<T>
    | StaticTypeGuard<T>

type FindOneOrMore<T extends Findable = Findable> = [
    FindInput<T>,
    ...FindInput<T>[]
]

type Found<
    S extends Relational = Relational,
    F extends FindOneOrMore = FindOneOrMore
> = _AsRelational<S, _FindOutputIntersection<F>>

//// Find ////

interface In<F extends Findable, RETURN> {
    get children(): Or<F, RETURN>
    get siblings(): Or<F, RETURN>
    get descendants(): Or<F, RETURN>
    descendantsFiltered(...terms: FindOneOrMore<F>): Or<F, RETURN>
    descendantsExcept(...terms: FindOneOrMore<F>): Or<F, RETURN>

    get parents(): Or<F, RETURN>
    get ancestors(): Or<F, RETURN>
    get hierarchy(): Or<F, RETURN>
    hierarchyFiltered(...terms: FindOneOrMore<F>): Or<F, RETURN>
    hierarchyExcept(...terms: FindOneOrMore<F>): Or<F, RETURN>
}

type Or<F extends Findable, RETURN> = RETURN & { get or(): In<F, RETURN> }

interface FindIn<
    S extends Relational = Relational,
    F extends Findable = Findable
> {
    <T extends FindOneOrMore<F>>(...terms: T): Found<S, T> | nil
    all(): S[]
    all<T extends FindOneOrMore<F>>(...terms: T): Found<S, T>[]
    each(): Each<S>
    each<T extends FindOneOrMore<F>>(...terms: T): Each<Found<S, T>>
}

interface Find<S extends Relational = Relational, F extends Findable = Findable>
    extends FindIn<S, F> {
    get in(): In<F, FindIn<S, F>>

    parent(): S | nil
    parent<T extends FindOneOrMore<F>>(...terms: T): Found<S, T> | nil
    root(): S | nil
    root<T extends FindOneOrMore<F>>(...terms: T): Found<S, T> | nil
}

//// Assert ////

interface AssertIn<
    S extends Relational = Relational,
    F extends Findable = Findable
> {
    <T extends FindOneOrMore<F>>(
        ...terms: T | [...T, error?: string]
    ): Found<S, T>
}

interface Assert<
    S extends Relational = Relational,
    F extends Findable = Findable
> {
    <T extends FindOneOrMore<F>>(
        ...terms: T | [...T, error?: string]
    ): Found<S, T>

    get in(): In<F, AssertIn<S, F>>

    parent(error?: string): S
    parent<T extends FindOneOrMore<F>>(
        ...terms: T | [...T, error?: string]
    ): Found<S, T>

    root(error?: string): S
    root<T extends FindOneOrMore<F>>(
        ...terms: T | [...T, error?: string]
    ): Found<S, T>
}

//// Has ////

interface HasIn<F extends Findable = Findable> {
    <T extends FindOneOrMore<F>>(...terms: T): boolean
}

interface Has<F extends Findable = Findable> {
    <T extends FindOneOrMore<F>>(...terms: T): boolean
    get in(): In<F, HasIn<F>>

    parent(): boolean
    parent<T extends FindOneOrMore<F>>(...terms: T): boolean

    root(): boolean
    root<T extends FindOneOrMore<F>>(...terms: T): boolean
}

//// Static Types ////

interface FindConstructor {
    new <S extends Relational, F extends Findable = Findable>(
        source: S
    ): Find<S, F>

    new <F extends Findable = Findable>(
        source: Relational,
        flag: FindOutputFlag.Has
    ): Has<F>

    new <S extends Relational, F extends Findable = Findable>(
        source: S,
        flag: FindOutputFlag.Assert,
        error?: string
    ): Assert<S, F>
}

//// Apply Implementation ////

const Find = _Find as unknown as FindConstructor

//// Exports ////

export { Findable, FindInput, FindOneOrMore, Found, Find, Has, Assert }
