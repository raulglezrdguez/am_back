import mongoose from "mongoose";

const { Schema } = mongoose;
const ObjectId = Schema.ObjectId;

const Result = new Schema(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
    reference: { type: String, required: false },
  },
  { _id: false }
);

const DiagramSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    author: {
      type: ObjectId,
      ref: "User",
      required: true,
    },

    public: { type: Boolean, required: true, default: false },

    result: { type: [Result], required: false },

    nodes: {
      type: [{}],
      default: [],
      required: true,
    },

    edges: {
      type: [{}],
      default: [],
      required: true,
    },

    viewport: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      zoom: { type: Number, default: 1 },
    },
  },
  { timestamps: true }
);

DiagramSchema.index({ author: 1 });

DiagramSchema.index({ "nodes.type": 1 });
/** ejemplo de uso:
 * const diagrams = await Diagram.find({
        'nodes.type': 'gemini'
    });
 */
DiagramSchema.index({ "nodes.data.label": 1 });
/** ejemplo de uso:
 * const diagrams = await Diagram.find({
        nodes: {
            $elemMatch: { // Ambos criterios deben coincidir en UN SOLO nodo
                type: 'questionNode',
                'data.label': 'Edad' 
            }
        }
    });
 */

export default mongoose.model("Diagram", DiagramSchema);
