# Booking System - UI Design System Specification

## Overview

This document defines the comprehensive UI design system for the Booking System frontend application. It establishes visual consistency across all user-facing and admin-facing pages.

## Design Philosophy

- **User Pages**: Modern glassmorphism with gradient backgrounds, translucent cards, and subtle shadows
- **Admin Pages**: Clean, solid design with clear visual hierarchy, white cards on gray background
- **Unified Elements**: Same color palette, typography, and spacing system across both modes
- **Dark Mode**: Full support with inverted color schemes

---

## 1. Color System

### 1.1 Primary Colors
```css
--color-primary-start: #667eea;
--color-primary-end: #764ba2;
--color-primary: #667eea;
--color-secondary: #764ba2;
```

### 1.2 Semantic Colors
```css
--color-success: #00B42A;
--color-warning: #FF7D00;
--color-danger: #F53F3F;
--color-info: #1677FF;
```

### 1.3 Neutral Colors (Light Mode)
```css
--color-bg-primary: #ffffff;
--color-bg-secondary: #F2F3F5;
--color-bg-tertiary: #e4e8ec;
--color-text-primary: #1D2129;
--color-text-secondary: #86909C;
--color-text-disabled: #C9CDD4;
--color-border: #E5E6EB;
--color-border-light: #F2F3F5;
```

### 1.4 Neutral Colors (Dark Mode)
```css
--color-bg-primary: #1D2129;
--color-bg-secondary: #272E3B;
--color-bg-tertiary: #333D4D;
--color-text-primary: #F2F3F5;
--color-text-secondary: #86909C;
--color-text-disabled: #4E5969;
--color-border: #4E5969;
--color-border-light: #333D4D;
```

### 1.5 Glassmorphism Colors (Light Mode)
```css
--color-glass-light: rgba(255, 255, 255, 0.85);
--color-glass-medium: rgba(255, 255, 255, 0.75);
--color-glass-dark: rgba(255, 255, 255, 0.65);
--color-glass-border: rgba(255, 255, 255, 0.3);
```

### 1.6 Glassmorphism Colors (Dark Mode)
```css
--color-glass-light: rgba(39, 46, 59, 0.85);
--color-glass-medium: rgba(39, 46, 59, 0.75);
--color-glass-dark: rgba(39, 46, 59, 0.65);
--color-glass-border: rgba(255, 255, 255, 0.1);
```

---

## 2. Typography System

### 2.1 Font Family
```css
font-family: 'Inter', 'Microsoft YaHei', 'Source Han Sans', sans-serif;
```

### 2.2 Type Scale
| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| display | 2.5rem (40px) | 700 | 1.2 | Page titles |
| h1 | 2rem (32px) | 700 | 1.3 | Section headers |
| h2 | 1.5rem (24px) | 600 | 1.4 | Card headers |
| h3 | 1.25rem (20px) | 600 | 1.4 | Sub-sections |
| body | 1rem (16px) | 400 | 1.5 | Body text |
| body-sm | 0.875rem (14px) | 400 | 1.5 | Secondary text |
| caption | 0.75rem (12px) | 400 | 1.5 | Labels, captions |
| stat | 2.25rem (36px) | 700 | 1.1 | Stat numbers |

---

## 3. Spacing System

Base unit: 4px

| Token | Value | Usage |
|-------|-------|-------|
| space-1 | 4px | Tight spacing |
| space-2 | 8px | Icon gaps |
| space-3 | 12px | Small padding |
| space-4 | 16px | Standard padding |
| space-5 | 20px | Card padding |
| space-6 | 24px | Section gaps |
| space-8 | 32px | Large gaps |
| space-10 | 40px | Page sections |
| space-12 | 48px | Major sections |

---

## 4. Elevation System

### 4.1 Shadows
```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
--shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 60px rgba(0, 0, 0, 0.15);
--shadow-glass: 0 8px 32px rgba(0, 0, 0, 0.1);
--shadow-glass-hover: 0 20px 60px rgba(102, 126, 234, 0.2);
```

