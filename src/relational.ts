import { nil, isDefined } from '@benzed/types'
import { trait } from '@benzed/traits'

import { $$parent, getParent, isRelational, setParent } from './parent'

import {
    eachAncestor,
    eachChild,
    eachDescendant,
    eachInHierarchy,
    eachParent,
    eachSibling,
    getRoot
} from './relations'

import { $$children, getChildren } from './children'

import { getPath } from './path'

import { FindOutputFlag as Flag, Find, Assert, Has, Findable } from './find'

//// EsLint ////

/* eslint-disable
    @typescript-eslint/no-explicit-any
*/

//// Main ////

/**
 * The {@link Relational} trait creates knowledge of relations between objects,
 * allowing them to make assertions based on their relationship structure,
 * or existence of other {@link Relationals} in their hierarchy.
 *
 * A {@link Relational}s will automatically assign itself as the parent of any
 * defined properties in it that are also {@link Relational}s.
 */
@trait
abstract class Relational {
    static readonly parent: typeof $$parent = $$parent
    static readonly children: typeof $$children = $$children

    static readonly is = isRelational

    static readonly setParent = setParent
    static readonly getParent = getParent

    static readonly getRoot = getRoot
    static readonly getChildren = getChildren

    static readonly eachChild = eachChild
    static readonly eachParent = eachParent
    static readonly eachSibling = eachSibling
    static readonly eachAncestor = eachAncestor
    static readonly eachDescendent = eachDescendant
    static readonly eachNode = eachInHierarchy

    static readonly getPath = getPath

    static find<R extends Relational, F extends Findable = Findable>(
        source: R
    ): Find<R, F> {
        return new Find(source)
    }

    static has<F extends Findable = Findable>(source: Relational): Has<F> {
        return new Find(source, Flag.Has)
    }

    static assert<R extends Relational, F extends Findable = Findable>(
        source: R,
        error?: string
    ): Assert<R, F> {
        return new Find(source, Flag.Assert, error)
    }

    /**
     * Imbue a node with logic for assigning parents on property definition,
     * and unassign them on property deletion.
     */
    static apply<T extends Relational>(relational: T): T {
        const proxyRelational = new Proxy(relational, {
            defineProperty(relational, key: keyof Relational, descriptor) {
                const { value } = descriptor

                const isRelationKey = key === $$parent || key === $$children

                // TODO: isValidParent functionality
                // if a relational is being assigned as
                // a property to another relational that is
                // not a valid parent, it should neither
                // assign the child or throw an error.

                // clear parent of node being over-written
                if (
                    !isRelationKey &&
                    isRelational(value) &&
                    isDefined(value[$$parent])
                ) {
                    throw new Error(
                        `Cannot set parent of property ${String(
                            key
                        )} without clearing value's existing parent`
                    )
                }

                // set parent of new node
                if (!isRelationKey && isRelational(value))
                    setParent(value, proxyRelational)

                return Reflect.defineProperty(relational, key, descriptor)
            },

            deleteProperty(relational, key: keyof Relational) {
                const isRelationKey = key === $$parent || key === $$children
                if (!isRelationKey && isRelational(relational[key])) {
                    setParent(relational[key], nil)
                }

                return Reflect.deleteProperty(relational, key)
            }
        })

        for (const child of eachChild(proxyRelational))
            setParent(child, proxyRelational)

        setParent(proxyRelational, nil)
        return proxyRelational
    }

    readonly [$$parent]: Relational | nil
}

//// Exports ////

export default Relational

export { Relational }
