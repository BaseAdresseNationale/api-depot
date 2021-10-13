const {MongoClient, ObjectID} = require('mongodb')

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost'
const MONGODB_DBNAME = process.env.MONGODB_DBNAME || 'api-depot'

class Mongo {
  async connect(connectionString) {
    if (this.db) {
      throw new Error('mongo.connect() must not be called twice')
    }

    this.client = await MongoClient.connect(connectionString || MONGODB_URL, {
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
    await this.db.collection('revisions').createIndex({current: 1})

    await this.db.collection('habilitations').createIndex({codeCommune: 1})

    await this.db.collection('files').createIndex({revisionId: 1})
  }

  async disconnect(force) {
    const {client} = this
    this.client = undefined
    this.db = undefined
    return client.close(force)
  }

  parseObjectID(string) {
    try {
      return new ObjectID(string)
    } catch {
      return null
    }
  }
}

module.exports = new Mongo()
module.exports.ObjectID = ObjectID
