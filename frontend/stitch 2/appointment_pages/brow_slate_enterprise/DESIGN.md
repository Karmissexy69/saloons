# Design System Specification: The Precision Curator

## 1. Overview & Creative North Star
The design system for this internal operations platform is built upon the "Creative North Star" of **The Precision Curator**. In an enterprise environment where speed and accuracy are paramount, we reject the cluttered "dashboard fatigue" of standard POS systems. Instead, we embrace an editorial layout that treats operational data with the same reverence as high-end typography in a gallery.

This system moves beyond "clean" into the realm of "architectural." We achieve this through:
*   **Intentional Asymmetry:** Offsetting navigation and data views to create a natural eye-path.
*   **Tonal Depth:** Replacing archaic 1px borders with a sophisticated hierarchy of grayscale surfaces.
*   **High-Contrast Scale:** Using dramatic differences between display headlines (Manrope) and functional data (Inter) to instantly signal information priority.

---

## 2. Color & Surface Architecture
We utilize a neutral, professional base with surgical applications of color.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section off the UI. Containers and sections must be defined solely through background color shifts.
*   Use `surface` for the main canvas.
*   Use `surface_container_low` for secondary sidebar areas.
*   Use `surface_container_highest` for active interactive elements or headers.

### Surface Hierarchy & Nesting
Think of the UI as a physical stack of fine paper. 
*   **Level 0 (Base):** `background` (#f7f9fb).
*   **Level 1 (Sub-sections):** `surface_container` (#e8eff3).
*   **Level 2 (Cards/Active Data):** `surface_container_lowest` (#ffffff) to provide a "lifted" appearance against the cool gray base.

### Signature Textures
Main Actions (CTAs) and the Camera Verification UI should utilize subtle gradients. Instead of a flat `primary` (#565e74), apply a linear gradient transitioning from `primary` to `primary_dim` (#4a5268) at a 135-degree angle. This adds a "weighted" feel to the interface, suggesting reliability and depth.

---

## 3. Typography: Architectural vs. Functional
This system pairs **Manrope** (Headlines) with **Inter** (Body) to balance editorial style with high-speed legibility.

*   **Display & Headlines (Manrope):** These are the "Wayfinders." Use `display-md` for primary context (e.g., "Verification Queue") and `headline-sm` for section titles. The geometric nature of Manrope provides an authoritative, "enterprise-grade" feel.
*   **Data & Labels (Inter):** All operational data must use Inter. `body-md` is the workhorse for table data, while `label-sm` is reserved for metadata and status badges.
*   **Hierarchy Tip:** Always pair a `headline-sm` in `on_surface` with a `label-md` in `on_surface_variant` to create a clear "Title/Description" relationship without needing lines.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are largely replaced by **Tonal Layering**.

*   **The Layering Principle:** To highlight a detail drawer or a modal, do not reach for a shadow first. Instead, place a `surface_container_lowest` drawer over a `surface_dim` background.
*   **Ambient Shadows:** Where floating is required (e.g., Tooltips or floating Face-ID overlays), use a "Natural Light" shadow: 
    *   *Blur:* 24px | *Spread:* -4px | *Color:* `on_surface` at 6% opacity.
*   **The "Ghost Border" Fallback:** If a high-density table requires separation, use a "Ghost Border": `outline_variant` (#a9b4b9) at **15% opacity**. Never use a 100% opaque border.
*   **Glassmorphism:** The specialized Camera/Verification UI must use a "Frosted" effect. Apply `surface_container_lowest` at 80% opacity with a `backdrop-filter: blur(12px)`. This keeps the operator grounded in the context of the app while focusing on the verification task.

---

## 5. Components

### The Sidebar Monolith
The sidebar should not be a floating bar but a solid, anchored anchor using `surface_container_low`. 
*   **Active State:** Use a vertical pill (Rounding: `full`) in `primary_container` with `on_primary_container` text.
*   **Spacing:** Use `spacing.8` (1.75rem) for top-level navigation padding.

### Data Tables (The "Fluid" Grid)
*   **Headers:** Use `surface_container_highest` for the header row. No dividers.
*   **Rows:** Alternate between `surface` and `surface_container_low` for zebra-striping, or keep them all on `surface_container_lowest` with a 4px gap (`spacing.2`) between rows to create a "card-list" hybrid.
*   **Readability:** Row height should be exactly `3.5rem` (`spacing.16`) to balance density and touch-target size.

### Status Badges
*   **Success (Verified):** Background: `success_container` | Text: `on_success_container`. Use Rounding: `md`.
*   **Error (Failed):** Background: `error_container` | Text: `on_error_container`.
*   **Interaction:** Badges should have a subtle 0.5px "Ghost Border" of their own text color at 20% opacity.

### Specialized Component: Face-Verification UI
*   **The Viewfinder:** A large, centered container with `rounding.xl`. 
*   **The Mask:** Overlaid with a `surface_dim` mask at 40% opacity, with a clear "cutout" for the face.
*   **Visual Feedback:** Upon success, the viewfinder border should transition from `outline` to a 4px `success` glow using the Ambient Shadow rule (high blur, low opacity).

### Buttons & Inputs
*   **Primary Button:** `primary` fill, `on_primary` text. Rounding: `md`. 
*   **Inputs:** `surface_container_highest` fill. Use `label-sm` for floating labels that sit 0.2rem (`spacing.1`) above the input field, never inside it, to maintain persistent context.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use `spacing.10` (2.25rem) as your default margin for page-level containers to give data room to breathe.
*   **Do** use `surface_tint` at 5% opacity for hover states on list items.
*   **Do** prioritize vertical rhythm. Ensure all elements align to a 0.2rem (`spacing.1`) baseline grid.

### Don’t
*   **Don’t** use pure black (#000000) for text. Always use `on_surface` (#2a3439) to maintain the "Slate" professional tone.
*   **Don’t** use "Card Shadows" for every list item. Reserve shadows only for elements that physically move or float over the main UI.
*   **Don’t** use bright, saturated colors for anything other than status or primary actions. The "Curator" aesthetic relies on the sophisticated neutrality of the slate and gray palette.