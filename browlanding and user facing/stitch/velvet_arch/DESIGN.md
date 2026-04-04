# Design System Strategy: The Velvet Editorial

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Velvet Editorial."** 

This system moves beyond the utility of a standard beauty appointment app and enters the realm of a high-end lifestyle publication. We reject the "boxed-in" layout of traditional web design. Instead, we embrace **Breathing Asymmetry** and **Tonal Depth**. By utilizing overlapping elements, generous white space, and a high-contrast typography scale, we create a digital experience that feels as curated as a professional brow treatment. The goal is to evoke a sense of calm, precision, and luxury through soft surfaces and sharp typography.

---

## 2. Color & Surface Philosophy
The palette is rooted in deep, regal purples and ethereal lavender accents, grounded by a "crisp white" that is never sterile, but rather textured and warm.

### The "No-Line" Rule
To maintain a premium, seamless aesthetic, **1px solid borders are strictly prohibited** for sectioning or defining containers. Boundaries must be defined through:
*   **Background Shifts:** Transitioning from `surface` (#faf9fc) to `surface-container-low` (#f5f3f7).
*   **Tonal Transitions:** Using subtle shifts in the lavender spectrum to denote change in context.

### Surface Hierarchy & Nesting
Treat the UI as a physical arrangement of fine paper and frosted glass. 
*   **Base:** Start with `surface` (#faf9fc).
*   **Nesting:** Place `surface-container-lowest` (#ffffff) cards on top of `surface-container` (#efedf1) sections to create a natural "lift."
*   **The Glass & Gradient Rule:** For primary CTAs and high-impact headers, use a subtle linear gradient from `primary` (#330056) to `primary_container` (#4a1d6e). For floating navigation or modals, apply **Glassmorphism**: use `surface_container_lowest` at 80% opacity with a `24px` backdrop-blur to allow the rich purples of the background to bleed through softly.

---

## 3. Typography: The Editorial Voice
Our typography pairing balances the "Art" (Serif) with the "Science" (Sans-Serif).

*   **The Authority (Noto Serif):** Used for all `display` and `headline` roles. This font should feel oversized and intentional. Don't be afraid to let a `display-lg` (3.5rem) heading bleed off-center to create an editorial, asymmetrical look.
*   **The Precision (Manrope):** Used for `title`, `body`, and `label` roles. Manrope provides a clean, modern contrast to the serif, ensuring that functional information (prices, times, services) is legible at a glance.

**Hierarchy Note:** Always maintain a significant scale jump between headlines and body text to reinforce the premium feel.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are too "heavy" for this brand. We achieve depth through light and tone.

*   **The Layering Principle:** Stack `surface-container` tiers to create hierarchy. A "Service Detail" card should be `surface-container-lowest` (#ffffff) sitting on a `surface-container-high` (#e9e7eb) background.
*   **Ambient Shadows:** When an element must float (like a "Book Now" FAB), use a shadow with a `32px` blur, 4% opacity, and a color hex of `#2e004e` (on_primary_fixed). This mimics natural light passing through purple silk rather than a generic grey shadow.
*   **The Ghost Border:** If a boundary is required for accessibility, use `outline_variant` (#cec3d1) at **15% opacity**. It should be felt, not seen.

---

## 5. Components & Interactive Elements

### Buttons
*   **Primary:** Pill-shaped (`rounded-full`), using the `primary` (#330056) fill with `on_primary` (#ffffff) text. Use a subtle inner-glow gradient for a "lit from within" effect.
*   **Secondary:** `surface_container_highest` (#e3e2e6) background with `primary` text. No border.
*   **Tertiary:** Text-only in `primary`, with a `2px` underline that expands from the center on hover.

### Cards & Appointment Lists
*   **The No-Divider Rule:** Never use horizontal rules (`<hr>`) to separate list items. Use vertical white space (set to `xl` spacing) or alternating background tones (`surface` to `surface-container-low`).
*   **Shape:** Apply `rounded-xl` (1.5rem) to all featured cards to maintain the "Soft Modern" aesthetic.

### Input Fields
*   Avoid boxes. Use a `surface-container-lowest` fill with a `rounded-md` corner. On focus, the background should transition to `primary_fixed` (#f2daff) with a soft `primary` text cursor.

---

## 6. Motion & Interactive Guidelines
The movement of the interface should mimic the fluid, precise motion of a threading artist.

*   **The "Silk" Transition:** When navigating between pages, use a staggered fade-in + slide-up. Content should not just appear; it should float into place with a `cubic-bezier(0.22, 1, 0.36, 1)` easing (400ms).
*   **Micro-Interactions:** 
    *   **Button Hover:** A subtle scale-up (1.02x) and a shift in the gradient intensity.
    *   **Selection:** When a service is selected, the card should "sink" slightly (shadow decreases) and the background should shift to `secondary_container` (#e3c7fe).
*   **Loading States:** Use a shimmering "skeleton" screen that pulses between `surface-container` and `surface-container-high`. Avoid generic spinning wheels.

---

## 7. Do's and Don'ts

### Do:
*   Use asymmetric layouts (e.g., text left-aligned with an image offset to the right).
*   Use `primary` (#330056) for moments of high emphasis and luxury.
*   Allow for massive amounts of white space (empty `surface` areas) to let the typography breathe.

### Don't:
*   **Don't** use black (#000000). Use `tertiary` (#201e27) for the darkest tones.
*   **Don't** use sharp 90-degree corners. Everything must have at least a `sm` (0.25rem) radius.
*   **Don't** use "Information Density." If a screen feels crowded, break it into a multi-step flow. This is a spa experience, not a spreadsheet.