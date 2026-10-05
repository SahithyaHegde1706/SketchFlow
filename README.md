# SketchFlow

An Excalidraw-inspired collaborative whiteboard built with Next.js, TypeScript, HTML Canvas, Socket.IO, and PostgreSQL.

## Overview

SketchFlow is a modern collaborative whiteboard application that enables real-time drawing, diagramming, and idea collaboration. It features an infinite-style canvas with comprehensive drawing tools, real-time multi-user collaboration, and persistent board storage.

## Features

### Drawing & Editing
- Freehand drawing, eraser, rectangles, circles, arrows, and text elements
- Selection and multi-selection with move, resize, and rotate
- Copy, paste, duplicate, and delete elements
- Grouping, layer management, and element locking
- Snapping with alignment guides
- Undo / redo history

### Canvas
- Pan and zoom with smooth controls
- Customizable background color and dot grid
- Light / dark theme with persisted preference
- Responsive UI design

### Images & Text
- Insert images from local files with crop, resize, rotate, and flip
- Image styling: opacity, corner radius, shadow
- Rich text formatting: color, font family, size, bold, italic, underline, alignment

### Export
- Export to PNG
- Export to SVG

### Real-time Collaboration
- Persistent boards with create, load, and share via URL
- Real-time element creation, updates, and deletion
- Freehand stroke synchronization
- Text content synchronization
- Collaborator presence indicators
- Collaborator cursors and selections
- Collaborative viewport synchronization
- Reconnection handling
- Collaborative undo/redo

## Tech Stack

### Frontend
- Next.js 16.3.4 with App Router
- React 19.2.8
- TypeScript
- Tailwind CSS 4
- HTML Canvas API
- Socket.IO Client

### Backend
- Node.js with Express
- Socket.IO
- TypeScript

### Database
- PostgreSQL
- Prisma ORM
- Neon PostgreSQL (hosted database)

## Architecture

```
Browser
  ↓
Next.js Frontend
  ↓
Socket.IO
  ↓
Express Backend
  ↓
Prisma ORM
  ↓
PostgreSQL / Neon
```

The frontend and backend are organized as separate pnpm workspace packages for clean dependency management and scalability.

## Project Structure

```
SketchFlow/
├── frontend/          # Next.js frontend application
│   ├── src/
│   │   ├── app/      # Next.js App Router pages
│   │   ├── canvas/   # Canvas rendering and geometry
│   │   ├── collaboration/  # Real-time collaboration logic
│   │   ├── components/     # React components
│   │   ├── document/       # Document state and serialization
│   │   ├── editor/         # Editing operations
│   │   └── export/         # Export functionality
│   └── package.json
├── backend/           # Express + Socket.IO backend
│   ├── prisma/        # Prisma schema and migrations
│   ├── server.ts      # Express server with Socket.IO
│   └── package.json
├── package.json       # Root package with workspace scripts
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 11.3.0
- PostgreSQL database (or Neon account)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd SketchFlow
```

2. Install dependencies:
```bash
pnpm install
```

3. Configure environment variables (see [Environment Variables](#environment-variables))

4. Generate Prisma client and apply migrations:
```bash
pnpm --filter @sketchflow/backend exec prisma generate
pnpm --filter @sketchflow/backend exec prisma migrate deploy
```

5. Start the development servers:
```bash
# Terminal 1: Start backend
pnpm --filter @sketchflow/backend dev

# Terminal 2: Start frontend
pnpm --filter @sketchflow/frontend dev
```

Or start both simultaneously:
```bash
pnpm dev:all
```

The frontend will be available at `http://localhost:3000` and the backend at `http://localhost:4000`.

## Environment Variables

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

### Backend (`.env`)
```env
DATABASE_URL=postgresql://user:password@host:port/database
DIRECT_URL=postgresql://user:password@host:port/database
PORT=4000
```

Replace the placeholder values with your actual PostgreSQL connection details.

## Available Scripts

### Root scripts
- `pnpm dev` - Start frontend development server
- `pnpm dev:backend` - Start backend development server
- `pnpm dev:all` - Start both frontend and backend
- `pnpm build` - Build frontend for production
- `pnpm start` - Start production frontend server
- `pnpm lint` - Lint frontend code
- `pnpm lint:backend` - Typecheck backend code
- `pnpm typecheck` - Typecheck frontend code

### Backend scripts
- `pnpm --filter @sketchflow/backend dev` - Start backend with hot reload
- `pnpm --filter @sketchflow/backend typecheck` - Generate Prisma client and typecheck
- `pnpm --filter @sketchflow/backend exec prisma generate` - Generate Prisma client
- `pnpm --filter @sketchflow/backend exec prisma migrate dev` - Run development migrations
- `pnpm --filter @sketchflow/backend exec prisma migrate deploy` - Apply migrations in production

### Frontend scripts
- `pnpm --filter @sketchflow/frontend dev` - Start Next.js development server
- `pnpm --filter @sketchflow/frontend build` - Build for production
- `pnpm --filter @sketchflow/frontend start` - Start production server
- `pnpm --filter @sketchflow/frontend lint` - Run ESLint
- `pnpm --filter @sketchflow/frontend typecheck` - Run TypeScript type checking

## Deployment

The intended production architecture:

- **Frontend**: Vercel (Next.js optimized hosting)
- **Backend**: Render or another persistent Node.js host with WebSocket support
- **Database**: Neon PostgreSQL

## Known Limitations

- No authentication or user accounts yet
- No advanced conflict-resolution system (CRDT/OT) for concurrent edits
- Reconnection does not provide full historical document replay for changes missed while disconnected

These areas are planned for future improvements.

## Roadmap

- Authentication system with user accounts
- Board ownership and permissions
- Viewer/editor role management
- Stronger document recovery and conflict resolution
- Automated test suite
- Performance optimizations
- Security hardening
