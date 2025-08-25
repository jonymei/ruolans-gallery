# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ruolan's AI Storybook Gallery is a personal storytelling website showcasing AI-generated children's stories for a 6-year-old girl named Ruolan. It's built with Astro, TypeScript, and Tailwind CSS.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev                    # Starts at localhost:4321

# Build for production
npm run build

# Preview production build
npm run preview

# Audio generation commands
npm run tts story_001          # Generate audio for specific story
npm run tts:all               # Generate audio for all stories
npm run tts:status            # Check audio file status
```

## Architecture Overview

### Story Data System
- **Configuration**: Stories are defined in YAML files at `src/config/XXX.yaml` (where XXX is numeric ID like 001, 002)
- **Images**: Story images stored at `public/stories/XXX/` (cover.png, 01.png-10.png)
- **Audio**: Generated audio files at `public/audios/XXX/` (01.mp3-10.mp3)
- **Data Layer**: `src/lib/stories.ts` handles story loading using Astro's import.meta.glob

### Story Structure
Each story requires:
- YAML config with title, author, createdDate, tags, and 10 pages of text
- Cover image (cover.png) + 10 page images (01.png-10.png)
- Optional audio files (01.mp3-10.mp3) generated via TTS script

### Component Architecture
- **Layout**: Single layout at `src/layouts/Layout.astro`
- **Story Reader**: Responsive components split between desktop and mobile versions
  - Desktop: `src/components/story/desktop/DesktopStoryReader.astro`
  - Mobile: `src/components/story/mobile/MobileStoryReader.astro`
- **Device Detection**: `src/lib/device.ts` handles responsive behavior

### Routing
- **Homepage**: `src/pages/index.astro` - displays story grid
- **Story Reader**: `src/pages/stories/[id].astro` - dynamic story pages
- **About**: `src/pages/about.astro`
- **404**: `src/pages/404.astro`

## Adding New Stories

Follow the detailed process in `STORY_GUIDE.md`:

1. Create story folder: `public/stories/XXX/` with images
2. Create config: `src/config/XXX.yaml` with story data
3. Optional: Generate audio with `npm run tts XXX`
4. Restart dev server to see changes

Story IDs must be 3-digit numbers (001, 002, etc.) and images must follow naming convention (01.png-10.png).

## Audio Generation

The project includes a TTS (Text-to-Speech) script using Minimax API:
- Configure API credentials in `.env` file (MINIMAX_GROUPID, MINIMAX_API_KEY)
- Generates high-quality Chinese audio for story narration
- Detailed usage instructions in `scripts/README.md`

## Technology Stack

- **Framework**: Astro 5.x with TypeScript
- **Styling**: Tailwind CSS + custom CSS
- **Data**: YAML configs + glob imports
- **Audio**: Minimax TTS API integration
- **Icons**: Lucide Icons (imported as needed)

## File Naming Conventions

- Story IDs: 3-digit format (001, 002, 003)
- Config files: `XXX.yaml` in src/config/
- Image files: `cover.png`, `01.png` through `10.png`
- Audio files: `01.mp3` through `10.mp3`
- Story directories: `public/stories/XXX/` and `public/audios/XXX/`

## Key Features

- Responsive story reader with keyboard/touch navigation
- Full-screen reading mode
- Audio playback with story progression
- Automatic story discovery from file system
- Mobile-optimized touch gestures
- Progressive image loading