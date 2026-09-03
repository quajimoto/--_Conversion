---
name: Clarion Internal
colors:
  surface: '#f8fafb'
  surface-dim: '#d8dadb'
  surface-bright: '#f8fafb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f5'
  surface-container: '#eceeef'
  surface-container-high: '#e6e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#40484b'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#eff1f2'
  outline: '#70787c'
  outline-variant: '#bfc8cc'
  surface-tint: '#1e667a'
  primary: '#1a6477'
  on-primary: '#ffffff'
  primary-container: '#3a7d91'
  on-primary-container: '#fafdff'
  inverse-primary: '#8fd0e6'
  secondary: '#2b666f'
  on-secondary: '#ffffff'
  secondary-container: '#b2ecf7'
  on-secondary-container: '#326c76'
  tertiary: '#336466'
  on-tertiary: '#ffffff'
  tertiary-container: '#4d7d7f'
  on-tertiary-container: '#f6ffff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b3ebff'
  primary-fixed-dim: '#8fd0e6'
  on-primary-fixed: '#001f27'
  on-primary-fixed-variant: '#004e5f'
  secondary-fixed: '#b2ecf7'
  secondary-fixed-dim: '#96d0da'
  on-secondary-fixed: '#001f24'
  on-secondary-fixed-variant: '#094e57'
  tertiary-fixed: '#b9ecee'
  tertiary-fixed-dim: '#9ecfd1'
  on-tertiary-fixed: '#002021'
  on-tertiary-fixed-variant: '#1a4e50'
  background: '#f8fafb'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
  surface-header: '#E8F4F8'
  surface-border: '#D0E3EA'
  text-main: '#333333'
  text-sub: '#666666'
  status-locked: '#F2F2F2'
  success-mint: '#E2F3F0'
typography:
  headline-lg:
    fontFamily: Noto Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Noto Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Noto Sans
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 24px
  body-lg:
    fontFamily: Noto Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Noto Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Noto Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.5px
  label-sm:
    fontFamily: Noto Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 24px
  grid-gutter: 16px
  row-height-standard: 40px
  input-padding-x: 12px
  input-padding-y: 8px
---

## Brand & Style

The design system is engineered for **Professional Utility** and **Operational Focus**. It prioritizes cognitive ease for corporate users handling high-density data over long durations. The personality is reliable, calm, and objective, designed specifically to reduce the visual fatigue associated with traditional enterprise software.

The aesthetic follows a **Modern Corporate** style with a focus on **Soft Minimalism**. By utilizing a pastel-derived palette and generous whitespace, the system creates a focused work environment that feels lightweight and approachable. The design avoids heavy gradients and skeuomorphism to ensure performance and clarity, relying instead on subtle depth and crisp typography to guide the user's eye through complex evaluation workflows.

**Target Attributes:**
- **Clarity:** Unambiguous data presentation.
- **Comfort:** Reduced eye strain through low-contrast backgrounds.
- **Integrity:** State-driven UI that clearly signals when data is locked or editable.
- **Efficiency:** Streamlined input methods with minimal decorative distractions.

## Colors

The color strategy uses "Soft Pastel Efficiency." The background is a near-white neutral to keep the workspace open, while the primary surfaces use a tinted light blue (`#E8F4F8`) to distinguish data headers from content without the harsh contrast of pure black and white.

- **Primary:** A muted teal-blue used for primary actions and active state indicators.
- **Surface/Header:** A soft pastel blue that provides a distinct but gentle backdrop for DataGrid headers.
- **Border:** Low-contrast blue-grey used to define boundaries in data tables without creating "grid-glare."
- **Typography:** Deep charcoal (`#333333`) is used instead of pure black to further reduce ocular strain while maintaining high legibility.
- **State Colors:** Neutral grays are used to signify `IsReadOnly` or `Disabled` states, providing an immediate visual cue for data finality.

## Typography

