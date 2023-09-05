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

import { Find, Assert, FindFlag, Has } from './find'

//// EsLint ////

/* eslint-disable
    @typescript-eslint/no-explicit-any
*/

//// Main ////

/**
 * The Relational trait creates knowledge of relations between objects,
 * allowing them to make assertions based on their relationship structure,
 * or existence of other nodes in their relationship tree.
 *
 * A relational will automatically assign itself as the parent of any
 * properties that are defined in it that are also nodes.
 */
@trait
abstract class Relational {
    static readonly parent: typeof $$parent = $$parent
    static readonly children: typeof $$children = $$children

    static readonly is = isRelational

    static readonly setParent = setParent

    static readonly getChildren = getChildren
    static readonly getParent = getParent
    static readonly getRoot = getRoot

    static readonly eachChild = eachChild
    static readonly eachParent = eachParent
    static readonly eachSibling = eachSibling
    static readonly eachAncestor = eachAncestor
    static readonly eachDescendent = eachDescendant
    static readonly eachNode = eachInHierarchy

    static readonly getPath = getPath

    static find<R extends Relational = Relational, T extends object = object>(
        relational: Relational
    ): Find<R, T> {
        return new Find(relational)
    }

    static has<T extends object = object>(relational: Relational): Has<T> {
        return new Find<T>(relational, FindFlag.Has)
    }

    static assert<R extends Relational = Relational, T extends object = object>(
        relational: Relational,
        error?: string
    ): Assert<R, T> {
        return new Find(relational, FindFlag.Assert, error)
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
