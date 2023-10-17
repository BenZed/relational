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

//// Input/Output ////

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
> = AsRelational<
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

type AsRelational<S extends Relational, T extends object> = T extends S
    ? T
    : T & S

//// Find ////

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

//// Assert ////

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

//// Has ////

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

//// Static Types ////

interface FindConstructor {
    new <S extends Relational, T extends object = object>(source: S): Find<S, T>

    new <T extends object = object>(
        source: Relational,
        flag: FindOutputFlag.Has
    ): Has<T>

    new <S extends Relational, T extends object = object>(
        source: S,
        flag: FindOutputFlag.Assert,
        error?: string
    ): Assert<S, T>
}

//// Apply Implementation ////

const Find = _Find as FindConstructor

//// Exports ////

export { FindInput, FindOutput, Find, Has, Assert }
