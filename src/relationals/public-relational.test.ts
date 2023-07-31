import { test, it, expect, describe, beforeAll } from '@jest/globals'

import PublicRelational from './public-relational'
import Traits from '@benzed/traits'
import Relational from '../relational'

//// Setup ////

class Person extends Traits(PublicRelational) {
    constructor() {
        super()
        return PublicRelational.apply(this)
    }
}

const grandPa = new (class GrandPa extends Person {
    readonly mom = new (class Mom extends Person {
        readonly you = new (class You extends Person {
            readonly son = new (class Son extends Person {
                readonly grandDaughter =
                    new (class GrandDaughter extends Person {
                        readonly greatGrandSon =
                            new (class GreatGrandSon extends Person {})()
                    })()
            })()
        })()

        readonly sister = new (class Sister extends Person {
            readonly cousin = new (class Cousin extends Person {
                readonly niece = new (class Niece extends Person {})()
            })()
        })()
    })()

    readonly uncle = new (class Uncle extends Person {})()
})()

//// Tests ////

describe('PublicNode', () => {
    let you: PublicRelational, sister: PublicRelational
    beforeAll(() => {
        you = grandPa.mom.you
        sister = grandPa.mom.sister
    })

    describe('name', () => {
        test("returns the node's property name", () => {
            expect(you.name).toBe('you')
            expect(sister.name).toBe('sister')
        })

        test('returns constructor name if no name exists', () => {
            const anon = new Person()
            expect(anon.name).toBe('Person')
        })
    })

    describe('path', () => {
        test('returns an array of parent property names', () => {
            expect(you.path).toEqual(['mom', 'you'])
            expect(sister.path).toEqual(['mom', 'sister'])
        })
    })

    describe('root', () => {
        test('returns the root node', () => {
            expect(you.root).toBe(grandPa)
            expect(sister.root).toBe(grandPa)
        })
    })

    describe('parent', () => {
        test('returns the parent of the node', () => {
            expect(you.parent).toBe(grandPa.mom)
            expect(sister.parent).toBe(grandPa.mom)
        })
    })

    describe('children', () => {
        test("returns the node's children as an object", () => {
            expect(grandPa.children).toEqual([grandPa.mom, grandPa.uncle])
            expect(grandPa.mom.children).toEqual([you, sister])
        })
    })

    describe('eachChild', () => {
        test("iterates over the node's children", () => {
            const iterator = grandPa.eachChild()
            const children: Relational[] = []
            for (const child of iterator) children.push(child)

            expect(children).toEqual([grandPa.mom, grandPa.uncle])

            const iterator2 = grandPa.mom.eachChild()
            const children2: Relational[] = []
            for (const child of iterator2) children2.push(child)

            expect(children2).toEqual([you, sister])
        })
    })

    describe('eachParent', () => {
        test("iterates over the node's parents", () => {
            const iterator = grandPa.mom.you.eachParent()
            const parents: Relational[] = []
            for (const parent of iterator) parents.push(parent)

            expect(parents).toEqual([grandPa.mom, grandPa])
            const iterator2 = grandPa.mom.sister.eachParent()
            const parents2: Relational[] = []
            for (const parent of iterator2) parents2.push(parent)

            expect(parents2).toEqual([grandPa.mom, grandPa])
        })
    })

    describe('eachSibling', () => {
        test("iterates over the node's siblings", () => {
            const iterator = grandPa.mom.you.eachSibling()
            const siblings: Relational[] = []
            for (const sibling of iterator) siblings.push(sibling)

            expect(siblings).toEqual([sister])

            const iterator2 = sister.eachSibling()
            const siblings2: Relational[] = []
            for (const sibling of iterator2) siblings2.push(sibling)

            expect(siblings2).toEqual([you])
        })
    })

    describe('eachAncestor', () => {
        it('iterates over ancestors', () => {
            const nodes = Array.from(
                grandPa.mom.sister.cousin.niece.eachAncestor()
            )
            expect(nodes.map(node => node.constructor.name)).toEqual([
                'Cousin',
                'Sister',
                'You',
                'Mom',
                'Uncle',
                'GrandPa'
            ])
        })

        it('does not include root node', () => {
            const nodes = Array.from(grandPa.eachAncestor())
            expect(nodes).toHaveLength(0)
        })

        it('iterates over ancestor siblings', () => {
            const nodes = Array.from(grandPa.mom.you.eachAncestor())
            expect(nodes.map(node => node.constructor.name)).toEqual([
                'Mom',
                'Uncle',
                'GrandPa'
            ])
        })

        it("iterates over ancestor siblings' children", () => {
            const nodes = Array.from(grandPa.mom.sister.cousin.eachAncestor())
            expect(nodes.map(node => node.constructor.name)).toEqual([
                'Sister',
                'You',
                'Mom',
                'Uncle',
                'GrandPa'
            ])
        })
    })
})
