import Traits from '@benzed/traits'
import { $$children, getChildren } from './children'

import { test, expect } from '@jest/globals'
import Relational from './relational'
import { nil, pick } from '@benzed/types'
import { getParent } from './parent'

//// Setup ////

class Number extends Traits(Relational) {
    constructor(readonly value: number) {
        super()
        return Relational.apply(this)
    }
}

class Numbers extends Traits(Relational) {
    constructor() {
        super()
        return Relational.apply(this)
    }

    one = new Number(1)

    two = new Number(2)

    three = new Number(3)

    four = new Number(4)
}

class Evens extends Numbers {
    [$$children]() {
        return pick(this, 'two', 'four')
    }
}

//// Tests ////

let evens: Evens
let numbers: Numbers
beforeEach(() => {
    evens = new Evens()
    numbers = new Numbers()
})

test(getChildren, () => {
    const children = getChildren(numbers)
    expect(children).toEqual({
        one: new Number(1),
        two: new Number(2),
        three: new Number(3),
        four: new Number(4)
    })

    expect(getParent(numbers.one)).toBe(numbers)
    expect(getParent(numbers.two)).toBe(numbers)
    expect(getParent(numbers.three)).toBe(numbers)
    expect(getParent(numbers.four)).toBe(numbers)
})

test(getChildren.name + ' custom override', () => {
    const children = getChildren(evens)
    expect(children).toEqual({
        two: new Number(2),
        four: new Number(4)
    })

    expect(getParent(evens.one)).toBe(nil)
    expect(getParent(evens.three)).toBe(nil)
})
