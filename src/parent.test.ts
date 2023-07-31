import { nil } from '@benzed/types'
import { Relational } from './relational'
import { getParent } from './parent'

import { test, describe, expect } from '@jest/globals'
import Traits from '@benzed/traits'

//// Setup ////

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

//// Tests ////

describe(getParent.name, () => {
    test('grandPa has no parent', () => {
        expect(getParent(grandPa)).toBe(nil)
    })

    test('mom parent is grandPa', () => {
        expect(getParent(grandPa.mom)).toBe(grandPa)
    })

    test('you parent is mom', () => {
        expect(getParent(grandPa.mom.you)).toBe(grandPa.mom)
    })

    test('son parent is you', () => {
        expect(getParent(grandPa.mom.you.son)).toBe(grandPa.mom.you)
    })

    test('grand daughter parent is son', () => {
        expect(getParent(grandPa.mom.you.son.grandDaughter)).toBe(
            grandPa.mom.you.son
        )
    })

    test('grandSon parent is daughter', () => {
        expect(getParent(grandPa.mom.you.son.grandDaughter.greatGrandSon)).toBe(
            grandPa.mom.you.son.grandDaughter
        )
    })

    test('sister parent is mom', () => {
        expect(getParent(grandPa.mom.sister)).toBe(grandPa.mom)
    })

    test('cousin parent is sister', () => {
        expect(getParent(grandPa.mom.sister.cousin)).toBe(grandPa.mom.sister)
    })

    test('niece parent is cousin', () => {
        expect(getParent(grandPa.mom.sister.cousin.niece)).toBe(
            grandPa.mom.sister.cousin
        )
    })
})
