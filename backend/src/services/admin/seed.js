import { query } from "../../config/db.js";
import dotenv from "dotenv";

dotenv.config();

const seedAdminUser = async () => {
  try {
    // Check if super admin exists
    const existingResult = await query(
      "SELECT id FROM users WHERE email = $1",
      ["admin@example.com"],
    );
    if (existingResult.rows.length > 0) {
      console.log("Super admin already exists");
      process.exit(0);
    }

    // Hash password
    const bcrypt = await import("bcryptjs");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("admin123456", salt);

    // Create super admin user
    const userResult = await query(
      `INSERT INTO users (email, username, password, first_name, last_name) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      ["admin@example.com", "admin", hashedPassword, "Admin", "User"],
    );
    const adminUser = userResult.rows[0];

    // Create admin record
    await query(
      `INSERT INTO admins (user_id, role, permissions) VALUES ($1, $2, $3)`,
      [
        adminUser.id,
        "super_admin",
        JSON.stringify([
          "manage_users",
          "manage_projects",
          "manage_flows",
          "manage_quotas",
          "manage_system",
          "view_analytics",
          "view_audit_logs",
        ]),
      ],
    );

    console.log("Super admin created successfully");
    console.log("Email: admin@example.com");
    console.log("Password: admin123456");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
};

seedAdminUser();
