import fs from "node:fs/promises";
import path from "node:path";
import { exportStaticDataset } from "../src/static-export.js";

const sourceFile = path.resolve(process.argv[2] || "data/cache.json");
const dataset = JSON.parse(await fs.readFile(sourceFile, "utf8"));
const result = await exportStaticDataset(dataset);

console.log(JSON.stringify({ level: "info", message: "Static JSON exported", sourceFile, ...result }));

