const fs = require("fs");
const path = require("path");

const ROOT_DIR = "./modules"; // Change this to scan a different directory
const OUTPUT_FILE = "repo_architecture.md";

/**
 * Recursively scans a directory and generates its structure.
 * @param {string} dir - Directory to scan
 * @param {string} prefix - Current indentation level
 * @returns {string} - Formatted structure
 */
function scanDirectory(dir, prefix = "") {
  let structure = "";

  const items = fs.readdirSync(dir);
  items.forEach((item, index) => {
    const filePath = path.join(dir, item);
    const isLast = index === items.length - 1;
    const connector = isLast ? "└──" : "├──";

    if (fs.statSync(filePath).isDirectory()) {
      structure += `${prefix}${connector} 📂 ${item}\n`;
      structure += scanDirectory(filePath, prefix + (isLast ? "    " : "│   "));
    } else {
      const status = item.endsWith(".ts") ? "✅ (Migrated)" : item.endsWith(".js") ? "❌ (Unmigrated)" : "";
      structure += `${prefix}${connector} 📜 ${item} ${status}\n`;
    }
  });

  return structure;
}

// Generate architecture
const repoStructure = `# Repository Architecture - lib-jitsi-meet\n\n${scanDirectory(ROOT_DIR)}`;

// Save to Markdown file
fs.writeFileSync(OUTPUT_FILE, repoStructure);
console.log(`✅ Repository architecture saved to ${OUTPUT_FILE}`);
