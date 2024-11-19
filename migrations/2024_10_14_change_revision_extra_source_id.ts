import { Schema, model, connect, disconnect } from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

interface IClient {
  _id: any;
  id: any;
}

const clientsSchema = new Schema<IClient>({
  _id: { type: Object },
  id: { type: String },
});

const Client = model<IClient>('client', clientsSchema);

interface IRevision {
  _id: any;
  client: any;
  context: any;
}

const revisionsSchema = new Schema<IRevision>({
  _id: { type: Object },
  client: { type: Object },
  context: { type: Object },
});

const Revision = model<IRevision>('revisions', revisionsSchema);

async function run() {
  await connect(`${process.env.MONGODB_URL}/${process.env.MONGODB_DBNAME}`);
  const clientMoissonneur = await Client.findOne({
    id: 'moissonneur-bal',
  }).lean();

  const revisions = await Revision.find({
    client: clientMoissonneur._id,
  }).lean();

  for (const revision of revisions) {
    const sourceId = revision.context?.extras?.sourceId;
    if (sourceId) {
      const [, id] = sourceId.split(/-(.*)/s);
      if (id) {
        await Revision.updateOne(
          { _id: revision._id },
          {
            $set: { 'context.extras.sourceId': id.substring(0, 24) },
          },
        );
      }
    }
  }

  await disconnect();
  process.exit(1);
}

run().catch((err) => console.log(err));
