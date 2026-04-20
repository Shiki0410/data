# Design System Inspired by Spotify

## 1. Visual Theme & Atmosphere

Spotify's web interface is a dark, immersive music player built on near-black surfaces (`#121212`, `#181818`, `#1f1f1f`). The UI should recede so content (music cards, visuals) is primary.

### Key Characteristics
- Near-black immersive dark theme
- Spotify Green (`#1ed760`) as the primary functional accent
- Compact typography with bold hierarchy
- Pill/circle geometry for interactive controls
- Heavy shadow for elevation in dark UI

## 2. Color Palette

### Primary
- Spotify Green: `#1ed760`
- Base: `#121212`
- Surface: `#181818`
- Surface-2: `#1f1f1f`

### Text
- Primary: `#ffffff`
- Secondary: `#b3b3b3`

### Semantic
- Error: `#f3727f`
- Warning: `#ffa42b`
- Info: `#539df5`

### Border/Surface helpers
- Border: `#4d4d4d`
- Light border: `#7c7c7c`

### Shadows
- Heavy: `rgba(0,0,0,0.5) 0px 8px 24px`
- Medium: `rgba(0,0,0,0.3) 0px 8px 8px`

## 3. Typography Rules

- Font style: compact, UI-first
- Weight emphasis: mostly 700 vs 400, occasional 600
- Buttons: uppercase + wider tracking (`1.4px`~`2px`)

## 4. Component Guidance

### Buttons
- Pill radius: `500px` or `9999px`
- Circular controls: `50%`
- Dark buttons on dark surfaces; green only for key action

### Cards
- Surface `#181818`/`#1f1f1f`
- Radius around `6px`~`8px`
- Subtle hover lift and heavy shadow when elevated

### Inputs
- Pill-like input (`500px` radius)
- Dark background + inset border/shadow feel

## 5. Layout Principles

- Dense app-like spacing
- Base spacing unit: `8px`
- Keep content efficient and scannable

## 6. Do / Don't

### Do
- Keep UI achromatic + one accent green
- Use pill/circle consistently
- Use heavier shadows to separate layers in dark mode

### Don't
- Don’t use bright colors as decoration
- Don’t switch to light primary surfaces
- Don’t use square/button geometry that breaks identity

## 7. Responsive

- Mobile to desktop: keep dense content hierarchy
- Collapse side structures progressively
- Keep primary controls prominent and reachable
