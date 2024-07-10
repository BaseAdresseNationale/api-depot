import { Schema, model, connect } from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

// 1. Create an interface representing a document in MongoDB.
interface IRevision {
  _id: any;
  codeCommune: string;
  validation: any;
  createdAt: Date;
  status: string;
}

// 2. Create a Schema corresponding to the document interface.
const revisionsSchema = new Schema<IRevision>({
  _id: { type: Object },
  codeCommune: { type: String },
  status: { type: String },
  validation: { type: Object },
  createdAt: { type: Date },
});

// 3. Create a Model.
const Revision = model<IRevision>('revisions', revisionsSchema);

async function run() {
  // 4. Connect to MongoDB
  await connect(`${process.env.MONGODB_URL}/${process.env.MONGODB_DBNAME}`);
  // Récupère les révision depuis la migration nestJs
  const revisions = await Revision.find({
    createdAt: { $gte: new Date('2024-07-01T00:00:00.000Z') },
    validation: { $exists: true },
  }).lean();
  for (const revision of revisions) {
    // Récupère la reivision précédente
    const prevRevision = await Revision.findOne({
      codeCommune: revision.codeCommune,
      createdAt: { $lt: revision.createdAt },
      status: 'published',
    })
      .sort({ createdAt: -1 })
      .lean();
    if (prevRevision.validation && revision.validation) {
      const prevNbRows = prevRevision?.validation?.rowsCount || 0;
      const newNbRows = revision?.validation?.rowsCount || 0;
      // Check si il y a eu pluys de 20% de suppression
      if (prevNbRows * 0.2 < prevNbRows - newNbRows) {
        await Revision.updateOne(
          { _id: revision._id },
          {
            $push: { 'validation.warnings': 'rows.delete_many_addresses' },
          },
        );
      } else {
        await Revision.updateOne(
          { _id: revision._id },
          {
            $pull: { 'validation.warnings': 'rows.delete_many_addresses' },
          },
        );
      }
    }
  }

  process.exit(1);
}

run().catch((err) => console.log(err));
