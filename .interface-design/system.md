# Sebastian Interface Design System

## Direction & Feel
Clinical precision meets technical authority. Inspired by biomed-demo's medical device aesthetic — dark navy sidebar anchoring a clean, light workspace. The feel is "operating room control panel": trustworthy, dense with information, but never cluttered.

## Color Palette (OKLCH)
- **Primary**: `oklch(0.55 0.18 250)` — Deep medical blue (#0b5cab equivalent)
- **Secondary**: `oklch(0.65 0.15 240)` — Lighter blue (#1673c8 equivalent)
- **Accent**: `oklch(0.60 0.18 155)` — Success green (#14805e equivalent)
- **Destructive**: `oklch(0.55 0.22 25)` — Alert red (#c53d45 equivalent)
- **Background**: `oklch(0.97 0.005 250)` — Cool off-white (#f4f7fa equivalent)
- **Card**: `oklch(1.0 0 0)` — Pure white
- **Muted**: `oklch(0.55 0.02 250)` — Muted text (#627184 equivalent)
- **Border**: `oklch(0.90 0.01 250)` — Subtle borders (#dbe3ec equivalent)
- **Sidebar**: `oklch(0.25 0.05 250)` — Dark navy (#0c2948 equivalent)

## Chart Colors
1. `#1673c8` — Pressure line (blue)
2. `#14a37f` — Temperature/force line (teal-green)
3. `#f59e0b` — Warning/amber
4. `#8b5cf6` — Group 4 accent (purple)

## Typography
- **Font**: Plus Jakarta Sans (body), JetBrains Mono (code/numbers)
- **Hero numbers**: 44px / 900 weight / -0.06em tracking / tabular-nums
- **Metric values**: 28px / 800 weight / -0.045em tracking / tabular-nums
- **Headings**: 28px/700, 22px/600, 18px/600
- **Body**: 14px/400
- **Labels**: 11px/700 uppercase tracking 0.08em

## Depth Strategy
- **Borders**: 1px solid border-border/60 for cards, border-border for inputs
- **Shadows**: Subtle, blue-tinted — `0 4px 15px hsl(250 20% 20% / 0.03)` for cards
- **Radius**: 10px (0.625rem) base, xl for cards, rounded-full for badges
- **Elevation**: Sidebar is darkest (navy), cards are white, page is off-white

## Spacing
- **Base unit**: 4px (0.25rem)
- **Card padding**: 20px (p-5)
- **Section gaps**: 24px (gap-6)
- **Component gaps**: 16px (gap-4)
- **Micro gaps**: 8px (gap-2)

## Key Components

### Sidebar
- Width: 260px fixed
- Background: sidebar token (navy)
- Nav items: 36px height, 12px horizontal padding, rounded-lg
- Active state: `oklch(0.45 0.12 250)` background with 3px left accent border in primary color
- Hover: `rgba(255, 255, 255, 0.07)` background

### MetricCard
- Hero number: 44px / 900 weight / tabular-nums
- Decorative circle: 96px, positioned top-right with negative offset, 5% opacity of accent color
- Icon container: 44px rounded-xl with 10% opacity background

### GroupOrb
- Circular pressure indicator with SVG progress ring
- Size variants: sm (56px), md (80px), lg (112px)
- Color changes by state: inflating=blue, holding=green, deflating=amber, done=green, error=red

### StatusBadge
- Pill shape with 7px dot indicator
- Font: 12px / 800 weight
- Variants: good (green), bad (red), warn (amber), info (blue), neutral (gray)

### Buttons
- Border-radius: 10px
- Font-weight: 750 (bold)
- Hover: translateY(-1px) lift effect
- Active: translateY(0) press effect
- Transition: 0.15s on transform, background, border

## Layout Patterns
- **Dashboard**: Sidebar (260px) + Topbar (72px) + Content area (max-width 1600px)
- **Metric grid**: 4-column on xl, 2-column on md, 1-column on sm
- **Group cards**: 4-column grid with colored top border (3px)
- **Charts**: Recharts with custom axis styling, 2.5px stroke width

## Signature Elements
1. **GroupOrb** — Circular pressure indicator unique to this 4-channel system
2. **Navy sidebar** — Dark anchor providing clinical authority
3. **Hero numbers** — 44px/900 weight metric displays
4. **Colored top borders** — 3px accent borders on group cards
5. **Decorative circles** — Subtle 5% opacity circles in metric cards

## Motion
- **Button press**: 0.15s translateY
- **Progress bars**: 0.5s width transition
- **GroupOrb ring**: 0.5s stroke-dashoffset transition
- **Reduced motion**: Respects prefers-reduced-motion

## Responsive Breakpoints
- **xl**: 1280px+ (4-column grids)
- **lg**: 1024px+ (sidebar visible)
- **md**: 768px+ (2-column grids)
- **sm**: 640px+ (single column)
