const fs = require('fs-extra');
const path = require('path');
const matter = require('gray-matter');

// Set the average words per minute (WPM) for reading speed
const wordsPerMinute = 200;

// Function to calculate reading time based on word count
function calculateReadTime(content) {
  const wordCount = content.split(/\s+/g).length; // Split by spaces
  const readTime = Math.ceil(wordCount / wordsPerMinute);
  return readTime;
}

// Path to the _posts directory
const postsDir = path.join(__dirname, '..', 'source/_posts');

// Function to process all markdown files
async function processPosts() {
  try {
    // Get all Markdown files in the _posts directory
    const files = await fs.readdir(postsDir);

    for (const file of files) {
      if (path.extname(file) === '.md') {
        const filePath = path.join(postsDir, file);

        // Read the content of the post
        const fileContent = await fs.readFile(filePath, 'utf8');

        // Parse front matter and content using gray-matter
        const parsed = matter(fileContent);

        // Calculate reading time
        const readTime = calculateReadTime(parsed.content);

        // Add or update the readTime in front matter
        parsed.data.readTime = readTime;

        // Rebuild the file with the updated front matter
        const updatedContent = matter.stringify(parsed.content, parsed.data);

        // Write the updated content back to the file
        await fs.writeFile(filePath, updatedContent);

        console.log(`Updated ${file} with readTime: ${readTime} minute(s)`);
      }
    }
  } catch (error) {
    console.error('Error processing posts:', error);
  }
}

// Run the script
processPosts();
