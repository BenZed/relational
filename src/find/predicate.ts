import { isFunc, TypeGuard, hasStaticTypeGuard, isClass } from '@benzed/types'
import { equals, Comparable } from '@benzed/immutable'

import { Relational } from '../relational'
import { FindInput } from './types'

//// Helper Types ////

export type FindGuard<T extends object = object> = TypeGuard<T, object>

export type FindPredicate<T extends object = object> = (input: T) => boolean

//// Helper ////

export function toFindPredicate<T extends object>(
    find: FindInput<T>
): FindPredicate<T> {
    if (hasStaticTypeGuard(find)) return find.is

    if (!isFunc(find) || Relational.is(find)) {
        return Comparable.is(find)
            ? o => equals(find, o)
            : o => Object.is(find, o)
    }

    if (isClass(find)) return o => o instanceof find

    return find
}

export function toFindPredicateName<T extends object>(
    input?: FindInput<T>
): string {
    let name = input && 'name' in input ? input.name : ''

    // assume type guard with convention isRelationalName
    if (/^is/.test(name)) name = name.replace(/^is/, '')

    return name
}
