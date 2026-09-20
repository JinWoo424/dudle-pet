const favicon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="#087f83"/>
  <circle cx="21" cy="21" r="6" fill="#ffffff"/>
  <circle cx="43" cy="21" r="6" fill="#ffffff"/>
  <circle cx="15" cy="34" r="5" fill="#ffffff"/>
  <circle cx="49" cy="34" r="5" fill="#ffffff"/>
  <path d="M32 29c-10 0-17 8-17 17 0 6 5 9 10 6 4-2 10-2 14 0 5 3 10 0 10-6 0-9-7-17-17-17Z" fill="#ffffff"/>
</svg>`;

export function GET() {
  return new Response(favicon, {
    headers: {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "Content-Type": "image/svg+xml; charset=utf-8",
    },
  });
}
