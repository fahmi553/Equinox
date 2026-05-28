# Equinox Roadmap

Equinox is a private digital ecosystem.

It is not just a NAS app or another website project. The goal is to become a self-hosted system that combines:

- private cloud storage
- productivity system
- home server dashboard
- family platform
- developer playground
- future automation and AI layer

The core idea is simple: one self-hosted system that you own.

No subscriptions. No vendor lock-in. No monthly fees.

## Core Philosophy

Equinox should centralize parts of digital life that are usually scattered across:

- Google Drive
- OneDrive or iCloud
- Notion
- Trello
- Obsidian
- Spotify playlists
- password managers
- cloud storage
- shared family apps
- Discord bots
- public hosting
- random productivity apps

Equinox should grow into your own private operating system for digital life.

## Version 1: Foundation

Keep v1 small and useful.

- [x] Docker Compose stack
- [x] Vue 3 frontend
- [x] Node.js Express backend
- [x] PostgreSQL database
- [x] Prisma ORM
- [x] JWT login system
- [x] First registered user becomes admin
- [x] Notes
- [x] Reminders
- [x] File upload
- [x] Folder support
- [x] Private/shared file visibility
- [x] File download
- [x] File delete
- [x] Basic activity log
- [x] Proper app navigation and routes
- [x] Dedicated dashboard page
- [x] Dedicated file manager page
- [x] Dedicated notes page
- [x] Dedicated reminders page
- [x] Family account management UI
- [x] Delete confirmations
- [x] Better empty states

## Main Product Areas

### 1. Personal Cloud Storage

Like Google Drive, OneDrive, or iCloud, but private and self-hosted.

- [x] Upload files
- [x] Organize with folders
- [x] Download files
- [x] Delete files
- [x] Share files with family users
- [ ] Rename files
- [ ] Move files between folders
- [ ] Folder sharing rules
- [ ] Storage usage dashboard
- [ ] File search
- [ ] File previews
- [ ] Automatic backups
- [ ] Remote access via Tailscale

### 2. Family Digital Hub

Each family member should have an account, storage, dashboard, and permissions.

- [x] User accounts
- [x] Admin/family roles
- [x] Family account creation UI
- [ ] User profile page
- [ ] Shared family notes
- [ ] Shared family folders
- [ ] Important documents area
- [ ] Bills/documents tracker
- [ ] Family announcements
- [ ] Per-user storage visibility
- [ ] Permission controls

### 3. Personal Productivity System

Like a simple private Notion, Trello, or Obsidian.

- [x] Notes
- [x] Reminders
- [ ] Tasks
- [ ] Projects
- [ ] Project boards
- [ ] Tags
- [ ] Bookmarks
- [ ] Quick snippets
- [ ] Search across notes/files/bookmarks
- [ ] Markdown support

### 4. Self-Hosted Media Center

Optional later. Equinox does not need to replace mature media apps immediately, but it can integrate with them.

- [ ] Photo gallery
- [ ] Music library
- [ ] Video/media library
- [ ] Jellyfin integration
- [ ] Navidrome integration
- [ ] Immich integration
- [ ] Media indexing

### 5. Developer Control Center

For home server and developer use.

- [ ] Docker container overview
- [ ] Project deployment list
- [ ] Server health dashboard
- [ ] CPU/RAM/disk usage
- [ ] Logs viewer
- [ ] Backup status
- [ ] Minecraft server panel
- [ ] Service restart controls
- [ ] NAS deployment guide

### 6. AI and Automation Platform

Future layer after the core system is stable.

- [ ] Local AI assistant
- [ ] Smart file tagging
- [ ] Smart search
- [ ] Voice assistant
- [ ] Automation workflows
- [ ] Scheduled jobs
- [ ] Notification rules

## Technical Architecture

Current recommended stack:

- Frontend: Vue 3 + Vite
- Backend: Node.js + Express
- Database: PostgreSQL
- ORM: Prisma
- Auth: JWT
- Storage: Docker volume/local filesystem
- Deployment: Docker Compose
- Remote access: Tailscale

Target structure:

```text
Equinox
├── frontend: Vue 3
├── backend: Node.js Express API
├── database: PostgreSQL
├── storage: Docker volume/local filesystem
├── auth: username/password login
├── remote access: Tailscale
└── deployment: Docker Compose, later NAS
```

Storage direction:

```text
/storage/uploads
/storage/family
/storage/media
/storage/backups
```

## Long-Term Vision

Eventually, these devices should connect into Equinox:

- phone
- laptop
- PC
- NAS
- smart TV

Equinox should become the private ecosystem that ties them together.

## Development Rule

Do not build everything at once.

Build in layers:

1. Make the foundation stable.
2. Make the core features useful.
3. Make the UI easy for average family users.
4. Add admin and server features.
5. Add media, automation, and AI later.

Next recommended implementation:

- [x] Frontend app shell and routing
- [x] Split the single-page UI into real pages
- [x] Improve file manager UX
- [x] Add family account management UI
