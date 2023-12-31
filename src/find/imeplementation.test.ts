import { fail } from '@benzed/util'
import { Traits, trait } from '@benzed/traits'

import { test, expect, describe, beforeEach } from '@jest/globals'

import { Assert, Find, Has } from './types'
import { Relational } from '../relational'
import { isFunc, isShapeOf } from '@benzed/types'

//// Setup ////

class Person extends Traits(Relational) {
    constructor() {
        super()
        return Relational.apply(this)
    }

    get find(): Find<Person> {
        return Relational.find(this)
    }

    get assert(): Assert<Person> {
        return Relational.assert(this)
    }

    get has(): Has {
        return Relational.has(this)
    }

    get name() {
        return this.constructor.name
    }

    override toString() {
        return this.name
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
                readonly grandNiece = new (class Niece extends Person {})()
            })()
        })()
    })()

    readonly uncle = new (class Uncle extends Person {})()
})()

//// Tests ////

const { mom, uncle } = grandPa
const { you, sister } = mom
const { cousin } = sister
const { grandNiece } = cousin
const { son } = you
const { grandDaughter } = son
const { greatGrandSon } = grandDaughter

describe(`${you.find.in.descendants}`, () => {
    test(`${you.find.in.descendants}`, () => {
        expect(you.find.in.descendants(son)).toBe(you.son)
    })

    test(`${you.find.in.descendants} ${grandDaughter}`, () => {
        expect(you.find.in.descendants(grandDaughter)).toBe(grandDaughter)
    })

    test(`${you.find.in.descendants} ${uncle}`, () => {
        expect(you.find.in.descendants(uncle)).toBeUndefined()
    })

    test(`${you.find.in.descendants.all}`, () => {
        expect(you.find.in.descendants.all()).toEqual([
            son,
            grandDaughter,
            greatGrandSon
        ])
    })

    test(`${you.find.in.descendants.all} predicate`, () => {
        expect(
            you.find.in.descendants.all((p: Person) => /grand/i.test(p.name))
        ).toEqual([grandDaughter, greatGrandSon])
    })

    test(`${you.find.in.descendantsFiltered(Person)}`, () => {
        const find = new Find(grandPa)
        expect(find.in.descendantsFiltered(i => i !== mom).all()).toEqual([
            mom,
            uncle
        ])
    })

    test(`${you.find.in.descendantsExcept(mom)}`, () => {
        const find = new Find(grandPa)
        expect(find.in.descendantsExcept(mom).all()).toEqual([mom, uncle])
    })
})

describe(`${you.find.in.children}`, () => {
    test(`${you.find.in.children(son)}`, () => {
        expect(you.find.in.children(son)).toEqual(son)
    })

    test(`${you.find.in.children} ${uncle}`, () => {
        expect(you.find.in.children(uncle)).toBe(undefined)
    })
})

describe(`${you.find.in.parents}`, () => {
    test(`${mom.find.in.parents} ${grandPa}`, () => {
        expect(mom.find.in.parents(grandPa)).toBe(grandPa)
    })

    test(`${mom.find.in.parents} ${you}`, () => {
        expect(mom.find.in.parents(you)).toBe(undefined)
    })

    test(`${you.find.in.parents} ${mom}`, () => {
        expect(you.find.in.parents(mom)).toBe(mom)
    })

    test(`${grandPa.find.in.parents} ${grandPa}`, () => {
        expect(grandPa.find.in.parents(grandPa)).toBe(undefined)
    })

    test(`${you.find.in.parents.all}`, () => {
        expect(you.find.in.parents.all()).toEqual([mom, grandPa])
    })

    test(`${you.find.in.parents.all} predicate`, () => {
        expect(
            you.find.in.parents.all((p: Person) => p.name === 'Mom')
        ).toEqual([mom])
    })
})

describe(`${you.find.in.hierarchy}`, () => {
    test(`${you.find.in.hierarchy} ${you}`, () => {
        expect(you.find.in.hierarchy(you)).toBe(you)
    })

    test(`${you.find.in.hierarchy} ${son}`, () => {
        expect(you.find.in.hierarchy(son)).toBe(son)
    })

    test(`${you.find.in.hierarchy} ${greatGrandSon}`, () => {
        expect(you.find.in.hierarchy(greatGrandSon)).toBe(greatGrandSon)
    })

    test(`${you.find.in.hierarchy} ${grandNiece}`, () => {
        expect(you.find.in.hierarchy(grandNiece)).toBe(grandNiece)
    })

    test(`${you.find.in.hierarchy} ${Person.name} outside hierarchy`, () => {
        // was this test really necessary
        expect(you.find.in.hierarchy(new Person())).toBe(undefined)
    })
})

