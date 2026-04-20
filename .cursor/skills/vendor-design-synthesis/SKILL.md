---
name: vendor-design-synthesis
description: >-
  Synthesizes reference design systems from vendor DESIGN.md files and turns
  them into clear, implementation-ready design guidance. Use when the user asks
  to blend, compare, or apply multiple brand systems such as Airbnb, Apple,
  Pinterest, and Figma.
---

# Vendor Design Synthesis Skill

Use this skill when the user provides one or more vendor `DESIGN.md` files and asks for a unified skill, design direction, or implementation guidance derived from them.

## Purpose

This skill helps you extract the strongest patterns from multiple reference systems and turn them into a single, actionable design brief. It should preserve each vendor's identity where relevant, while producing a coherent recommendation instead of a generic average.

## Working Method

1. Read all supplied `DESIGN.md` files carefully.
2. Identify recurring patterns across the references:
   - color strategy
   - typography scale and weight behavior
   - spacing and radius systems
   - depth and shadow treatment
   - component geometry
   - responsive behavior
   - do/don't constraints
3. Separate shared principles from vendor-specific signatures.
4. Prefer the dominant patterns that appear in multiple systems.
5. When systems conflict, explicitly note the trade-off and choose the most suitable rule for the user's goal.

## Output Expectations

When using this skill, produce guidance in the following structure:

- `Summary` — the unifying design direction in a few sentences
- `Common Patterns` — the rules that appear across multiple vendors
- `Distinctive Signatures` — the memorable vendor-specific traits worth preserving
- `Recommended System` — the synthesized palette, typography, spacing, radius, shadow, and component rules
- `Do / Don't` — concise implementation constraints
- `Responsive Notes` — how the system should adapt across screen sizes
- `Prompt Guide` — short reusable prompts for generating UI consistent with the synthesis

## Synthesis Rules

- Do not flatten the references into bland “best practices.” Keep the strongest visual identity cues.
- Do not invent brands or tokens that are not supported by the source files unless the user explicitly asks for creative extension.
- If the user wants a build-ready system, translate the references into concrete design tokens and component rules.
- If the user wants a conceptual skill, keep the output concise and pattern-focused.
- If the source files disagree, explain the conflict and choose a direction based on context.

## Style Guidance

- Be specific about exact colors, spacing, radius, font weights, and shadows when they are present in the references.
- Prefer implementation-ready language over vague aesthetic descriptions.
- Call out singular accent colors and strong typography rules, since these systems rely on them heavily.
- Keep the tone practical and usable for UI generation or design implementation.

## When This Skill Is Most Useful

- Creating a new UI style guide from several brand references
- Building a Cursor skill that should reason about design systems
- Translating visual references into a reusable agent prompt
- Comparing vendor design languages before implementing a UI

## Example User Intent

- “Create a skill from these design references.”
- “Merge Airbnb, Apple, Pinterest, and Figma rules into one system.”
- “Make a Cursor skill that can answer with a synthesized design brief.”
