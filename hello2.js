const fs = require("fs");
const path = require("path");

const ROOT_DIR = "./service"; // Change this to scan a different directory
const OUTPUT_FILE = "repo3_architecture.md";

/**
 * Recursively scans a directory, generates its structure, and calculates migration percentage.
 * @param {string} dir - Directory to scan
 * @param {string} prefix - Current indentation level
 * @returns {object} - Formatted structure and migration data
 */
function scanDirectory(dir, prefix = "") {
  let structure = "";
  let migratedCount = 0,
    totalCount = 0;

  const items = fs.readdirSync(dir);
  items.forEach((item, index) => {
    const filePath = path.join(dir, item);
    const isLast = index === items.length - 1;
    const connector = isLast ? "└──" : "├──";

    if (fs.statSync(filePath).isDirectory()) {
      const subDir = scanDirectory(filePath, prefix + (isLast ? "    " : "│   "));
      const percentage = getPercentage(subDir.migratedCount, subDir.totalCount);
      structure += `${prefix}${connector} 📂 ${item} - ${percentage}% migrated\n`;
      structure += subDir.structure;
      migratedCount += subDir.migratedCount;
      totalCount += subDir.totalCount;
    } else {
      const isMigrated = item.endsWith(".ts");
      const status = isMigrated ? "✅ (Migrated)" : item.endsWith(".js") ? "❌ (Unmigrated)" : "";
      structure += `${prefix}${connector} 📜 ${item} ${status}\n`;
      totalCount++;
      if (isMigrated) migratedCount++;
    }
  });

  return { structure, migratedCount, totalCount };
}

/**
 * Calculates the migration percentage
 * @param {number} migrated - Number of migrated files
 * @param {number} total - Total number of files
 * @returns {string} - Percentage migrated
 */
function getPercentage(migrated, total) {
  if (total === 0) return "0";
  return ((migrated / total) * 100).toFixed(1);
}

// Generate architecture
const result = scanDirectory(ROOT_DIR);
const overallPercentage = getPercentage(result.migratedCount, result.totalCount);
const repoStructure = `# Repository Architecture - lib-jitsi-meet\n\n📂 Root - ${overallPercentage}% migrated\n\n${result.structure}`;

// Save to Markdown file
fs.writeFileSync(OUTPUT_FILE, repoStructure);
console.log(`✅ Repository architecture saved to ${OUTPUT_FILE}`);
