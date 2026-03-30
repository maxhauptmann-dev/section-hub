# Mixed Media Grid Design

Date: 2026-03-30
Repo: `section-hub`
Status: Approved design, implementation not started

## Goal

Create a new SectionIQ Shopify section that matches the provided reference:

- desktop uses an art-directed asymmetric media grid with large rounded cards
- each card supports exactly one medium: image or video
- cards are repeatable and reorderable as Shopify blocks
- mobile collapses to a horizontal scroll rail of square cards
- the merchant can control section-level layout, spacing, colors, background treatment, and global video behavior

The section should feel native to the existing `section-hub` repo and follow the standard `meta.json` + `section.liquid` + `styles.css` structure.

## Request Summary

The user wants a new gallery-style section based on the screenshots:

- section-level controls similar to "Medienraster"
- repeatable media cards added via blocks
- per-card settings for grid size and content
- each card holds one image or one video, never multiple media items
- mobile view should simplify to square cards in a horizontal scroll layout
- video playback behavior must be merchant-configurable in the section settings

## Classification

- Section family: gallery / mixed media
- Content model: repeatable blocks
- Interaction model: static asymmetric grid on desktop, horizontal swipe/scroll on mobile
- Merchant flexibility: high for visible outcomes, low for implementation noise

## Chosen Architecture

### Section Identity

- Section id: `mixed-media-grid`
- CSS / JS prefix: `mmg-`
- Files:
  - `app/sections/mixed-media-grid/section.liquid`
  - `app/sections/mixed-media-grid/styles.css`
  - `app/sections/mixed-media-grid/meta.json`

### Why This Structure

This section is not collection-backed and does not require a slider-first architecture. The closest repo patterns are:

- `image-mosaic-wall` for repeatable visual cards
- `hero-mosaic` for explicit per-block column and row spans
- `video-card-gallery` and `video-feature-reel` for mixed image/video support

The implementation should combine those patterns into a simpler fixed-card system without lightbox, filters, or multi-slide cards.

## Layout Model

### Desktop

Desktop uses a CSS Grid with:

- configurable column count
- configurable row height
- configurable gap
- configurable card radius
- per-block column span
- per-block row span

Cards render as rounded panels with the media filling the card and content anchored near the bottom-left by default. The visual target is a clean editorial mosaic with white or light cards sitting over a dark or gradient section background.

### Mobile

Mobile does not preserve the asymmetric span logic. Instead, it switches to:

- horizontally scrollable track
- square cards
- scroll snapping
- simplified one-card-per-slot flow

This is intentional and directly follows the user-provided mobile reference.

## Media Model

Each block supports exactly one medium:

- image
- Shopify hosted video
- external video URL where practical in repo conventions

If multiple media fields are filled, priority should be explicit and deterministic:

1. Shopify video
2. external video
3. image

If no media is provided, show a neutral placeholder.

### Video Behavior

Video behavior is global at the section level so the experience remains consistent across cards. The merchant will be able to choose:

- autoplay when visible
- play on hover on desktop / tap on mobile
- play on click

Supporting controls:

- mute videos
- loop videos
- show native controls for click-to-play mode when appropriate
- use poster image fallback where possible

Implementation should avoid noisy per-card playback settings unless they materially change merchant outcomes.

## Section Settings

The section schema should reflect the editor structure implied by the screenshots while staying consistent with repo conventions.

### Section Settings Groups

#### Content

- section eyebrow
- section heading
- section description
- optional heading visibility toggle if needed

#### Layout

- desktop columns
- desktop row height
- desktop gap
- card radius
- content max width / section width
- section shell radius

#### Mobile

- mobile gap
- mobile card size
- mobile content spacing

#### Video

- playback mode
- mute toggle
- loop toggle
- show controls toggle

#### Colors

- section background style: solid or gradient
- solid background color
- gradient color start
- gradient color end
- card background fallback
- heading color
- text color
- button colors if buttons are included
- spotlight / glow strength

#### Spacing

- padding top desktop
- padding bottom desktop
- padding top mobile
- padding bottom mobile

#### Advanced

- custom CSS

## Block Settings

Each repeatable block represents one card.

### Media

- image picker
- Shopify video picker
- video URL
- poster image

### Layout

- desktop column span
- desktop row span
- no per-block mobile width control; mobile cards always use the section-level square card size
- card color scheme or overlay scheme

### Content

- heading
- description
- button label
- button link

### Card Presentation

- content position
- content alignment
- overlay opacity
- heading size
- description size
- button size
- button style

The schema should remain outcome-oriented. Controls that do not visibly help merchants should be omitted.

## Rendering Behavior

### Card Output

Each card should render:

- media layer
- optional overlay layer
- text content layer
- optional CTA

Cards should use `block.shopify_attributes`.

### Content Positioning

Default content position is bottom-left to match the reference, but the merchant can choose other sensible positions if the repo already uses that pattern cleanly.

### Empty States

- if heading/description/button are empty, hide those elements cleanly
- if media is missing, render a placeholder block that preserves the layout

## Motion Strategy

This section is primarily layout-led, not animation-led.

Allowed motion:

- subtle reveal on enter
- small media zoom on hover for image cards
- optional glow / ambient background treatment

Not included:

- sticky scrolling
- per-card internal sliders
- lightbox
- masonry reflow logic
- desktop carousel behavior

This keeps the section aligned with the request and avoids overbuilding.

## JavaScript Responsibilities

The section JavaScript should stay local and minimal:

- initialize only inside the current `section.id`
- handle video playback mode logic
- optionally handle reveal animation classes
- avoid brittle global selectors
- use `data-*` hooks with the `mmg-` prefix

No external dependency should be required.

## CSS Responsibilities

`styles.css` should contain:

- static card styling
- grid and mobile rail layout
- media fitting rules
- responsive transitions
- optional subtle glow/background treatment

`section.liquid` should only contain:

- CSS variable injection from settings
- markup
- block iteration
- small section-scoped JS
- Shopify schema

## Metadata Plan

`meta.json` should follow repo conventions with:

- `id`: `mixed-media-grid`
- name in SectionIQ style
- category focused on images / mixed media / gallery discoverability
- version `1.0.0`
- standard file mapping
- `createdAt` and `updatedAt` set to `2026-03-30`
- changelog entry: `Initial release`

Preview assets are intentionally out of scope and must not be fabricated.

## Edge Cases

- cards with no media must not collapse the grid
- cards with video but no poster should still render safely
- mobile horizontal scrolling must work with variable block counts
- reduced-motion users should not get autoplay-heavy transitions
- mixed card heights on desktop must not break the grid
- section should still look valid with only 1 or 2 cards

## Verification Plan

Implementation will be considered correct when:

- folder name, section id, and metadata id match
- the section auto-discovers in the hub from `meta.json`
- the schema is valid JSON
- desktop shows an asymmetric repeatable media grid
- mobile shows square horizontally scrollable cards
- each block supports exactly one image or one video
- video playback follows the chosen section-level behavior
- styling and hooks consistently use the `mmg-` prefix

## Out Of Scope

- preview generation
- route or hub UI changes beyond normal auto-discovery
- collection-backed product logic
- per-card multi-slide galleries
- lightbox
- advanced filtering

## Implementation Notes For The Next Step

The implementation phase should create one new section folder only and avoid touching unrelated routes or preview bundles. The worktree already contains unrelated changes, so the new section and the design doc commit must stay isolated.
