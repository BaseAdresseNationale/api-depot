const {groupBy, mapValues} = require('lodash')
const {format, compareDesc, add, endOfDay} = require('date-fns')

const clientsToMonitor = {
  mesAdresses: 'mes-adresses',
  moissonneur: 'moissonneur-bal'
}

function getCumulFirstRevisionsByDate(firstRevisions, dates) {
  const cumulFirstRevisionsByDate = []
  for (
    let dateIterator = endOfDay(new Date(dates.from.getTime()));
    compareDesc(dateIterator, endOfDay(dates.to)) >= 0;
    dateIterator = add(dateIterator, {days: 1})
  ) {
    const dailyCreations = firstRevisions.filter(firstRevision => compareDesc(firstRevision.publishedAt, dateIterator) === 1)
    cumulFirstRevisionsByDate.push({
      date: format(dateIterator, 'yyyy-MM-dd'),
      totalCreations: dailyCreations.length,
      viaMesAdresses: dailyCreations.filter(({client}) => client.id === clientsToMonitor.mesAdresses).length,
      viaMoissonneur: dailyCreations.filter(({client}) => client.id === clientsToMonitor.moissonneur).length
    })
  }

  return cumulFirstRevisionsByDate
}

function getBalsByDays(revisions) {
  const revisionsGroupByDays = groupBy(revisions, revision =>
    format(revision.publishedAt, 'yyyy-MM-dd')
  )
  return Object.entries(revisionsGroupByDays).map(([date, revisions]) => {
    const revisionsGroupByBals = groupBy(revisions, revision =>
      revision.codeCommune
    )
    return {
      date,
      publishedBAL: mapValues(revisionsGroupByBals, revisionsByBal => ({
        total: revisionsByBal.length,
        viaMesAdresses: revisionsByBal.filter(({client}) => client.id === clientsToMonitor.mesAdresses).length,
        viaMoissonneur: revisionsByBal.filter(({client}) => client.id === clientsToMonitor.moissonneur).length
      }))
    }
  })
}

module.exports = {
  getBalsByDays,
  getCumulFirstRevisionsByDate,
  clientsToMonitor
}
