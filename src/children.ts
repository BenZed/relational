import { GenericObject, isFunc } from '@benzed/types'

import { each } from '@benzed/each'
import { Callable } from '@benzed/callable'

import { $$parent, getParent, isRelational } from './parent'
import Relational from './relational'

//// Types ////

/**
 * {@link PropertyKey} to implement a custom child-getter
 * method on a {@link Relational} object.
 */
export const $$children = Symbol('create-child-record')

type ChildKeys<T> = Exclude<keyof T, typeof $$parent>

export type Children<T extends Relational> = T extends {
    [$$children](): Record<PropertyKey, Relational>
}
    ? ReturnType<T[typeof $$children]>
    : SubRelational<T>

/**
 * Properties of a given {@link Relational} that
 * are also {@link Relational}
 */
export type SubRelational<T extends Relational> = {
    [K in ChildKeys<T> as T[K] extends Relational ? K : never]: T[K]
}

//// Main ////

/**
 * Get the children of a {@link Relational}, in the
 * form of a {@link Record}
 */
export function getChildren<T extends Relational>(relational: T): Children<T> {
    if (hasChildGetter(relational)) {
        const children = relational[$$children]()
        assertChildGetterOutput(relational, children)
        return children as Children<T>
    }

    return genericChildGetter(relational) as Children<T>
}

//// Helper ////

function hasChildGetter(input: object): input is {
    [$$children](): Record<PropertyKey, Relational>
} {
    return $$children in input && isFunc(input[$$children])
}

function assertChildGetterOutput(
    relational: Relational,
    children: Record<PropertyKey, Relational>
) {
    for (const [key, child] of each.entryOf(children)) {
        if (!isRelational(child))
            throw new Error(
                `${String(key)} is not ${
                    Relational.name
                }, and cannot be a child.`
            )

        const parent = getParent(child)
        if (parent && parent !== relational)
            throw new Error(
                `${String(key)} must be parented to ${
                    Relational.name
                } before being provided as child`
            )
    }
}

function genericChildGetter<T extends Relational>(
    relational: T
): SubRelational<T> {
    const children: GenericObject = {}

    for (const [key, descriptor] of each.defined.descriptorOf(relational)) {
        if (
            key !== $$parent &&
            key !== Callable.context &&
            Relational.is(descriptor.value)
        )
            children[key] = relational[key]
    }

    return children as SubRelational<T>
}
