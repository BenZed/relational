import { Func, isTruthy as isNotEmpty, isObject, isString } from '@benzed/types'

import { each } from '@benzed/each'
import { AbstractCallable, Callable } from '@benzed/callable'

import { Relational } from '../relational'
import {
    eachAncestor,
    eachChild,
    eachDescendant,
    eachInHierarchy,
    eachParent,
    eachSibling,
    getRoot
} from '../relations'

import { getPath } from '../path'
import { getParent } from '../parent'
import { toFindPredicate, toFindPredicateName } from './predicate'
import { FindOneOrMore, FindInput } from './types'

//// Flags ////

export enum FindOutputFlag {
    Assert = 0,
    Has = 1,
    All = 2
}

//// Implementation ////

export class Find extends AbstractCallable<Func> {
    constructor(
        readonly source: Relational,
        private _flag?: FindOutputFlag,
        private _error?: string
    ) {
        super()
        this._iterables = [eachChild(source)]
    }

    override get name() {
        return this._flag === FindOutputFlag.Assert
            ? 'assert'
            : this._flag === FindOutputFlag.Has
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
        this._flag = FindOutputFlag.All
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

    descendantsFiltered(...terms: FindOneOrMore) {
        const filter = toFindPredicate(...terms)

        const eachDescendantFiltered = eachDescendant(this.source, filter)

        this._updateIterables(eachDescendantFiltered)
        this._terms.push(
            'descendants',
            'filtered',
            toFindPredicateName(...terms)
        )

        return this
    }

    descendantsExcept(...terms: FindOneOrMore) {
        const filter = toFindPredicate(...terms)
        const eachDescendantExcept = eachDescendant(
            this.source,
            (o: object) => !filter(o)
        )
        this._updateIterables(eachDescendantExcept)
        this._terms.push('descendants', 'except', toFindPredicateName(...terms))

        return this
    }

    parent(...args: (FindInput | string)[]): unknown {
        const parent = getParent(this.source)
        this._updateIterables(parent ? [parent] : [])
        this._terms.push('parent')
        return this.find(...args)
    }

    get parents() {
        this._updateIterables(eachParent(this.source))
        this._terms.push('parents')
        return this
    }

    root(...args: (FindInput | string)[]): unknown {
        this._updateIterables([getRoot(this.source)])
        this._terms.push('root')
        return this.find(...args)
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

    hierarchyFiltered(...terms: FindOneOrMore) {
        const filter = toFindPredicate(...terms)
        const eachInHierarchyFiltered = eachInHierarchy(this.source, filter)
        this._updateIterables(eachInHierarchyFiltered)
        this._terms.push('hierarchy', 'filtered', toFindPredicateName(terms))
        return this
    }

    hierarchyExcept(...terms: FindOneOrMore) {
        const filter = toFindPredicate(...terms)
        const eachInHierarchyExcept = eachInHierarchy(
            this.source,
            (o: object) => !filter(o)
        )
        this._updateIterables(eachInHierarchyExcept)
        this._terms.push('hierarchy', 'except', toFindPredicateName(terms))

        return this
    }

    //// Helper ////

    each(...terms: FindInput[]) {
        this._terms.push('each')
        this._flag = FindOutputFlag.All

        return each(this._iterate(terms))
    }

    find(...args: (FindInput | string)[]): unknown {
        const terms = args.filter<FindInput>(isObject)
        const error = args.find(isString)

        this._terms.unshift(toFindPredicateName(...terms))

        const found = [...this._iterate(terms)]

        const { _flag: flag } = this
        if (flag === FindOutputFlag.All) return found

        const has = found.length > 0
        if (flag === FindOutputFlag.Has) return has

        if (flag === FindOutputFlag.Assert && !has) {
            const path = getPath(this.source).join('/')
            const description = this.toString().replace('assert', 'find')
            throw new Error(
                error ??
                    this._error ??
                    `${path} could not ${description}`.trim()
            )
        }

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

    private *_iterate(terms: FindInput[]) {
        const findPredicate = toFindPredicate(...terms)

        const yielded = new Set<Relational>()

        const { _iterables: iterables, _flag: flag } = this

        for (const iterable of iterables) {
            for (const relational of iterable) {
                if (yielded.has(relational) || !findPredicate(relational))
                    continue

                yield relational
                yielded.add(relational)

                if (flag !== FindOutputFlag.All) break
            }
        }
    }
}
