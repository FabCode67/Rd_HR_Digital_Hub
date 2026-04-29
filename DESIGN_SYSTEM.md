# Design System - Rwanda HR Digital Hub

A comprehensive guide to the design, styling, and visual hierarchy of the Rwanda HR Digital Hub frontend.

## 🎨 Color Palette

### Primary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Purple (Departments) | `#8B5CF6` | `139, 92, 246` | Department cards, dividers |
| Blue (Filled) | `#3B82F6` | `59, 130, 246` | Filled position cards |
| Red (Vacant) | `#EF4444` | `239, 68, 68` | Vacant position cards, alerts |

### Background Colors

| Element | Light Mode | Dark Mode |
|---------|-----------|----------|
| Department Card | `#EDE9FE` | `#2D1B4E` |
| Filled Position | `#EFF6FF` | `#1E3A5F` |
| Vacant Position | `#FEE2E2` | `#5F1F1F` |
| Page Background | `#F8FAFC` | `#0F172A` |

### Text Colors

| Element | Color | Hex |
|---------|-------|-----|
| Primary Text | Foreground | `#0F172A` |
| Secondary Text | Muted Foreground | `#64748B` |
| Department Text | `#581C87` | Purple dark |
| Filled Position Text | `#1E40AF` | Blue dark |
| Vacant Position Text | `#991B1B` | Red dark |

## 📐 Typography

### Font Stack

```css
/* Sans Serif (UI) */
font-family: "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

/* Monospace (Code) */
font-family: "Geist Mono", "SF Mono", Monaco, monospace;
```

### Font Sizes

| Scale | Size | Line Height | Usage |
|-------|------|-----------|-------|
| xs | 12px | 16px | Labels, badges |
| sm | 14px | 20px | Secondary text |
| base | 16px | 24px | Body text |
| lg | 18px | 28px | Subheadings |
| xl | 20px | 28px | Headings |
| 2xl | 24px | 32px | Main headings |
| 3xl | 30px | 36px | Page titles |
| 4xl | 36px | 40px | Large titles |

### Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| Regular | 400 | Body text |
| Medium | 500 | Labels, secondary headings |
| Semibold | 600 | Card titles, position names |
| Bold | 700 | Page titles, department names |

## 🎯 Component Styles

### Department Card

```
┌─────────────────────────────────────┐
│ ▼ 🏢 Department Name               │
│   Description text here...          │
└─────────────────────────────────────┘
```

**Styles:**
- Border: 2px solid (purple-400 or purple-300)
- Background: purple-50 (light) or purple-950/20 (dark)
- Padding: 12px 12px
- Border Radius: 8px
- Hover: Border becomes darker, background highlights
- Font: Medium weight for name, small muted for description

### Position Card (Filled)

```
┌─────────────────────────────────────┐
│ ▼ 👤 Senior Manager                │
│      John Doe                       │
│   Level: Head                       │
│   Band: Band 4                      │
└─────────────────────────────────────┘
```

**Styles:**
- Border: 2px solid (blue-400)
- Background: blue-50 (light) or blue-950/20 (dark)
- Padding: 12px 12px
- Border Radius: 8px
- Title: Blue-700 (light) or blue-300 (dark), semibold
- Text: Blue-700/blue-300 color scheme

### Position Card (Vacant)

```
┌─────────────────────────────────────┐
│ ▼ 🚨 IT System Analyst             │
│      🔴 Vacant                      │
│   Level: Officer                    │
│   Band: Band 3                      │
└─────────────────────────────────────┘
```

**Styles:**
- Border: 2px solid (red-400)
- Background: red-50 (light) or red-950/20 (dark)
- Padding: 12px 12px
- Border Radius: 8px
- Title: Red-700 (light) or red-300 (dark), semibold
- Badge: Inline "Vacant" with alert icon
- Text: Red-600/red-400 color scheme

### Expand/Collapse Button

```
  ▶ (Collapsed)    or    ▼ (Expanded)
```

**Styles:**
- Size: 16x16px
- Color: Muted foreground
- Hover: Darker, slight background
- Padding: 4px
- Border Radius: 4px

### Details Drawer

```
┌─────────────────────────────────────┐
│ Position Details              ✕     │  ← Header
├─────────────────────────────────────┤
│                                     │
│ Senior Manager                      │  ← Content
│ Level: Head                         │     (scrollable)
│ Band: Band 4                        │
│                                     │
│ Assigned Employee                   │
│ John Doe                            │
│ john@company.com                    │
│                                     │
└─────────────────────────────────────┘
```

**Styles:**
- Width: Full on mobile, max 384px on desktop
- Position: Fixed right side
- Overlay: Semi-transparent dark (bg-black/50)
- Header: Flex, justify-between, border-b, py-4, px-6
- Content: py-6, px-6, space-y-6
- Border: Left 1px solid (border color)

## 🔄 Spacing

### Padding Scale

```
xs: 4px (0.25rem)
sm: 8px (0.5rem)
md: 12px (0.75rem)
lg: 16px (1rem)
xl: 20px (1.25rem)
2xl: 24px (1.5rem)
3xl: 32px (2rem)
```

### Margin Scale

Same as padding scale.

### Gap Between Components

| Component | Gap |
|-----------|-----|
| Vertical spacing | 8-12px (sm) |
| Tree indentation | 24px (1.5rem) |
| Card spacing | 12px (0.75rem) |
| Section spacing | 24-32px |

## 🎭 Interactive States

### Hover State

