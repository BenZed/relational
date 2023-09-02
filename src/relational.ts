import { nil, isDefined } from '@benzed/types'

import { $$parent, getParent, isRelational, setParent } from './parent'

import {
    eachAncestor,
    eachChild,
    eachDescendant,
    eachNode,
    eachParent,
    eachSibling,
    getChildren,
    getRoot
} from './relations'

import { getPath } from './path'

import {
    Find,
    AssertRelational,
    FindFlag,
    FindRelational,
    HasRelational
} from './find'

import { trait } from '@benzed/traits'

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
    static readonly eachNode = eachNode

    static readonly getPath = getPath

    static find<T extends object = object>(
        relational: Relational
    ): FindRelational<T> {
        return new Find(relational)
    }

    static has<T extends object = object>(
        relational: Relational
    ): HasRelational<T> {
        return new Find(relational, FindFlag.Has)
    }

    static assert<T extends object = object>(
        relational: Relational,
        error?: string
    ): AssertRelational<T> {
        return new Find(relational, FindFlag.Assert, error)
    }

    /**
     * Imbue a node with logic for assigning parents on property definition,
     * and unassign them on property deletion.
     */
    static apply<T extends Relational>(node: T): T {
        const proxyNode = new Proxy(node, {
            defineProperty(node, key: keyof Relational, descriptor) {
                const { value } = descriptor

                const isParentKey = key === $$parent

                // TODO: isValidParent functionality
                // if a relational is being assigned as
                // a property to another relational that is
                // not a valid parent, it should neither
                // assign the child or throw an error.

                // clear parent of node being over-written
                if (
                    !isParentKey &&
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
                if (!isParentKey && isRelational(value))
                    setParent(value, proxyNode)

                return Reflect.defineProperty(node, key, descriptor)
            },

            deleteProperty(node, key: keyof Relational) {
                const isParentKey = key === $$parent
                if (!isParentKey && isRelational(node[key]))
                    setParent(node[key], nil)

                return Reflect.deleteProperty(node, key)
            }
        })

        for (const child of eachChild(proxyNode)) setParent(child, proxyNode)

        setParent(proxyNode, nil)
        return proxyNode
    }

    readonly [$$parent]: Relational | nil
}

//// Exports ////

export default Relational

export { Relational }
