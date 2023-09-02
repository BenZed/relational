import { test, expect, describe } from '@jest/globals'

import {
    eachAncestor,
    eachChild,
    eachDescendant,
    eachParent,
    eachSibling,
    getRoot
} from './relations'

import { Traits } from '@benzed/traits'

import Relational from './relational'
import { getChildren } from './children'

//// Tests ////

class Person extends Traits(Relational) {
    constructor() {
        super()
        return Relational.apply(this)
    }

    get name() {
        return this.constructor.name
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

describe(getChildren.name, () => {
    test('gets all children of node', () => {
        const children = getChildren(grandPa)

        expect(Object.keys(children)).toHaveLength(2)
        expect(children.mom).toBe(grandPa.mom)
        expect(children.uncle).toBe(grandPa.uncle)
    })

    test('nested node example', () => {
        const you = grandPa.mom.you
        expect(Object.keys(getChildren(you))).toHaveLength(1)
        expect(getChildren(you).son).toBe(you.son)
    })

    test('returns empty object if no children', () => {
        class Leaf extends Person {}
        const leaf = new Leaf()
        const children = getChildren(leaf)

        expect(children).toEqual({})
    })
})

describe(getRoot.name, () => {
    test('returns root', () => {
        expect(getRoot(grandPa.mom.you)).toBe(grandPa)
        expect(getRoot(grandPa.mom.you.son.grandDaughter.greatGrandSon)).toBe(
            grandPa
        )
        expect(getRoot(grandPa.uncle)).toBe(grandPa)
    })

    test('returns input if root', () => {
        expect(getRoot(grandPa)).toBe(grandPa)
    })
})

describe(eachChild.name, () => {
    test('grandPa', () => {
        expect(Array.from(eachChild(grandPa))).toEqual([
            grandPa.mom,
            grandPa.uncle
        ])
    })

    test('mom', () => {
        expect(Array.from(eachChild(grandPa.mom))).toEqual([
            grandPa.mom.you,
            grandPa.mom.sister
        ])
    })

    test('you', () => {
        expect(Array.from(eachChild(grandPa.mom.you))).toEqual([
            grandPa.mom.you.son
        ])
    })

    test('son', () => {
        expect(Array.from(eachChild(grandPa.mom.you.son))).toEqual([
            grandPa.mom.you.son.grandDaughter
        ])
    })

    test('daughter', () => {
        expect(
            Array.from(eachChild(grandPa.mom.you.son.grandDaughter))
        ).toEqual([grandPa.mom.you.son.grandDaughter.greatGrandSon])
    })

    test('sister', () => {
        expect(Array.from(eachChild(grandPa.mom.sister))).toEqual([
            grandPa.mom.sister.cousin
        ])
    })

    test('cousin', () => {
        expect(Array.from(eachChild(grandPa.mom.sister.cousin))).toEqual([
            grandPa.mom.sister.cousin.niece
        ])
    })

    test('no children', () => {
        const node = new (class extends Person {})()
        expect(Array.from(eachChild(node))).toEqual([])
    })
})

describe(eachParent.name, () => {
    test('returns an empty iterator for a root node', () => {
        const it = eachParent(grandPa)
        expect(it.next()).toEqual({ done: true, value: undefined })
    })

    test('iterates through parents from child to root', () => {
        const daughter = grandPa.mom.you.son.grandDaughter
        const it = eachParent(daughter)
        expect(it.next().value).toBe(grandPa.mom.you.son)
        expect(it.next().value).toBe(grandPa.mom.you)
        expect(it.next().value).toBe(grandPa.mom)
        expect(it.next().value).toBe(grandPa)
        expect(it.next()).toEqual({ done: true, value: undefined })
    })
})

describe(eachSibling.name, () => {
    test('Returns an empty array when the node has no parent', () => {
        expect([...eachSibling(grandPa)]).toEqual([])
    })

    test('Iterates over all siblings of a given node', () => {
        expect([...eachSibling(grandPa.mom.you)]).toEqual([grandPa.mom.sister])

        expect([...eachSibling(grandPa.mom)]).toEqual([grandPa.uncle])
    })
})

describe(eachAncestor.name, () => {
    test('grandPa', () => {
        expect(Array.from(eachAncestor(grandPa))).toEqual([])
    })

    test('mom', () => {
        const ancestors = Array.from(eachAncestor(grandPa.mom))
        expect(ancestors).toEqual([grandPa])
    })

    test('you', () => {
        const ancestors = Array.from(eachAncestor(grandPa.mom.you))
        expect(ancestors).toEqual([grandPa.mom, grandPa.uncle, grandPa])
    })

    test('son', () => {
        const ancestors = Array.from(eachAncestor(grandPa.mom.you.son))
        expect(ancestors).toEqual([
            grandPa.mom.you,
            grandPa.mom.sister,
            grandPa.mom,
            grandPa.uncle,
            grandPa
        ])
    })

    test('daughter', () => {
        const ancestors = Array.from(
            eachAncestor(grandPa.mom.you.son.grandDaughter)
        )
        expect(ancestors).toEqual([
            grandPa.mom.you.son,
            grandPa.mom.you,
            grandPa.mom.sister,
            grandPa.mom,
            grandPa.uncle,
            grandPa
        ])
    })

    test('grandSon', () => {
        const ancestors = Array.from(
            eachAncestor(grandPa.mom.you.son.grandDaughter.greatGrandSon)
        )
        expect(ancestors).toEqual([
            grandPa.mom.you.son.grandDaughter,
            grandPa.mom.you.son,
            grandPa.mom.you,
            grandPa.mom.sister,
            grandPa.mom,
            grandPa.uncle,
            grandPa
        ])
    })

    test('sister', () => {
        const ancestors = Array.from(eachAncestor(grandPa.mom.sister))
        expect(ancestors).toEqual([grandPa.mom, grandPa.uncle, grandPa])
    })
})

describe(eachDescendant.name, () => {
    test('iterates over all descendants of a given node', () => {
        const results = Array.from(eachDescendant(grandPa.mom))
        expect(results).toEqual([
            grandPa.mom.you,
            grandPa.mom.sister,
            grandPa.mom.you.son,
            grandPa.mom.sister.cousin,
            grandPa.mom.you.son.grandDaughter,
            grandPa.mom.sister.cousin.niece,
            grandPa.mom.you.son.grandDaughter.greatGrandSon
        ])
    })
})
