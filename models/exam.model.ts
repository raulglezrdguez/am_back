import mongoose from "mongoose";

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const operators = ["==", "!=", "<", ">", "<=", ">="];
const answers = ["RADIO", "TEXT", "NUMBER"];

const AnswerOption = new Schema({
  id: { type: String, required: true },
  value: { type: String, required: true },
  content: { type: String, required: true },
});

const expressionSchema = new Schema(
  {
    id: { type: String, required: true },
    operator: { type: String, enum: operators, required: true },
    value: {
      type: Schema.Types.Mixed,
      required: true,
      validate: {
        validator(v: any) {
          const ok =
            ["string", "boolean", "number"].includes(typeof v) &&
            (typeof v !== "number" || Number.isFinite(v)); // rechaza NaN
          return ok;
        },
        message: "value must be String, Boolean or finite Number",
      },
    },
    label: { type: String, required: true },
    reference: { type: String, required: false, default: "" },
    variable: { type: String, required: true },
  },
  { _id: false }
);

const questionSchema = new Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    expression: { type: expressionSchema, required: true },
    answer: { type: String, enum: answers, required: true },
    reference: { type: String, required: false },
    answers: { type: [AnswerOption], required: false },
  },
  { _id: false }
);

const examSchema = new Schema(
  {
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
    instructions: { type: String, required: true },
    description: { type: String, required: true },
    author: { type: ObjectId, ref: "User", required: true },
    year: { type: Number, required: true },
    public: { type: Boolean, required: true, default: false },
    expression: { type: [expressionSchema], required: true, default: [] },
    questions: { type: [questionSchema], required: true, default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

examSchema.index({ author: 1 });

export default mongoose.model("Exam", examSchema);
