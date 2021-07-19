const {MongoClient, ObjectID} = require('mongodb')

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost'
const MONGODB_DBNAME = process.env.MONGODB_DBNAME || 'api-push'

class Mongo {
  async connect() {
    if (this.db) {
      return
    }

    this.client = await MongoClient.connect(MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })

    this.db = this.client.db(MONGODB_DBNAME)

    await this.createIndexes()
  }

  async createIndexes() {
    await this.db.collection('revisions').createIndex({codeCommune: 1})
    await this.db.collection('revisions').createIndex({'client.name': 1})
    await this.db.collection('revisions').createIndex({status: 1})
    await this.db.collection('revisions').createIndex({publishedAt: 1})

    await this.db.collection('files').createIndex({revisionId: 1})
  }

  async disconnect(force) {
    return this.client.close(force)
  }
}

module.exports = new Mongo()
module.exports.ObjectID = ObjectID
