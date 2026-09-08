# Mobile UI reference analysis

Reference reviewed: `aerang.ktrend.co.kr/experiences/northern-gyeonggi-childrens-museum`

This document records reusable UX observations only. The reference site's code, copy, imagery, branding, and distinctive composition are not reused.

## Observed mobile patterns

- A 390px browser render had no document-level horizontal overflow.
- The content flow uses a restrained single column with consistent side gutters rather than shrinking a desktop grid.
- The measured primary heading was about 30px with a 37px line height; section headings were about 24px with a 32px line height.
- Body copy was compact (about 14px/20px), while cards used roughly 16–20px inner padding.
- Information groups were separated with light borders, pale backgrounds, and approximately 22–24px corner radii instead of heavy shadows.
- Primary actions were visually isolated from explanatory content, and image blocks maintained a stable responsive ratio.
- Long pages used clear section introductions and generous vertical breaks to preserve scanning rhythm.

## Dudle Pet interpretation

- Keep Dudle Pet's teal, navy, public-data trust language, and dog/cat hero identity.
- Use shared container, spacing, card, and typography tokens across all public routes.
- Replace the mobile horizontal desktop navigation with a compact menu.
- Keep the home message and search before the hero image; use a two-column quick menu at phone widths.
- Stack map and facility results on mobile, preserve map/card selection, and use a responsive 16:10 map frame.
- Present cost filters as full-width controls, price summaries as a 2×2 grid, and confine horizontal scrolling to the table wrapper.
- Reserve optional advertising as independent content blocks. With AdSense disabled, slots collapse completely; Preview placeholders never load Google advertising.

## Non-goals

- No reference-site assets, copy, colors, logos, or branded visual motifs are copied.
- No database, API, canonical, sitemap, PostGIS, Kakao marker, or authentication behavior is changed.
