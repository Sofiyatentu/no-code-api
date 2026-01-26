import mongoose from "mongoose"
import { User } from "../auth/models.js"
import { Admin } from "./models.js"
import dotenv from "dotenv"

dotenv.config()

const seedAdminUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://no-code:no-code@cluster0.oglke5q.mongodb.net/api-builder")

    // Check if super admin exists
    const existingAdmin = await User.findOne({ email: "admin@example.com" })
    if (existingAdmin) {
      console.log("Super admin already exists")
      process.exit(0)
    }

    // Create super admin user
    const adminUser = new User({
      email: "admin@example.com",
      username: "admin",
      password: "admin123456", // Change this in production
      firstName: "Admin",
      lastName: "User",
    })

    await adminUser.save()

    // Create admin record
    await Admin.create({
      userId: adminUser._id,
      role: "super_admin",
      permissions: [
        "manage_users",
        "manage_projects",
        "manage_flows",
        "manage_quotas",
        "manage_system",
        "view_analytics",
        "view_audit_logs",
      ],
    })

    console.log("Super admin created successfully")
    console.log("Email: admin@example.com")
    console.log("Password: admin123456")
    process.exit(0)
  } catch (error) {
    console.error("Error seeding admin:", error)
    process.exit(1)
  }
}

seedAdminUser()
