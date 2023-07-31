import { nil } from '@benzed/types'

import { it, expect, describe } from '@jest/globals'

import { Relational } from './relational'
import Traits from '@benzed/traits'

//// Types ////

class Node extends Traits(Relational) {
    constructor(data: string) {
        super()
        Object.assign(this, { data })
        return Relational.apply(this)
    }

    [key: string]: Node | nil

    get parent() {
        return Relational.getParent(this) as Node | nil
    }
}

//// Tests ////

describe(Relational.name + '.' + Relational.apply.name, () => {
    describe('auto parent set', () => {
        it('on property define', () => {
            const parent = new Node('parent')
            parent.child = new Node('child')
            expect(parent.child.parent).toBe(parent)
        })

        it('on property set', () => {
            const parent = new Node('parent')
            const child1 = new Node('child1')
            const child2 = new Node('child2')

            parent.child = child1
            parent.child = child2
            expect(child2.parent).toBe(parent)
        })

        it('throws if parent assigned without being cleared', () => {
            const alphabet = new Node('alphabet')
            expect(alphabet.parent).toBe(nil)

            const a = new Node('a')
            expect(a.parent).toBe(nil)

            alphabet.a = a

            expect(a.parent).toBe(alphabet)
            expect([...Relational.eachChild(alphabet)]).toEqual([a])

            const alphabet2 = new Node('alphabet2')
            expect(() => {
                alphabet2.a = a
            }).toThrow(`Cannot set parent of property a`)

            delete alphabet.a

            expect(() => {
                alphabet2.a = a
            }).not.toThrow()

            expect(a.parent).toEqual(alphabet2)
            expect([...Relational.eachChild(alphabet2)]).toEqual([a])
            expect([...Relational.eachChild(alphabet)]).toEqual([])
        })
    })

    describe('auto parent clear', () => {
        it('on property delete', () => {
            const parent = new Node('parent')
            const child = new Node('child')

            parent.child = child
            expect(child.parent).toBe(parent)

            delete parent.child
            expect(child.parent).toBe(nil)
        })
    })
})
