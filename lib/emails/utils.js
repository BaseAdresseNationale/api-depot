function getApiUrl() {
  if (process.env.API_DEPOT_URL) {
    return process.env.API_DEPOT_URL
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('API_DEPOT_URL must be defined in production mode')
  }

  return 'http://api.domain.tld'
}

module.exports = {getApiUrl}