The system utilizes **Noto Sans** (or **Pretendard**) to ensure cross-platform legibility and a clean, neutral tone. The typographic hierarchy is strictly functional.

- **Data Headers:** Use `label-md` with bold weights and subtle letter spacing to differentiate field names from data values.
- **Numerical Data:** Should be rendered with a tabular-nums feature if available to ensure columns align perfectly in the DataGrid.
- **Scaleability:** For desktop WPF applications, the primary body size is 14px, which provides an optimal balance between information density and readability. 
- **Hierarchy:** Use weight (`Bold` vs `Regular`) and color (`#333333` vs `#666666`) rather than large size jumps to indicate importance.

## Layout & Spacing

The layout philosophy follows a **Structured Grid** model. Information is organized into logical cards and data tables that expand to fill the container, maximizing the use of desktop real estate while maintaining generous internal margins.

- **DataGrid Spacing:** All headers are fixed at a height of 40px to provide a comfortable click/touch target. 
- **Rhythm:** A 4px baseline grid ensures consistent alignment between labels, inputs, and buttons.
- **Margins:** A standard 24px margin is applied to the main view containers to prevent content from feeling cramped against the window edges.
- **Responsiveness:** As an internal WPF tool, the layout prioritizes horizontal expansion for DataGrids. If the window is resized, the grid columns should use star-sizing (`*`) for primary data and fixed sizing for labels.

## Elevation & Depth

This design system uses **Tonal Layers** and **Low-Contrast Outlines** instead of heavy shadows to maintain a lightweight, modern feel.

- **Surfaces:** Use background color shifts to denote depth. The main application background is `#F8FAFB`, while active containers or cards use white (`#FFFFFF`).
- **Shadows:** Use a single, highly diffused "Ambient Shadow" for floating elements like dropdowns or dialogs: `0px 4px 12px rgba(0, 0, 0, 0.05)`. 
- **Interactive Depth:** Buttons and inputs use a 1px solid border (`#D0E3EA`). When hovered, the border color darkens slightly rather than adding shadow, maintaining the flat minimalist aesthetic.
- **State Feedback:** When a field is set to `IsReadOnly`, the background shifts to a flat light gray (`#F2F2F2`) with no elevation, signaling that the element is "sunken" and no longer interactive.

## Shapes

The shape language is **Softly Geometric**. A consistent corner radius of **8px (0.5rem)** is applied to all primary UI components including buttons, input fields, and containers.

- **Buttons & Inputs:** Use the base 8px radius.
- **DataGrid:** The outer container of the DataGrid should have a 8px radius, though internal cells remain sharp to maintain grid integrity.
- **Selection Indicators:** Use the "Pill" shape (fully rounded) only for status badges (e.g., "SUBMITTED" or "ADMIN") to distinguish them from interactive buttons.

## Components

- **Buttons:** Primary buttons use the primary teal color with white text. Secondary buttons use a white background with a 1px border. All buttons have a height of 36-40px and 8px rounded corners.
- **DataGrid:** Headers must use `#E8F4F8` background with `#333333` bold text. Borders are 1px solid `#D0E3EA`. Alternating row colors are encouraged using a very faint version of the neutral color to improve horizontal scanning.
- **Input Fields:** Use a 1px border. On focus, the border transitions to the primary teal. For evaluation inputs, the field must visually change when a value exceeds the `MaxPracticalScore` (e.g., a soft red border).
- **Cards:** Used to group "Evaluation Master" settings. Cards should have a white background, 1px border, and no shadow to stay consistent with the flat corporate style.
- **Login Toggle:** The login screen should transition smoothly between "Simple" and "Secure" modes using a Fade-in animation, keeping the container dimensions consistent to prevent "layout jumping."
- **Status Chips:** Use pastel backgrounds (e.g., Success-Mint `#E2F3F0`) for "Submitted" status labels with dark green text to ensure high contrast and readability.