import {
    isFunc,
    TypeGuard,
    hasStaticTypeGuard,
    isClass,
    isIntersectionOf
} from '@benzed/types'
import { equals, Comparable } from '@benzed/immutable'

import { Relational } from '../relational'
import { FindInput, Findable } from './types'
import { pass } from '@benzed/util'

//// Helper Types ////

export type FindGuard<T extends object = object> = TypeGuard<T, object>

export type FindPredicate<T extends object = object> = (input: T) => boolean

//// Helper ////

export function toFindPredicate<F extends Findable>(
    ...terms: FindInput<F>[]
): FindPredicate<F> {
    const predicates = terms.map<FindPredicate<F>>(term => {
        if (hasStaticTypeGuard(term)) return term.is

        if (!isFunc(term) || Relational.is(term)) {
            return Comparable.is(term)
                ? o => equals(term, o)
                : o => Object.is(term, o)
        }

        if (isClass(term)) return o => o instanceof term

        return term
    })

    return predicates.length <= 1
        ? predicates.at(0) ?? pass
        : isIntersectionOf(...(predicates as FindGuard[]))
}

export function toFindPredicateName<T extends Findable>(
    ...terms: FindInput<T>[]
): string {
    const names = terms.map(term => {
        let name = term && 'name' in term ? term.name : ''

        // assume type guard with convention isRelationalName
        if (/^is/.test(name)) name = name.replace(/^is/, '')

        return name
    })
    return names.join('&')
}
