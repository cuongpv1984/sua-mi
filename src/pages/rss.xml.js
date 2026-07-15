import { getCollection } from "astro:content";
import { Feed } from "feed";
import { site } from "@/data/site";

export async function GET() {
  const posts = (await getCollection("posts"))
    .filter((post) => !post.data.draft)
    .sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());

  const feed = new Feed({
    title: site.name,
    description: site.description,
    id: site.url,
    link: site.url,
    language: "vi",
    copyright: `${new Date().getFullYear()} ${site.name}`,
  });

  posts.forEach((post) => {
    const url = new URL(`/bai-viet/${post.slug}/`, site.url).href;
    feed.addItem({
      title: post.data.title,
      id: url,
      link: url,
      description: post.data.description,
      date: post.data.publishedAt,
      category: [{ name: post.data.category }],
    });
  });

  return new Response(feed.rss2(), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
