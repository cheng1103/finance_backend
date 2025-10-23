/**
 * Article Generation Module
 * Uses Google Gemini API to generate SEO-optimized articles
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const { config } = require('../config');
const logger = require('../utils/logger');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

/**
 * Generate SEO-optimized article using Gemini
 * @param {string} keyword - The target keyword
 * @returns {Promise<Object>} Article data with title, content, meta
 */
async function generateArticle(keyword) {
  try {
    logger.info(`Generating article for keyword: "${keyword}"`);

    const model = genAI.getGenerativeModel({
      model: config.gemini.model,
      generationConfig: {
        temperature: config.gemini.temperature,
        maxOutputTokens: config.gemini.maxTokens,
      },
    });

    const prompt = buildPrompt(keyword);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const articleText = response.text();

    // Parse the article into structured data
    const articleData = parseArticleResponse(articleText, keyword);

    // Save to file
    saveArticleToFile(keyword, articleData);

    logger.success(`Article generated successfully for: "${keyword}"`, {
      wordCount: articleData.wordCount,
      hasTitle: !!articleData.title,
      hasMeta: !!articleData.metaDescription,
    });

    return articleData;

  } catch (error) {
    logger.fail(`Failed to generate article for: "${keyword}"`, {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Build the prompt for Gemini
 */
function buildPrompt(keyword) {
  const { article } = config;

  return `You are a professional SEO content writer for a Malaysian financial services platform (eplatformcredit.com).

Write a unique, comprehensive, and SEO-optimized article about "${keyword}" specifically for Malaysian readers.

REQUIREMENTS:
- Language: ${article.language}
- Target Audience: ${article.locale} residents looking for loans/credit services
- Length: ${article.minWords}-${article.maxWords} words
- Tone: Professional, trustworthy, helpful
- Include local context (Malaysian regulations, CTOS, etc.)

STRUCTURE:
1. **Title (H1)**: Catchy, SEO-friendly title with the keyword
2. **Meta Description**: 150-160 characters, include keyword
3. **Introduction**: Hook the reader, state the problem/need
4. **Main Content**:
   - Use H2 and H3 subheadings
   - Include practical information
   - Address common concerns
   - Explain benefits and features
   ${article.includeFAQ ? '5. **FAQ Section**: 3-5 common questions with detailed answers' : ''}
   ${article.includeCTA ? `6. **Call to Action**: ${article.ctaText} (Link: ${article.ctaLink})` : ''}

IMPORTANT:
- Use the keyword naturally throughout
- Write for humans first, search engines second
- Include specific details relevant to Malaysia
- Avoid generic content
- Make it actionable and helpful

FORMAT THE OUTPUT AS:
---TITLE---
[Your H1 title here]

---META---
[Your meta description here]

---CONTENT---
[Full article content in markdown format]

---FAQ--- ${article.includeFAQ ? '(if applicable)' : ''}
[FAQ section if included]

Begin writing now:`;
}

/**
 * Parse the Gemini response into structured data
 */
function parseArticleResponse(text, keyword) {
  const sections = {};

  // Extract title
  const titleMatch = text.match(/---TITLE---\s*\n(.*?)\n/);
  sections.title = titleMatch ? titleMatch[1].trim() : keyword;

  // Extract meta description
  const metaMatch = text.match(/---META---\s*\n(.*?)\n/);
  sections.metaDescription = metaMatch ? metaMatch[1].trim() : '';

  // Extract main content
  const contentMatch = text.match(/---CONTENT---\s*\n([\s\S]*?)(?=---FAQ---|$)/);
  sections.content = contentMatch ? contentMatch[1].trim() : text;

  // Extract FAQ if present
  const faqMatch = text.match(/---FAQ---\s*\n([\s\S]*?)$/);
  sections.faq = faqMatch ? faqMatch[1].trim() : null;

  // Calculate word count
  sections.wordCount = sections.content.split(/\s+/).length;

  // Add metadata
  sections.keyword = keyword;
  sections.generatedAt = new Date().toISOString();

  return sections;
}

/**
 * Save article to output directory
 */
function saveArticleToFile(keyword, articleData) {
  const outputDir = config.paths.output;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = keyword.replace(/\s+/g, '-').toLowerCase();
  const filepath = path.join(outputDir, `${filename}.json`);

  fs.writeFileSync(filepath, JSON.stringify(articleData, null, 2));

  logger.debug(`Article saved to: ${filepath}`);
}

/**
 * Read article from file
 */
function readArticleFromFile(keyword) {
  const filename = keyword.replace(/\s+/g, '-').toLowerCase();
  const filepath = path.join(config.paths.output, `${filename}.json`);

  if (!fs.existsSync(filepath)) {
    throw new Error(`Article file not found: ${filepath}`);
  }

  const data = fs.readFileSync(filepath, 'utf8');
  return JSON.parse(data);
}

module.exports = {
  generateArticle,
  readArticleFromFile,
};
