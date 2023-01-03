const {MongoClient, ObjectId} = require('mongodb')

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost'
const MONGODB_DBNAME = process.env.MONGODB_DBNAME || 'api-depot'

class Mongo {
  async connect(connectionString) {
    if (this.db) {
      throw new Error('mongo.connect() must not be called twice')
    }

    this.client = new MongoClient(connectionString || MONGODB_URL)
    await this.client.connect()
    this.dbName = MONGODB_DBNAME
    this.db = this.client.db(this.dbName)

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

    await this.db.collection('diff_bal').createIndex({revisionId: 1})
  }

  async disconnect(force) {
    const {client} = this
    this.client = undefined
    this.db = undefined
    return client.close(force)
  }

  parseObjectID(string) {
    try {
      return new ObjectId(string)
    } catch {
      return null
    }
  }

  decorateCreation(obj) {
    const now = new Date()
    obj._createdAt = now
    obj._updatedAt = now
  }

  decorateModification(obj) {
    obj._updatedAt = new Date()
  }

  async touchDocument(collectionName, id, date = new Date()) {
    await this.db.collection(collectionName).updateOne(
      {_id: this.parseObjectID(id)},
      {$set: {_updatedAt: date}}
    )
  }
}

module.exports = new Mongo()
module.exports.ObjectId = ObjectId
