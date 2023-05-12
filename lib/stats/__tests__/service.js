const test = require('ava')
const {sub, format, startOfDay, endOfDay} = require('date-fns')
const StatsService = require('../service')

test('getCumulFirstRevisionsByDate', t => {
  const revisions = [
    {publishedAt: sub(new Date(), {days: 1}), client: {id: 'mes-adresses'}},
    {publishedAt: sub(new Date(), {days: 2}), client: {id: 'moissonneur-bal'}},
    {publishedAt: sub(new Date(), {days: 3}), client: {id: 'autre'}},
    {publishedAt: sub(new Date(), {days: 4}), client: {id: 'mes-adresses'}},
    {publishedAt: sub(new Date(), {days: 5}), client: {id: 'mes-adresses'}},
    {publishedAt: sub(new Date(), {days: 6}), client: {id: 'mes-adresses'}}
  ]
  const res = StatsService.getCumulFirstRevisionsByDate(revisions, {
    from: startOfDay(sub(new Date(), {days: 7})),
    to: endOfDay(new Date())
  })
  const resExpected = [
    {date: format(sub(new Date(), {days: 7}), 'yyyy-MM-dd'), totalCreations: 0, viaMesAdresses: 0, viaMoissonneur: 0},
    {date: format(sub(new Date(), {days: 6}), 'yyyy-MM-dd'), totalCreations: 1, viaMesAdresses: 1, viaMoissonneur: 0},
    {date: format(sub(new Date(), {days: 5}), 'yyyy-MM-dd'), totalCreations: 2, viaMesAdresses: 2, viaMoissonneur: 0},
    {date: format(sub(new Date(), {days: 4}), 'yyyy-MM-dd'), totalCreations: 3, viaMesAdresses: 3, viaMoissonneur: 0},
    {date: format(sub(new Date(), {days: 3}), 'yyyy-MM-dd'), totalCreations: 4, viaMesAdresses: 3, viaMoissonneur: 0},
    {date: format(sub(new Date(), {days: 2}), 'yyyy-MM-dd'), totalCreations: 5, viaMesAdresses: 3, viaMoissonneur: 1},
    {date: format(sub(new Date(), {days: 1}), 'yyyy-MM-dd'), totalCreations: 6, viaMesAdresses: 4, viaMoissonneur: 1},
    {date: format(sub(new Date(), {days: 0}), 'yyyy-MM-dd'), totalCreations: 6, viaMesAdresses: 4, viaMoissonneur: 1}
  ]
  t.is(res.length, 8)
  t.deepEqual(res, resExpected)
})

test('getBalsByDays', t => {
  const revisions = [
    {publishedAt: sub(new Date(), {days: 2}), codeCommune: '00000', client: {id: 'mes-adresses'}},
    {publishedAt: sub(new Date(), {days: 2}), codeCommune: '00000', client: {id: 'moissonneur-bal'}},
    {publishedAt: sub(new Date(), {days: 2}), codeCommune: '00000', client: {id: 'autre'}},
    {publishedAt: sub(new Date(), {days: 2}), codeCommune: '00001', client: {id: 'mes-adresses'}},
    {publishedAt: sub(new Date(), {days: 5}), codeCommune: '00001', client: {id: 'mes-adresses'}},
    {publishedAt: sub(new Date(), {days: 6}), codeCommune: '00001', client: {id: 'moissonneur-bal'}}
  ]
  const res = StatsService.getBalsByDays(revisions)
  const resExpected = [
    {
      date: format(sub(new Date(), {days: 2}), 'yyyy-MM-dd'),
      publishedBAL: {
        '00000': {
          total: 3,
          viaMesAdresses: 1,
          viaMoissonneur: 1
        },
        '00001': {
          total: 1,
          viaMesAdresses: 1,
          viaMoissonneur: 0
        }
      }
    },
    {
      date: format(sub(new Date(), {days: 5}), 'yyyy-MM-dd'),
      publishedBAL: {
        '00001': {
          total: 1,
          viaMesAdresses: 1,
          viaMoissonneur: 0
        }
      }
    },
    {
      date: format(sub(new Date(), {days: 6}), 'yyyy-MM-dd'),
      publishedBAL: {
        '00001': {
          total: 1,
          viaMesAdresses: 0,
          viaMoissonneur: 1
        }
      }
    }
  ]
  t.deepEqual(res, resExpected)
})