describe(`${you.find.in} or`, () => {
    test(`${you.find.in.children.or.siblings} ${sister}`, () => {
        expect(you.find.in.children.or.siblings(sister)).toBe(sister)
    })

    test(`${you.find.in.children.or.siblings} ${grandPa}`, () => {
        expect(you.find.in.children.or.siblings(grandPa)).toBe(undefined)
    })

    test(`${you.find.in.children.or.ancestors} ${grandPa}`, () => {
        expect(you.find.in.children.or.ancestors(grandPa)).toBe(grandPa)
    })

    test(`${you.find.in.siblings.or.ancestors} ${son}`, () => {
        expect(you.find.in.siblings.or.ancestors(son)).toBe(undefined)
    })

    test(`${you.find.in.parents.or.children} ${uncle}`, () => {
        expect(you.find.in.parents.or.children(uncle)).toBe(undefined)
    })
})

describe(`${you.assert}`, () => {
    const { root, parent } = you.assert

    test(`${you.assert.in.descendants.or.siblings} ${son}`, () => {
        expect(you.assert.in.descendants.or.siblings(son)).toBe(son)
    })

    test(`${you.assert} fail`, () => {
        expect(() => you.assert(fail)).toThrow('mom/you could not find')
    })

    test(`${you.assert} ${parent.name}`, () => {
        expect(() => you.assert.parent()).not.toThrow()
        expect(() => you.assert.parent(grandPa)).toThrow(
            `could not find GrandPa parent`
        )
        expect(() => grandPa.assert.parent()).toThrow('could not find parent')
    })

    test(`${you.assert} ${root.name}`, () => {
        expect(() => you.assert.root(mom)).toThrow('could not find Mom root')
        expect(you.assert.root()).toEqual(grandPa)
    })

    test(`${you.assert.in.children} fail`, () => {
        expect(() => you.assert.in.children(fail)).toThrow(
            'mom/you could not find in children'
        )
    })

    test(`${you.assert.in.children} GrandPa`, () => {
        expect(() => you.assert.in.children(grandPa)).toThrow(
            'mom/you could not find GrandPa in children'
        )
    })

    test(`${you.assert.in.descendants} custom message`, () => {
        const customErrorMessage = 'Bad find'
        expect(() =>
            you.assert.in.descendants(fail, customErrorMessage)
        ).toThrow(customErrorMessage)
    })
})

describe('type signature', () => {
    //
    class Entity extends Traits(Relational) {
        constructor() {
            super()
            return Relational.apply(this)
        }
        //
        get find(): Find<Entity> {
            return Relational.find(this)
        }

        get assert(): Assert<Entity> {
            return Relational.assert(this)
        }
    }

    test('objects do not need to be extended to be found', () => {
        class Group extends Entity {
            one = new Entity()

            two = new Entity()

            three = new Entity()
        }

        const group = new Group()

        expect(Symbol.hasInstance in Entity).toBe(true)

        const entities = group.find.all(Entity)
        expect(entities).toEqual([group.one, group.two, group.three])

        const entity = group.find(Entity)
        entity satisfies Entity | undefined
        expect(entity).toBeInstanceOf(Entity)
    })

    @trait
    abstract class Describer {
        static readonly is = isShapeOf<Describer>({
            describe: isFunc
        })

        abstract describe(): string
    }

    @trait
    abstract class Alerter {
        static readonly is = isShapeOf<Alerter>({
            alert: isFunc
        })

        abstract alert(): void
    }

    class DEntity extends Entity implements Describer {
        describe(): string {
            return `The path to this ${
                this.constructor.name
            } is ${Relational.getPath(this)}`
        }
    }

    class AEntity extends Entity implements Alerter {
        alert(): void {
            throw new Error('Not Yet Implemented')
        }
    }

    class DAEntity extends DEntity implements Alerter {
        alerted = false
        alert(): void {
            this.alerted = true
        }
    }

    class Collection extends Entity {
        d1 = new DEntity()
        d2 = new DEntity()
        d3 = new DAEntity()
        a1 = new AEntity()
        e1 = new Entity()
    }

    let collection: Collection
    beforeEach(() => {
        collection = new Collection()
    })

    test('can search for non-relationals', () => {
        const describers = collection.find.all(Describer)
        expect(describers).toEqual([
            collection.d1,
            collection.d2,
            collection.d3
        ])

        const alerters = collection.find.all(Alerter)
        expect(alerters).toEqual([collection.d3, collection.a1])
    })

    test('is type safe', () => {
        const describer = collection.assert(Describer)
        expect(describer).toBeInstanceOf(Describer)
        expect(describer).toBeInstanceOf(Entity)
        describer satisfies Describer & Entity
        expect(describer.describe()).toEqual(
            `The path to this ${DEntity.name} is d1`
        )

        const [alerter] = collection.find.all(Alerter)
        expect(alerter).toBeInstanceOf(Alerter)
        expect(alerter).toBeInstanceOf(Entity)
        alerter satisfies Entity & Alerter
    })

    test('can search for intersections of multiple non-relationals', () => {
        const alertDescribers = collection.find.all(Describer, Alerter)
        expect(alertDescribers).toEqual([collection.d3])

        const alertDescriber = collection.assert(Describer, Alerter)
        expect(alertDescriber).toBeInstanceOf(Entity)
        expect(alertDescriber).toBeInstanceOf(Describer)
        expect(alertDescriber).toBeInstanceOf(Alerter)
    })
})
