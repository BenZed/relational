import { fail } from '@benzed/util'
import { Traits, trait } from '@benzed/traits'

import { test, expect, describe } from '@jest/globals'

import { Find, FindFlag } from './find'
import { Relational } from './relational'
import { PublicRelational } from './relationals'
import { isFunc, isShapeOf } from '@benzed/types'

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

    test('inDescendantsExcept', () => {
        const find = new Find(grandPa)
        expect(find.all.inDescendantsExcept(grandPa.mom)()).toEqual([
            grandPa.mom,
            grandPa.uncle
        ])
    })

    test('inDescendantsFiltered', () => {
        const find = new Find(grandPa)
        expect(
            find.all.inDescendantsFiltered(i => i !== grandPa.mom)()
        ).toEqual([grandPa.mom, grandPa.uncle])
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

describe('inHierarchy', () => {
    test('inHierarchy should find the source node', () => {
        const find = new Find(you)
        expect(find.inHierarchy(grandPa.mom.you)).toBe(grandPa.mom.you)
    })

    test('inHierarchy should find a direct child node', () => {
        const find = new Find<Relational>(you)
        expect(find.inHierarchy(grandPa.mom.you.son)).toBe(grandPa.mom.you.son)
    })

    test('inHierarchy should find a deeper descendant node', () => {
        const find = new Find<Relational>(you)
        expect(
            find.inHierarchy(grandPa.mom.you.son.grandDaughter.greatGrandSon)
        ).toBe(grandPa.mom.you.son.grandDaughter.greatGrandSon)
    })

    test('inHierarchy should not find a node outside of the subtree', () => {
        const find = new Find<Relational>(you)
        expect(find.inHierarchy(new Person())).toBe(undefined)
    })
})

describe('or', () => {
    test('find.or.inParents() returns grandPa.mom.you or grandPa.uncle', () => {
        const find = new Find<Relational>(you)
        const result = find.inChildren.or.inSiblings(grandPa.mom.sister)

        expect(result).toBe(grandPa.mom.sister)
    })

    test('find.or.inAncestors() returns grandPa', () => {
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
        expect(() => find.inChildren(fail)).toThrow('mom/you could not find')
    })

    test('assert should allow custom error message', () => {
        const customErrorMessage = 'Node not found'
        const find = new Find(you, FindFlag.Assert)
        expect(() => find.inDescendants(fail, customErrorMessage)).toThrow(
            customErrorMessage
        )
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
            return Relational.find<Entity>(this)
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

    test('can search for non-relationals', () => {
        @trait
        abstract class Describer {
            static readonly is = isShapeOf<Describer>({
                describe: isFunc
            })

            abstract describe(): string
        }

        class DescribedEntity extends Traits.add(Entity, Describer) {
            describe(): string {
                return `The path to this ${
                    this.constructor.name
                } is ${Relational.getPath(this)}`
            }
        }

        class Collection extends Entity {
            d1 = new DescribedEntity()
            d2 = new DescribedEntity()
            e1 = new Entity()
        }

        const collection = new Collection()

        const [describer] = collection.find.all(Describer)

        expect(describer).toBeInstanceOf(Describer)
        expect(describer).toBeInstanceOf(Entity)
        describer satisfies Describer & Entity
        expect(describer.describe()).toEqual(
            `The path to this ${DescribedEntity.name} is d1`
        )
    })

    test('optional discrimination', () => {
        class DuplexEntity extends Entity {
            left = new Entity()
            right = new Entity()
        }

        class Entities extends Entity {
            d1 = new DuplexEntity()
            d2 = new DuplexEntity()
            s1 = new Entity()

            get findDupe(): Find<DuplexEntity, DuplexEntity> {
                return Relational.find<DuplexEntity, DuplexEntity>(this)
            }
        }

        const entities = new Entities()

        expect(entities.findDupe(entities.d1)).toBe(entities.d1)
        expect(entities.findDupe(DuplexEntity)).toBe(entities.d1)

        // @ts-expect-error not allowed
        entities.findDupe(Entity)
    })
})
