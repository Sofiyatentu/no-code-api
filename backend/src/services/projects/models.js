import mongoose from "mongoose"

const projectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true, // For fast lookups by user
    },
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      minlength: [2, "Project name must be at least 2 characters"],
      maxlength: [100, "Project name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      required: [true, "Project slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/g, "Slug can only contain lowercase letters, numbers, and hyphens"],
      validate: {
        validator: function (v) {
          return v.length >= 3 && v.length <= 60
        },
        message: "Slug must be between 3 and 60 characters",
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    mongoUri: {
      type: {
        iv: String,
        content: String,
        authTag: String,
      },
      required: true,
      select: false, // CRITICAL
    },
    status: {
      type: String,
      enum: {
        values: ["draft", "active", "archived"],
        message: "Status must be draft, active, or archived",
      },
      default: "draft",
    },
    baseUrl: {
      type: String,
      trim: true,
      sparse: true, // Allows multiple nulls + unique constraint
      validate: {
        validator: function (v) {
          if (!v) return true
          return /^https?:\/\/.+/i.test(v)
        },
        message: "Base URL must be a valid HTTP/HTTPS URL",
      },
    },
    // Future-proof fields
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    stats: {
      requestsToday: { type: Number, default: 0 },
      totalRequests: { type: Number, default: 0 },
      lastRequestAt: { type: Date },
    },
  },
  {
    timestamps: true, // Automatically adds createdAt & updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// === Indexes for Performance ===
// 1. User + slug (unique per user)
projectSchema.index({ userId: 1, slug: 1 }, { unique: true })

// 2. Find all projects by user (fast dashboard load)
projectSchema.index({ userId: 1, createdAt: -1 })

// 3. Search by name/slug (for future search)
projectSchema.index({ name: "text", slug: "text" })

// 4. Status filtering
projectSchema.index({ status: 1 })

// === Pre-save Middleware ===
// Auto-generate slug from name if not provided
projectSchema.pre("save", async function () {
  // No 'next' needed!
  if (this.isModified("name") || this.isNew) {
    let baseSlug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-+|-+$)/g, "")

    if (!baseSlug) baseSlug = "project"

    let slug = baseSlug
    let counter = 0

    while (await this.constructor.exists({ userId: this.userId, slug })) {
      slug = `${baseSlug}-${++counter}`
    }

    this.slug = slug
  }
})

// === Virtuals ===
projectSchema.virtual("endpointCount").get(function () {
  // Placeholder — populate from endpoints collection later
  return 0
})

// === Instance Methods ===
projectSchema.methods.toClient = function () {
  const obj = this.toObject()

  // Never expose mongoUri in API responses
  delete obj.mongoUri
  delete obj.__v

  return obj
}

// === Static Methods ===
projectSchema.statics.findByUserSlug = function (userId, slug) {
  return this.findOne({ userId, slug })
}

export const Project = mongoose.model("Project", projectSchema)