```css
/* Department */
border-color: purple-500;
background-color: purple-100;

/* Filled Position */
border-color: blue-500;
background-color: blue-100;

/* Vacant Position */
border-color: red-500;
background-color: red-100;
```

### Focus State

```css
outline: 2px solid ring-color;
outline-offset: 2px;
```

### Disabled State

```css
opacity: 50%;
cursor: not-allowed;
pointer-events: none;
```

## 🌓 Dark Mode

### Dark Mode Color Overrides

| Element | Light | Dark |
|---------|-------|------|
| Department text | `text-purple-900` | `text-purple-100` |
| Department border | `border-purple-400` | `border-purple-700` |
| Filled text | `text-blue-900` | `text-blue-100` |
| Filled border | `border-blue-400` | `border-blue-700` |
| Vacant text | `text-red-900` | `text-red-100` |
| Vacant border | `border-red-400` | `border-red-700` |

Applied via Tailwind dark mode:

```tsx
<div className="text-purple-900 dark:text-purple-100">
  Content
</div>
```

## 📱 Responsive Breakpoints

```
xs: 0px (mobile)
sm: 640px (tablet)
md: 768px (small laptop)
lg: 1024px (laptop)
xl: 1280px (desktop)
2xl: 1536px (large desktop)
```

### Responsive Behaviors

| Breakpoint | Tree Width | Font Size | Padding |
|-----------|-----------|-----------|---------|
| xs (mobile) | 100% | sm | md |
| sm (tablet) | 90% | base | md |
| md+ (desktop) | 80% | base | lg |

## 🎬 Animations

### Expand/Collapse Animation

```css
transition: max-height 300ms ease-out;
```

### Hover Animation

```css
transition: all 200ms ease-in-out;
```

### Page Transition

```css
transition: opacity 300ms ease-out;
```

### Animation Configuration

```typescript
// lib/config.ts
UI_CONFIG: {
  animationDuration: 300, // milliseconds
  enableAnimations: true,
}
```

## 🏗️ Layout Patterns

### Tree Layout

```
Department
  ├─ Position (child)
  │   └─ Position (grandchild)
  └─ Position (child)
```

### Drawer Layout

```
Page
  ├─ Overlay (semi-transparent)
  └─ Drawer
      ├─ Header (sticky)
      ├─ Content (scrollable)
      └─ Footer (optional)
```

### Page Layout

```
Viewport
  └─ Main Container
      ├─ Header
      ├─ Content (tree)
      └─ Footer/Legend
```

## 🔤 Icon Usage

### Lucide React Icons

Used from the lucide-react library:

| Icon | Usage | Size |
|------|-------|------|
| `ChevronDown` | Expand indicator | 16px |
| `ChevronRight` | Collapse indicator | 16px |
| `Building2` | Department icon | 18px |
| `User` | Filled position | 14px |
| `AlertCircle` | Vacancy indicator | 12-14px |
| `Loader2` | Loading spinner | 20px |
| `X` | Close button | 16px |

## 📐 Sizing

### Card Dimensions

| Element | Width | Height |
|---------|-------|--------|
| Department Card | Min 100% | Auto |
| Position Card | Min 100% | Auto |
| Drawer | 384px max | 100vh |
| Icon | Varies (12-20px) | Varies |

## ✨ Visual Hierarchy

### Emphasis Levels

**Level 1 (Highest)**: Page title, department name, position title
- Font size: 20-24px
- Font weight: Bold (700)
- Color: Primary foreground

**Level 2 (High)**: Card content, employee name, level info
- Font size: 14-16px
- Font weight: Semibold (600)
- Color: Foreground

**Level 3 (Medium)**: Secondary text, descriptions
- Font size: 12-14px
- Font weight: Regular (400)
- Color: Muted foreground

**Level 4 (Low)**: Hints, timestamps, metadata
- Font size: 12px
- Font weight: Regular (400)
- Color: Muted foreground (lighter)

## 🎨 Examples

### Complete Department View

```
┌─ Organization Structure ─────────────────────┐
│                                              │
│ [Filter] [Export]                            │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ ▼ 🏢 Executive Management               │ │
│ │   Core leadership structure              │ │
│ ├──────────────────────────────────────────┤ │
│ │                                          │ │
│ │  ┌──────────────────────────────────┐  │ │
│ │  │ 👤 Managing Director             │  │ │
│ │  │    Jane Smith                    │  │ │
│ │  │ Head · Band 7                    │  │ │
│ │  └──────────────────────────────────┘  │ │
│ │                                         │ │
│ │  ┌──────────────────────────────────┐  │ │
│ │  │ 🚨 CFO Position                  │  │ │
│ │  │    🔴 VACANT                     │  │ │
│ │  │ Head · Band 7                    │  │ │
│ │  └──────────────────────────────────┘  │ │
│ │                                          │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ Legend:                                      │
│ 🔵 Filled Position    🔴 Vacant Position    │
│                                              │
└──────────────────────────────────────────────┘
```

## 🚀 Implementation Notes

- All colors use Tailwind CSS classes
- Responsive design uses Tailwind breakpoints
- Animations use Tailwind transitions
- Dark mode uses `dark:` prefix
- Icons from lucide-react
- Fonts from Google Fonts (Geist)

## 📚 References

- Tailwind CSS: https://tailwindcss.com
- Radix UI: https://www.radix-ui.com
- Lucide Icons: https://lucide.dev
- shadcn/ui: https://ui.shadcn.com

---

**Design System Version**: 1.0.0  
**Last Updated**: April 2026  
**Status**: Production Ready
