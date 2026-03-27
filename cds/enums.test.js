'use strict'

const cds = require('@sap/cds')
const { loadModel } = require('./helpers/model')
const { expectCqn, expect } = require('./helpers/expectCqn')

let cqn4sql = require('../../lib/cqn4sql')

describe('enums', () => {
  before(async () => {
    const m = await loadModel({}, __dirname + '/model/enums')
    const orig = cqn4sql
    cqn4sql = q => orig(q, m)
  })

  describe('in where clause', () => {
    it('resolves string enum in comparison', () => {
      const q = cds.ql`SELECT from enums.Orders as Orders { Orders.id } where Orders.status = #open`
      const expected = cds.ql`SELECT from enums.Orders as Orders { Orders.id } where Orders.status = 'O'`
      expectCqn(cqn4sql(q)).to.equal(expected)
    })

    it('resolves integer enum in comparison', () => {
      const q = cds.ql`SELECT from enums.Orders as Orders { Orders.id } where Orders.priority = #high`
      const expected = cds.ql`SELECT from enums.Orders as Orders { Orders.id } where Orders.priority = 3`
      expectCqn(cqn4sql(q)).to.equal(expected)
    })

    it('resolves enum on left-hand side of comparison', () => {
      const q = cds.ql`SELECT from enums.Orders as Orders { Orders.id } where #low = Orders.priority`
      const expected = cds.ql`SELECT from enums.Orders as Orders { Orders.id } where 1 = Orders.priority`
      expectCqn(cqn4sql(q)).to.equal(expected)
    })

    it('resolves string enum where symbol name equals value', () => {
      const q = cds.ql`SELECT from enums.Orders as Orders { Orders.id } where Orders.category = #book`
      const expected = cds.ql`SELECT from enums.Orders as Orders { Orders.id } where Orders.category = 'book'`
      expectCqn(cqn4sql(q)).to.equal(expected)
    })

    it('resolves multiple enums in logical expression', () => {
      const q = cds.ql`SELECT from enums.Orders as Orders { Orders.id }
        where Orders.priority = #low and Orders.status = #closed`
      const expected = cds.ql`SELECT from enums.Orders as Orders { Orders.id }
        where Orders.priority = 1 and Orders.status = 'C'`
      expectCqn(cqn4sql(q)).to.equal(expected)
    })

    it('resolves enum with != operator', () => {
      const q = cds.ql`SELECT from enums.Orders as Orders { Orders.id } where Orders.priority != #critical`
      const expected = cds.ql`SELECT from enums.Orders as Orders { Orders.id } where Orders.priority != 4`
      expectCqn(cqn4sql(q)).to.equal(expected)
    })
  })

  describe('in lists', () => {
    it('resolves enums in IN list', () => {
      const q = cds.ql`SELECT from enums.Orders as Orders { Orders.id }
        where Orders.priority in (#low, #medium, #high)`
      const expected = cds.ql`SELECT from enums.Orders as Orders { Orders.id }
        where Orders.priority in (1, 2, 3)`
      expectCqn(cqn4sql(q)).to.equal(expected)
    })

    it('resolves string enums in IN list', () => {
      const q = cds.ql`SELECT from enums.Orders as Orders { Orders.id }
        where Orders.status in (#open, #closed)`
      const expected = cds.ql`SELECT from enums.Orders as Orders { Orders.id }
        where Orders.status in ('O', 'C')`
      expectCqn(cqn4sql(q)).to.equal(expected)
    })
  })

  describe('in case expressions', () => {
    it('resolves enums in case when discriminant', () => {
      const q = cds.ql`SELECT from enums.Orders as Orders {
        Orders.id,
        case Orders.priority
          when #low then 'Low'
          when #medium then 'Medium'
          else 'High'
        end as label
      }`
      const expected = cds.ql`SELECT from enums.Orders as Orders {
        Orders.id,
        case Orders.priority
          when 1 then 'Low'
          when 2 then 'Medium'
          else 'High'
        end as label
      }`
      expectCqn(cqn4sql(q)).to.equal(expected)
    })

    it('resolves enums in case when condition', () => {
      const q = cds.ql`SELECT from enums.Orders as Orders {
        Orders.id,
        case when Orders.priority = #low then 'Low'
             when Orders.priority = #high then 'High'
             else 'Other'
        end as label
      }`
      const expected = cds.ql`SELECT from enums.Orders as Orders {
        Orders.id,
        case when Orders.priority = 1 then 'Low'
             when Orders.priority = 3 then 'High'
             else 'Other'
        end as label
      }`
      expectCqn(cqn4sql(q)).to.equal(expected)
    })
  })

  describe('with cast', () => {
    // When an operand is cast to an enum type (e.g. cast(id as Priority)), the plain
    // element has no enum type of its own.  findEnumDefinition must therefore look at the
    // cast.type of neighbor tokens to discover the enum.

    it('resolves enum when the adjacent ref is cast to an enum type (enum on RHS)', () => {
      // cast(Orders.id as enums.Priority) supplies the enum for #high on the right;
      // the enum type itself is also resolved to the underlying scalar type (cds.Integer)
      const q = cds.ql`SELECT from enums.Orders as Orders { Orders.id }
        where cast(Orders.id as enums.Priority) = #high`
      const expected = cds.ql`SELECT from enums.Orders as Orders { Orders.id }
        where cast(Orders.id as cds.Integer) = 3`
      expectCqn(cqn4sql(q)).to.equal(expected)
    })

    it('resolves enum when the adjacent ref is cast to an enum type (enum on LHS)', () => {
      // cast(Orders.id as enums.Priority) supplies the enum for #low on the left;
      // the enum type itself is also resolved to the underlying scalar type (cds.Integer)
      const q = cds.ql`SELECT from enums.Orders as Orders { Orders.id }
        where #low = cast(Orders.id as enums.Priority)`
      const expected = cds.ql`SELECT from enums.Orders as Orders { Orders.id }
        where 1 = cast(Orders.id as cds.Integer)`
      expectCqn(cqn4sql(q)).to.equal(expected)
    })

    it('resolves enum whose own cast provides the enum type, and preserves the cast', () => {
      // cast(#high as enums.Priority) — the cast both supplies the enum definition
      // and must be kept on the output so that cqn2sql emits CAST(3 AS INTEGER).
      // The enum type name is also resolved to the underlying scalar type (cds.Integer).
      const q = cds.ql`SELECT from enums.Orders as Orders { Orders.id }
        where cast(#high as enums.Priority) = Orders.priority`
      const expected = cds.ql`SELECT from enums.Orders as Orders { Orders.id }
        where cast(3 as cds.Integer) = Orders.priority`
      expectCqn(cqn4sql(q)).to.equal(expected)
    })
  })

  describe('error cases', () => {
    it('throws for unresolvable enum reference', () => {
      // No adjacent ref with an enum type to look up the symbol in
      const q = cds.ql`SELECT from enums.Orders as Orders { Orders.id } where #unknown = 1`
      expect(() => cqn4sql(q)).to.throw(/Can't resolve enum value/)
    })

    it('throws for unknown enum symbol', () => {
      // Context ref found (Orders.priority has enum type) but symbol doesn't exist in it
      const q = cds.ql`SELECT from enums.Orders as Orders { Orders.id } where Orders.priority = #nonexistent`
      expect(() => cqn4sql(q)).to.throw(/Unknown enum symbol "#nonexistent"/)
    })
  })
})