### 4.2 Z-Index Scale
```css
--z-base: 1;
--z-dropdown: 10;
--z-sticky: 20;
--z-sidebar: 40;
--z-header: 50;
--z-modal: 100;
--z-toast: 200;
```

---

## 5. Layout Patterns

### 5.1 User Pages (Glassmorphism)
- **Background**: Gradient (135deg, #f5f7fa → #e4e8ec) [Light] / Gradient (135deg, #1D2129 → #272E3B) [Dark]
- **Cards**: Glass effect (translucent + blur + border)
- **Header**: Transparent → blur on scroll
- **Sidebar**: Glass overlay with blur

### 5.2 Admin Pages (Solid Clean)
- **Background**: Solid gray (#F2F3F5) [Light] / Solid dark (#1D2129) [Dark]
- **Cards**: White solid with subtle shadow [Light] / Dark gray with border [Dark]
- **Header**: White solid with bottom border
- **Sidebar**: White solid with right border

### 5.3 Responsive Breakpoints
```css
--breakpoint-sm: 640px;   /* Mobile landscape */
--breakpoint-md: 768px;   /* Tablet */
--breakpoint-lg: 1024px;  /* Desktop */
--breakpoint-xl: 1280px;  /* Wide desktop */
```

---

## 6. Component Specifications

### 6.1 Card Component

**Variants:**
- `default`: White background, subtle shadow, 16px radius
- `glass`: Translucent background, blur effect, border
- `elevated`: Larger shadow, hover lift effect
- `outlined`: No shadow, border only

**Structure:**
- Optional top accent bar (3px gradient)
- Header with title and optional icon
- Content area
- Optional footer

**States:**
- Default: Normal shadow
- Hover: Elevated shadow, slight translateY(-2px)
- Active: Reduced shadow
- Loading: Skeleton overlay

### 6.2 Button Component

**Variants:**
- `primary`: Gradient background (#667eea → #764ba2), white text
- `secondary`: White background, border, dark text
- `ghost`: Transparent, primary text, hover background
- `danger`: Red background, white text

**Sizes:**
- `sm`: 32px height, 12px horizontal padding
- `md`: 40px height, 16px horizontal padding
- `lg`: 48px height, 24px horizontal padding

**States:**
- Default: Normal
- Hover: Brightness increase, slight scale
- Active: Scale down (0.98)
- Loading: Spinner icon, disabled
- Disabled: Opacity 0.5, no interactions

### 6.3 Badge Component

**Variants (Status):**
- `pending`: Yellow background, yellow text
- `confirmed`: Green background, green text
- `completed`: Blue background, blue text
- `cancelled`: Red background, red text
- `expired`: Gray background, gray text

**Sizes:**
- `sm`: 16px height, 6px horizontal padding
- `md`: 20px height, 8px horizontal padding
- `lg`: 24px height, 12px horizontal padding

### 6.4 Modal Component (Updated)

**Integration:** Wraps PrimeNG p-dialog with standardized slots

**Structure:**
- `[app-modal-header]` / `[appModalHeader]` (optional, replaces default title)
- Default `ng-content` (body)
- `[app-modal-footer]` / `[appModalFooter]` (footer actions)

**Size Presets:**
- `sm`: 400px max width
- `md`: 600px max width (default)
- `lg`: 900px max width
- `fullscreen`: Full screen, no border radius

**Layout Patterns:**
- **Footer Flex Layout**: Row-reverse on desktop, column-reverse on mobile (primary action on right/top)
- **Body Flex**: Column layout with gap spacing

**States:**
- Open: glass-in animation
- Responsive: fullscreen mode on small screens for `fullscreen` size

### 6.5 Chart Component (NEW)

**Integration:** Chart.js via PrimeNG p-chart

**Types:**
- Line chart: Gradient fill, smooth curves, tooltips
- Bar chart: Rounded corners, gradient bars
- Doughnut/Pie: Custom legend, percentages

**Default Colors:**
- Primary: #667eea
- Secondary: #764ba2
- Success: #00B42A
- Warning: #FF7D00
- Danger: #F53F3F
- Info: #1677FF

**Responsive:**
- Maintain aspect ratio
- Hide legend on mobile (show tooltip instead)

---

## 7. Animation Standards

### 7.1 Page Transitions
```css
@keyframes pageEnter {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
Duration: 400ms, Easing: cubic-bezier(0.4, 0, 0.2, 1)
```

### 7.2 Card Hover
```css
transition: transform 0.2s ease, box-shadow 0.2s ease;
hover: transform: translateY(-4px);
```

### 7.3 Loading Skeleton
```css
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
Background: linear-gradient(90deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.5) 100%);
Background-size: 200% 100%;
Animation: shimmer 1.5s infinite;
```

### 7.4 Modal/Dialog
```css
@keyframes glassIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
Duration: 300ms, Easing: cubic-bezier(0.4, 0, 0.2, 1)
```

---

## 8. Dark Mode Implementation

### 8.1 CSS Variables Approach
Use CSS custom properties that switch based on `data-theme` attribute on `<html>` element:

```css
:root {
  /* Light mode variables */
}

[data-theme="dark"] {
  /* Dark mode variables */
}
```

### 8.2 Toggle Mechanism
- System preference detection (`prefers-color-scheme`)
- Manual toggle with localStorage persistence
- Smooth transition between modes (300ms)

### 8.3 Component Adaptations
- All components must use CSS variables, not hardcoded colors
- Images: Use opacity filters or provide dark variants
- Charts: Update color arrays for dark mode
- Shadows: Reduce intensity in dark mode

---

## 9. Admin Dashboard Specific

### 9.1 Stats Cards
- Icon in colored circle (left side)
- Large number (right side, bold)
- Label below number
- Trend indicator (up/down arrow with percentage)
- 4-column grid (responsive: 1→2→4)

### 9.2 Charts
- Booking Trend: Line chart with gradient fill
- Service Popularity: Doughnut chart with custom legend
- Colors: Match semantic colors
- Tooltips: Custom styled

### 9.3 Data Tables
- Striped rows
- Hover highlight
- Sortable headers
- Action buttons (icon buttons)
- Pagination with page size selector

---

## 10. Accessibility

### 10.1 Minimum Requirements
- WCAG 2.2 AA compliance
- Minimum touch target: 44x44px
- Focus visible indicators
- ARIA labels for icon buttons
- Keyboard navigation support

### 10.2 Color Contrast
- Text on background: 4.5:1 minimum
- Large text: 3:1 minimum
- UI components: 3:1 minimum

### 10.3 Motion
- Respect `prefers-reduced-motion`
- Provide static alternatives for animations

---

## 11. Implementation Checklist

### Phase 1: Foundation
- [ ] Update CSS variables in styles.scss
- [ ] Implement dark mode toggle service
- [ ] Update Tailwind theme configuration

### Phase 2: Layout Components
- [ ] Redesign AppHeader (solid background, border, elevation)
- [ ] Redesign AppSidebar (solid background, active states, sections)
- [ ] Update AppLayout (admin vs user mode detection)

### Phase 3: Atomic Components
- [ ] Enhance AppCard (variants: default/glass/elevated/outlined)
- [ ] Enhance AppButton (variants: primary/secondary/ghost/danger)
- [ ] Enhance AppBadge (status colors, sizes)
- [ ] Create AppChart (Chart.js wrapper)

### Phase 4: Admin Pages
- [ ] Redesign Admin Dashboard (stats, charts, tables)
- [ ] Redesign User Management (filters, table, modals)
- [ ] Redesign Service Management (grid, forms)
- [ ] Redesign Appointment Management (calendar, lists)

### Phase 5: User Pages
- [ ] Polish Service Selection (filters, search)
- [ ] Polish Time Slot Picker (calendar widget)
- [ ] Polish My Bookings (status timeline)
- [ ] Polish Profile Page (card layout)

### Phase 6: Auth Pages
- [ ] Polish Login Page (glass card, tabs)
- [ ] Polish Register Page (step indicator)

### Phase 7: Testing
- [ ] Component unit tests
- [ ] Responsive behavior tests
- [ ] Dark mode toggle tests
- [ ] Visual regression tests

---

*Document Version: 1.0*
*Last Updated: 2026-05-02*
*Author: Architect Agent*
