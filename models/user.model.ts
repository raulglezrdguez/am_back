import mongoose from "mongoose";

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

// Dominio explícito: 0=ADMIN, 1=USER, 2=...
export const USER_ROLES = [0, 1] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = [0, 1] as const; // 0=INACTIVE, 1=ACTIVE
export type UserStatus = (typeof USER_STATUSES)[number];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: Number,
      required: true,
      default: 1,
      enum: {
        values: USER_ROLES as unknown as number[],
        message: `role must be one of ${USER_ROLES.join(", ")}`,
      },
    },
    status: {
      type: Number,
      required: true,
      default: 1,
      enum: {
        values: USER_STATUSES as unknown as number[],
        message: `status must be one of ${USER_STATUSES.join(", ")}`,
      },
    },
    password: { type: String, required: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
