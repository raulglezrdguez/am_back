import mongoose from "mongoose";

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const statSchema = new Schema(
  {
    exam: { type: ObjectId, ref: "Exam", required: true },
    patient: { type: ObjectId, ref: "Patient", required: true },
    author: { type: ObjectId, ref: "User", required: true },
    completedAt: { type: Date, required: true },
    result: {
      value: { type: String, required: true },
      text: { type: String, required: true },
    },
    answers: [
      {
        id: { type: String, required: true },
        answer: { type: String, required: true },
      },
    ],
    address: { type: String, required: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

statSchema.index({ author: 1, completedAt: -1 }); // listados por autor
statSchema.index({ exam: 1, completedAt: -1 }); // stats por examen
statSchema.index({ patient: 1, completedAt: -1 }); // stats por paciente
statSchema.index({ completedAt: -1 }); // listado global admin

export default mongoose.model("Stat", statSchema);
