const fs = require('fs');
const path = require('path');

// Directory containing the markdown files
const postsDir = 'source/_posts';

// Promotional text to insert
const promoText = `<!-- PROMO BLOCK -->
---

🚨 Become a better software engineer. practice building real systems, get code reviews, and mentorship from senior engineers.
Get started with [404skill](https://404skill.github.io/#/)
<!-- END PROMO BLOCK -->`;

// Function to update the markdown files
const updateMarkdownFiles = (dir) => {
  fs.readdir(dir, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return;
    }

    files.forEach((file) => {
      const filePath = path.join(dir, file);

      // Process only .md files
      if (path.extname(file) === '.md') {
        fs.readFile(filePath, 'utf8', (err, data) => {
          if (err) {
            console.error('Error reading file:', filePath, err);
            return;
          }

          // Check if the promo block already exists
          const promoBlockRegex = /<!-- PROMO BLOCK -->[\s\S]*<!-- END PROMO BLOCK -->/;

          let updatedContent;
          if (promoBlockRegex.test(data)) {
            // Replace existing promo block
            updatedContent = data.replace(promoBlockRegex, promoText);
          } else {
            // Append the promotional text at the end if not found
            updatedContent = data + '\n' + promoText;
          }

          // Write the updated content back to the file
          fs.writeFile(filePath, updatedContent, 'utf8', (err) => {
            if (err) {
              console.error('Error writing file:', filePath, err);
            } else {
              console.log(`Updated file: ${filePath}`);
            }
          });
        });
      }
    });
  });
};

// Start updating markdown files in the specified directory
updateMarkdownFiles(postsDir);
