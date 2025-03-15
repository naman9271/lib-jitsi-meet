const fs = require('fs');
const path = require('path');

const DIRECTORY_TO_SCAN = './modules';

const SMALL_FILE = 'migration_small.md';
const MEDIUM_FILE = 'migration_medium.md';
const LARGE_FILE = 'migration_large.md';

const countLines = (filePath) => {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content.split('\n').length;
    } catch (err) {
        console.error(`Error reading file: ${filePath}`);
        return 0;
    }
};

const categorizeFiles = (dir) => {
    let smallFiles = [];
    let mediumFiles = [];
    let largeFiles = [];

    const scanDir = (currentPath) => {
        fs.readdirSync(currentPath).forEach(file => {
            const filePath = path.join(currentPath, file);
            if (fs.statSync(filePath).isDirectory()) {
                scanDir(filePath);
            } else if (file.endsWith('.js')) {  // Only include .js files
                const lines = countLines(filePath);
                const relativePath = path.relative(DIRECTORY_TO_SCAN, filePath);

                if (lines < 150) {
                    smallFiles.push({ file: relativePath, lines });
                } else if (lines < 700) {
                    mediumFiles.push({ file: relativePath, lines });
                } else {
                    largeFiles.push({ file: relativePath, lines });
                }
            }
        });
    };

    scanDir(dir);

    return { smallFiles, mediumFiles, largeFiles };
};

const generateMarkdown = (fileName, category, files) => {
    let markdown = `# ${category} Migration Status\n\n`;
    markdown += `| File Path | Lines |\n`;
    markdown += `|-----------|-------|\n`;

    files.forEach(({ file, lines }) => {
        markdown += `| ${file} | ${lines} |\n`;
    });

    fs.writeFileSync(fileName, markdown);
    console.log(`${fileName} created successfully.`);
};

const { smallFiles, mediumFiles, largeFiles } = categorizeFiles(DIRECTORY_TO_SCAN);

generateMarkdown(SMALL_FILE, 'Small Files', smallFiles);
generateMarkdown(MEDIUM_FILE, 'Medium Files', mediumFiles);
generateMarkdown(LARGE_FILE, 'Large Files', largeFiles);
