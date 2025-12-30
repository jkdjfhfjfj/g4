# Trading Bot - Telegram Signal Detector & MetaTrader Executor

## Overview
A real-time forex trading bot that:
1. Reads messages from Telegram channels using GramJS
2. Analyzes each message with Groq AI to detect valid trading signals
3. Displays detected signals with confidence scores
4. Executes trades on MetaTrader 4/5 via MetaAPI.cloud
5. Shows live positions, market prices, and trade history

## Architecture

### Frontend (React + TypeScript)
- **Dashboard**: Main layout with sidebar and multi-panel display
- **WebSocket Client**: Real-time updates for messages, signals, positions
- **Components**:
  - `AccountInfo`: Trading account balance/equity display
  - `ChannelList`: Telegram channel selector with search
  - `MessageFeed`: Real-time messages with AI verdict badges
  - `SignalCards`: Detected signals with execute/dismiss actions
  - `PositionsPanel`: Open positions with close button
  - `MarketsPanel`: Market prices with quick trade buttons
  - `HistoryPanel`: Closed trades history
  - `AuthDialog`: Telegram authentication flow

### Backend (Express + WebSocket)
- **Telegram Integration** (`server/telegram.ts`): GramJS client for channel messages
- **Groq AI** (`server/groq-ai.ts`): Signal detection with model fallback
- **MetaAPI** (`server/metaapi.ts`): Trade execution and account management
- **WebSocket Server** (`server/websocket.ts`): Real-time bidirectional communication

### Data Flow
1. User selects a Telegram channel
2. Messages stream via WebSocket to frontend
3. Each message is analyzed by Groq AI
4. Valid signals are displayed with execute button
5. User clicks execute → trade sent to MetaAPI
6. Position updates stream back in real-time

## Environment Variables Required
- `TELEGRAM_API_ID`: From https://my.telegram.org
- `TELEGRAM_API_HASH`: From https://my.telegram.org
- `GROQ_API_KEY`: From https://console.groq.com
- `METAAPI_TOKEN`: From https://app.metaapi.cloud/token
- `METAAPI_ACCOUNT_ID`: Your MetaTrader account ID in MetaAPI

## Key Technologies
- **GramJS**: Telegram MTProto client for Node.js
- **Groq SDK**: Fast AI inference with model fallback
- **MetaAPI.cloud SDK**: MetaTrader cloud trading API
- **WebSocket**: Real-time bidirectional communication
- **TanStack Query**: Data fetching and caching
- **Shadcn/UI**: Component library
- **Tailwind CSS**: Styling

## Groq Models (Fallback Order)
1. llama-3.3-70b-versatile
2. llama-3.1-70b-versatile
3. llama3-70b-8192
4. mixtral-8x7b-32768
5. llama3-8b-8192

## Signal Detection Format
The AI analyzes messages and returns:
```json
{
  "isSignal": true,
  "confidence": 0.85,
  "symbol": "EURUSD",
  "direction": "BUY",
  "entryPrice": 1.0850,
  "stopLoss": 1.0820,
  "takeProfit": [1.0900, 1.0950]
}
```

## Recent Changes
- Initial implementation (Dec 29, 2025)
- Full trading bot with Telegram, Groq AI, and MetaAPI integration
- Real-time WebSocket updates
- Dark/light theme support
- Fixed Telegram auth flow with proper retry handling (Dec 29, 2025)
  - Backend now tracks needs_auth status properly via currentStatus variable
  - Auth errors re-emit phone step so dialog stays open for retry
  - New WebSocket clients receive correct auth state on connect
- Enhanced MetaAPI typing with ExtendedRpcConnection interface
- Dynamic market symbols fetched via connection.getSymbols() with fallback
- Trade history retrieval using RPC API method (7-day range)
- Telegram session persistence (Dec 29, 2025)
  - Session saved to `.telegram_session` file after successful auth
  - Session loaded on startup for persistent connection across restarts
  - File excluded from version control via .gitignore
- Fixed production build static file serving (Dec 29, 2025)
  - Updated static.ts to use `__dirname` for CJS compatibility
  - Production build creates dist/public (frontend) and dist/index.cjs (backend)
  - PM2 ecosystem.config.cjs runs bundle with NODE_ENV=production
- Fixed AUTH_KEY_DUPLICATED session corruption (Dec 29, 2025)
  - Added error handling during Telegram client connection
  - Detects and clears corrupted .telegram_session file automatically
  - Reinitializes client with fresh session and retries connection
  - User gets authentication dialog as expected
- Enhanced features (Dec 30, 2025)
  - Manual Telegram disconnect button in header
  - Message deduplication uses channel+messageId key (`${channelId}:${messageId}`)
  - Cache cleared on channel switch and disconnect to prevent cross-channel suppression
  - Global lot size setting (persisted in `.trading_settings.json`, editable via UI)
  - AI model name displayed for each message analysis
  - Historical messages marked as "skipped" to avoid unnecessary AI analysis
  - Service Worker for background notifications (`notification-worker.js`)

## User Preferences
- Dark mode by default
- Inter font family
- JetBrains Mono for code/numbers
