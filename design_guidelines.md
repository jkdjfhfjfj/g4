# Trading Bot Dashboard - Design Guidelines

## Design Approach
**System-Based:** Drawing from Linear's clean data presentation, Robinhood's trading interface clarity, and Material Design principles for information-dense applications. Focus on real-time data visibility, quick actionability, and professional trading aesthetics.

## Layout Architecture

**Dashboard Grid System:**
- Main container: Two-column layout on desktop (sidebar + main content area)
- Left sidebar (280px fixed): Channel selection, account selector
- Main content (flex-1): Multi-panel dashboard with real-time feeds
- Mobile: Stack vertically with collapsible sidebar

**Spacing Primitives:** Tailwind units of 2, 3, 4, 6, and 8 for consistent rhythm

## Typography Hierarchy

**Font Stack:** Inter (primary) via Google Fonts CDN
- Page titles: text-2xl font-semibold
- Section headers: text-lg font-medium
- Data labels: text-sm font-medium uppercase tracking-wide
- Body text: text-base
- Metadata/timestamps: text-xs text-gray-500

## Core Components

**1. Top Navigation Bar**
- Height: h-16
- Contains: Trading account selector (dropdown), connection status indicator, balance display
- Sticky positioning for persistent access

**2. Sidebar Panel**
- Channel list with search/filter
- Active channel highlighted with subtle background
- Channel metadata (member count, last message time)
- Scrollable list with fixed header

**3. Main Dashboard Panels (Grid Layout)**
- **Markets Panel:** Compact table with Symbol | Price | Change | Trade button
- **Running Positions:** Card-based list showing Entry/Current/P&L with close buttons
- **Detected Signals:** Alert-style cards with timestamp, confidence score, signal type (BUY/SELL), source
- **Message Feed:** Real-time scrolling feed with message content + AI verdict badge
- **Trade History:** Tabular format with Date | Pair | Type | Entry | Exit | Result

**4. Message Feed Component**
- Each message: Card with sender, timestamp, content, AI verdict badge
- Verdict badges: Small pill-shaped indicators (Valid Signal / No Signal / Analyzing...)
- Auto-scroll with pause-on-hover functionality
- WebSocket status indicator

**5. Signal Cards**
- Prominent visual treatment for detected signals
- Display: Currency pair, direction, entry price, stop loss, take profit
- Action buttons: Execute Trade, Dismiss
- Confidence meter (visual bar)

**6. Trade Execution Modal**
- Overlay form for trade confirmation
- Fields: Lot size, stop loss, take profit (pre-filled from signal)
- Risk calculator showing potential P&L
- Confirm/Cancel actions

## Component Patterns

**Data Tables:**
- Zebra striping for row clarity
- Sticky headers
- Hover states for interactive rows
- Icon buttons for actions (Heroicons)

**Status Indicators:**
- Dot indicators for connection status (green/red/yellow)
- Badge components for signal types, P&L status
- Real-time updating values with subtle highlight animation on change

**Action Buttons:**
- Primary: Trade execution (prominent, accent color)
- Secondary: View details, dismiss
- Danger: Close position (red treatment)
- All buttons: px-4 py-2, rounded-md

## Responsive Behavior

**Desktop (lg+):** Multi-column grid dashboard
**Tablet (md):** Two-column with collapsible sidebar
**Mobile:** Single column stack, bottom navigation for quick access to Positions/Signals/History

## Real-Time Indicators

- Pulsing animation for "Analyzing" state
- Smooth transitions for new messages/signals appearing
- Connection status badge in top bar
- Last update timestamp on data panels

## Icons
**Heroicons** (via CDN) for all UI icons:
- Chart icons for markets
- Signal/alert icons for detected signals
- Arrow icons for trade directions
- Status icons for connections

## Critical UX Features

- **No viewport forcing:** All panels use natural content height
- **Fixed action buttons:** Trade and close position buttons always visible in their panels
- **Clear hierarchy:** Signals and positions prioritized over message feed
- **Data density:** Compact but readable - maximize information without clutter
- **Performance:** Virtualized lists for message feeds and history tables

## Images
No hero images. This is a data-focused dashboard. Use icon-based visual elements and charts where appropriate (consider chart.js for price visualizations if needed).