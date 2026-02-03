
import { DataSource } from "typeorm";
import { config } from "dotenv";
import * as allEntities from "@lib/database";
import { InboxSessionEntity } from "@lib/database";

config();

const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_DATABASE || "analytics_db",
  entities: [__dirname + "/../libs/database/src/entities/*.entity.ts"],
  synchronize: false,
});

async function main() {
  try {
    await AppDataSource.initialize();
    console.log("------------------------------------------");
    console.log("📊 AGENT ASSIGNMENT COUNTS (All Time)");
    console.log("------------------------------------------");

    const repo = AppDataSource.getRepository(InboxSessionEntity);
    
    // Group by agent and count
    const stats = await repo.createQueryBuilder("session")
        .select("session.assignedAgentId", "agentId")
        .addSelect("COUNT(*)", "count")
        .where("session.tenantId = :tenantId", { tenantId: '0486b793-bbeb-4490-9f6b-4d1704fb1244' })
        .andWhere("session.assignedAgentId IS NOT NULL")
        .groupBy("session.assignedAgentId")
        .orderBy("count", "ASC") // Lowest first (Priority)
        .getRawMany();

    if (stats.length === 0) {
        console.log("No assignments found.");
    } else {
        console.log("Agent ID                             | Total Assignments");
        console.log("-------------------------------------+------------------");
        stats.forEach((s: any) => {
            console.log(`${String(s.agentId).padEnd(36)} | ${s.count}`);
        });
        
        console.log("\n👉 PREDICTION: The next chat should go to the agent at the top of this list.");
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
    }
  }
}

main();
