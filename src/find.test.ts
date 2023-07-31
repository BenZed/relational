import { fail } from '@benzed/util'
import { Traits } from '@benzed/traits'

import { test, expect, describe } from '@jest/globals'

import { Find, FindFlag } from './find'
import { Relational } from './relational'
import { PublicRelational } from './relationals'

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

const you = grandPa.mom.you

describe('inDescendants', () => {
    test('should find Son', () => {
        const find = new Find<Relational>(you)
        expect(find.inDescendants(you.son)).toBe(you.son)
    })

    test('should find GrandDaughter', () => {
        const find = new Find<Relational>(you)
        expect(find.inDescendants(you.son.grandDaughter)).toBe(
            you.son.grandDaughter
        )
    })

    test('should return undefined for Uncle', () => {
        const find = new Find<Relational>(you)
        expect(find.inDescendants(grandPa.uncle)).toBeUndefined()
    })

    test('inDescendants.all', () => {
        const find = new Find(you)
        expect(
            find.inDescendants.all(
                (p: unknown) =>
                    PublicRelational.is(p) &&
                    p.constructor.name.includes('Grand')
            )
        ).toEqual([you.son.grandDaughter, you.son.grandDaughter.greatGrandSon])
    })
})

describe('inChildren', () => {
    test('Find "son" in children of "you"', () => {
        const find = new Find<Relational>(you)
        expect(find.inChildren(grandPa.mom.you.son)).toEqual(
            grandPa.mom.you.son
        )
    })

    test('Find "uncle" not in children of "you"', () => {
        const find = new Find<Relational>(you)
        expect(find.inChildren(grandPa.uncle)).toBe(undefined)
    })
})

describe('inParents', () => {
    test('returns grandPa from mom', () => {
        const find = new Find<Relational>(grandPa.mom)
        expect(find.inParents(grandPa)).toBe(grandPa)
    })

    test('returns undefined when no parents are found', () => {
        const find = new Find(grandPa.mom)
        expect(find.inParents(grandPa.mom)).toBe(undefined)
    })

    test('returns mom from you', () => {
        const find = new Find<Relational>(grandPa.mom.you)
        expect(find.inParents(grandPa.mom)).toBe(grandPa.mom)
    })

    test('returns undefined when the root node is reached', () => {
        const find = new Find(grandPa)
        expect(find.inParents(grandPa)).toBe(undefined)
    })
})

describe('inNodes', () => {
    test('inNodes should find the source node', () => {
        const find = new Find(you)
        expect(find.inNodes(grandPa.mom.you)).toBe(grandPa.mom.you)
    })

    test('inNodes should find a direct child node', () => {
        const find = new Find<Relational>(you)
        expect(find.inNodes(grandPa.mom.you.son)).toBe(grandPa.mom.you.son)
    })

    test('inNodes should find a deeper descendant node', () => {
        const find = new Find<Relational>(you)
        expect(
            find.inNodes(grandPa.mom.you.son.grandDaughter.greatGrandSon)
        ).toBe(grandPa.mom.you.son.grandDaughter.greatGrandSon)
    })

    test('inNodes should not find a node outside of the subtree', () => {
        const find = new Find<Relational>(you)
        expect(find.inNodes(new Person())).toBe(undefined)
    })
})

describe('or', () => {
    test('find.orinParents() returns grandPa.mom.you or grandPa.uncle', () => {
        const find = new Find<Relational>(you)
        const result = find.inChildren.or.inSiblings(grandPa.mom.sister)

        expect(result).toBe(grandPa.mom.sister)
    })

    test('find.orinAncestors() returns grandPa', () => {
        const find = new Find<Relational>(you)
        const result = find.inChildren.or.inAncestors(grandPa)

        expect(result).toBe(grandPa)
    })
})

describe('Assert', () => {
    test('assert should return found node', () => {
        const find = new Find<Relational>(you, FindFlag.Assert)
        const result = find.inDescendants(you.son)

        expect(result).toBe(you.son)
    })

    test('assert should throw error when node not found', () => {
        const find = new Find(you, FindFlag.Assert)
        expect(() => find.inChildren(fail)).toThrow(
            'Node mom/you Could not find node'
        )
    })

    test('assert should allow custom error message', () => {
        const customErrorMessage = 'Node not found'
        const find = new Find(you, FindFlag.Assert)
        expect(() => find.inDescendants(fail, customErrorMessage)).toThrow(
            customErrorMessage
        )
    })
})
