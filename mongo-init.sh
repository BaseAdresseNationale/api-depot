set -e

mongo <<EOF
db = db.getSiblingDB('${MONGODB_DBNAME}')

db.mandataires.insertMany([
  {
  "_id": "6464a846d8a3b451dba2f0d1",
  }
])

db.clients.insertMany([
 {
  "token": "xxxxxxxxxxxxxxx",
  "active": true,
  "mandataire": "6464a846d8a3b451dba2f0d1"
  }
])
EOF