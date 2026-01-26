import mongoose from "mongoose"

// Initialize automatic cascading deletes between Mongoose models.
// This inspects all registered models for `ref` usages and attaches
// middleware on the referenced model to remove dependent documents when
// the referenced documents are deleted. Works for `findOneAndDelete`,
// `remove()` and `deleteMany()` patterns.

export default function initCascade() {
    const models = mongoose.models

    // Build reverse map: referencedModelName -> [{ modelName, path }]
    const reverseMap = {}

    Object.keys(models).forEach((modelName) => {
        const model = models[modelName]
        if (!model || !model.schema) return

        const schema = model.schema

        // Walk schema.paths for direct refs
        Object.keys(schema.paths).forEach((pathName) => {
            const path = schema.paths[pathName]
            const opts = path && path.options
            if (opts && opts.ref) {
                reverseMap[opts.ref] = reverseMap[opts.ref] || []
                reverseMap[opts.ref].push({ modelName, path: pathName })
            }

            // Handle arrays of ObjectId: caster.options.ref
            if (path && path.caster && path.caster.options && path.caster.options.ref) {
                reverseMap[path.caster.options.ref] = reverseMap[path.caster.options.ref] || []
                reverseMap[path.caster.options.ref].push({ modelName, path: pathName })
            }
        })
    })

    const attachHandlers = (refModelName, refs) => {
        const refModel = mongoose.models[refModelName]
        if (!refModel) {
            console.warn(`Cascade: referenced model ${refModelName} not found`)
            return
        }

        const schema = refModel.schema

        const cascadeForDoc = async (doc) => {
            if (!doc) return
            const id = doc._id

            for (const { modelName, path } of refs) {
                const targetModel = mongoose.models[modelName]
                if (!targetModel) continue

                try {
                    // If the path stores arrays or single ObjectId, delete any matching docs
                    const q = { [path]: id }
                    await targetModel.deleteMany(q)
                    // Also attempt to remove where id is inside arrays (defensive)
                    await targetModel.deleteMany({ [path]: { $in: [id] } })
                    console.log(`Cascade: removed documents in ${modelName} where ${path} references ${refModelName}(${id})`)
                } catch (err) {
                    console.error(`Cascade error for ${modelName}.${path}:`, err)
                }
            }
        }

        // When model is deleted via findOneAndDelete / findByIdAndDelete
        schema.post("findOneAndDelete", async function (doc) {
            await cascadeForDoc(doc)
        })

        // Document remove (doc.remove())
        schema.post("remove", async function (doc) {
            await cascadeForDoc(doc)
        })

        // deleteOne on document
        schema.post("deleteOne", { document: true, query: false }, async function (doc) {
            await cascadeForDoc(doc)
        })

        // Handle deleteMany: capture filter in pre, then post fetch deleted ids and cascade
        schema.pre("deleteMany", { document: false, query: true }, function (next) {
            this._cascadeFilter = this.getFilter ? this.getFilter() : {}
            next()
        })

        schema.post("deleteMany", { document: false, query: true }, async function () {
            try {
                const filter = this._cascadeFilter || {}
                const docs = await refModel.find(filter).select("_id").lean()
                for (const d of docs) await cascadeForDoc(d)
            } catch (err) {
                console.error("Cascade deleteMany error:", err)
            }
        })
    }

    Object.entries(reverseMap).forEach(([refName, refs]) => attachHandlers(refName, refs))

    console.log("Cascade initializer registered for models:", Object.keys(reverseMap))
}
