# Astro AI Blog

Website bai viet nhe, dung Astro va Markdown. Moi bai viet nam trong `src/content/posts`, nen sua bai chi can sua file Markdown tuong ung.

## Chay tren may

```bash
npm install
npm run dev
```

## Tao bai bang AI

Tao file `.env` tu `.env.example`, dien `OPENAI_API_KEY`, sau do chay:

```bash
npm run new:ai
```

Script se tao mot file Markdown moi trong `src/content/posts`.

## Dang len hosting

Dat `SITE_URL` bang ten mien that cua ban truoc khi build de sitemap va canonical dung:

```bash
SITE_URL=https://tenmiencuaban.com npm run build
```

Thu muc xuat ban la `dist`.

## Tu dong hang ngay

Workflow mau nam trong `.github/workflows/daily-ai-post.yml`. Khi dua len GitHub, them:

- Secret: `OPENAI_API_KEY`
- Variable: `SITE_URL`
- Variable tuy chon: `SITE_TOPIC`, `OPENAI_MODEL`

Model mac dinh la `gpt-5.6-luna`, phu hop voi viec tao noi dung hang ngay va toi uu chi phi.

Luu y: nen kiem tra dinh ky bai AI de tranh noi dung mong, sai hoac trung lap.
