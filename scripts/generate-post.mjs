import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import matter from "gray-matter";

const root = process.cwd();
const postsDir = path.join(root, "src", "content", "posts");
const preferredModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
const fallbackModels = [
  preferredModel,
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4.1-mini",
  "gpt-4.1",
].filter((value, index, list) => value && list.indexOf(value) === index);
const topic = process.env.SITE_TOPIC || "Meo cong nghe va nang suat cho nguoi dung pho thong";
const language = process.env.SITE_LANGUAGE || "vi";
const publishDraft = process.env.PUBLISH_DRAFT === "true";
const categories = [
  "Cong nghe",
  "Nang suat",
  "Doi song so",
  "Huong dan",
];

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function listRecentPosts() {
  const files = await fs.readdir(postsDir).catch(() => []);
  const posts = [];

  for (const file of files.filter((name) => name.endsWith(".md"))) {
    const raw = await fs.readFile(path.join(postsDir, file), "utf8");
    const parsed = matter(raw);
    posts.push({
      title: parsed.data.title,
      category: parsed.data.category,
      file,
    });
  }

  return posts.slice(-20);
}

function extractJson(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i);
  return JSON.parse(fenced ? fenced[1] : trimmed);
}

async function requestArticleWithModel(modelName) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Copy .env.example to .env and add your key.");
  }

  const recentPosts = await listRecentPosts();
  const prompt = {
    role: "user",
    content: [
      {
        type: "input_text",
        text: `Create one original daily blog article in ${language}.

Site topic: ${topic}
Available categories: ${categories.join(", ")}
Recent posts to avoid repeating: ${JSON.stringify(recentPosts)}

Return only valid JSON with this shape:
{
  "title": "short helpful title",
  "description": "SEO description under 155 characters",
  "category": "one available category",
  "markdown": "article body in Markdown"
}

Rules:
- Write for people first, not search engines.
- Start with a direct 2-3 sentence answer.
- Use clear H2 sections.
- Include practical examples or steps.
- Include a short FAQ section with 3 questions.
- Do not invent statistics, studies, prices, or named sources.
- Do not include the frontmatter block.
- Keep the body between 800 and 1200 words.`,
      },
    ],
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelName,
      input: [prompt],
      text: {
        format: {
          type: "json_object",
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`OpenAI request failed for model ${modelName}: ${response.status} ${body}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  const data = await response.json();
  const output = data.output_text || data.output?.flatMap((item) => item.content || [])
    .map((item) => item.text)
    .filter(Boolean)
    .join("\n");

  if (!output) {
    throw new Error("OpenAI returned no article text.");
  }

  return extractJson(output);
}

async function requestArticle() {
  const errors = [];

  for (const modelName of fallbackModels) {
    try {
      console.log(`Trying OpenAI model: ${modelName}`);
      return await requestArticleWithModel(modelName);
    } catch (error) {
      const body = String(error.body || error.message || "");
      if (error.status === 403 && body.includes("model_not_found")) {
        errors.push(`${modelName}: no access`);
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    `No configured OpenAI model is available for this API key/project. Tried: ${errors.join(", ")}. Open the OpenAI dashboard, check the project's model access, or set GitHub variable OPENAI_MODEL to a model your project can use.`
  );
}

async function writeArticle(article) {
  const today = new Date().toISOString().slice(0, 10);
  const title = String(article.title || "").trim();
  const description = String(article.description || "").trim();
  const category = categories.includes(article.category) ? article.category : categories[0];
  const markdown = String(article.markdown || "").trim();

  if (title.length < 10) throw new Error("Generated title is too short.");
  if (description.length < 50 || description.length > 170) {
    throw new Error("Generated description must be between 50 and 170 characters.");
  }
  if (markdown.length < 2500) throw new Error("Generated article is too short.");

  let slug = slugify(title);
  let filePath = path.join(postsDir, `${slug}.md`);
  let suffix = 2;

  while (true) {
    try {
      await fs.access(filePath);
      slug = `${slugify(title)}-${suffix}`;
      filePath = path.join(postsDir, `${slug}.md`);
      suffix += 1;
    } catch {
      break;
    }
  }

  const file = matter.stringify(markdown, {
    title,
    description,
    category,
    publishedAt: today,
    updatedAt: today,
    draft: publishDraft,
  });

  await fs.writeFile(filePath, file, "utf8");
  return filePath;
}

const article = await requestArticle();
const filePath = await writeArticle(article);
console.log(`Created ${filePath}`);
