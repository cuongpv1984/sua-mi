import { getCollection } from "astro:content";
import { site } from "@/data/site";
import { slugify } from "@/lib/slug";

function urlEntry(url, lastmod) {
  return `
  <url>
    <loc>${url}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}
  </url>`;
}

export async function GET() {
  const posts = (await getCollection("posts")).filter((post) => !post.data.draft);
  const categories = [...new Set(posts.map((post) => post.data.category))];
  const urls = [
    urlEntry(site.url),
    ...categories.map((category) =>
      urlEntry(new URL(`/danh-muc/${slugify(category)}/`, site.url).href)
    ),
    ...posts.map((post) =>
      urlEntry(
        new URL(`/bai-viet/${post.slug}/`, site.url).href,
        (post.data.updatedAt || post.data.publishedAt).toISOString().slice(0, 10)
      )
    ),
  ];

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}
</urlset>`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    }
  );
}
