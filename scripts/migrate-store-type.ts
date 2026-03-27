import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../db/index.js";
import { products, heroImages, lookbookItems, categories } from "../db/schema.js";

async function main() {
    console.log("Migrating storeType to 'streetwear' for all records...");

    await db.update(products).set({ storeType: "streetwear" });
    await db.update(heroImages).set({ storeType: "streetwear" });
    await db.update(lookbookItems).set({ storeType: "streetwear" });
    await db.update(categories).set({ storeType: "streetwear" });

    console.log("Migration complete!");
    process.exit(0);
}

main().catch(console.error);
