# Equinox Roadmap - Old Version Archive

This file preserves the previous Equinox roadmap before the 2.0 pivot.

The old direction treated Equinox more like a private cloud and NAS-adjacent application. It is archived for reference only. The active roadmap is now [EQUINOX_ROADMAP.md](EQUINOX_ROADMAP.md).

## Old Core Idea

Equinox is a private digital ecosystem.

It is not just a NAS app or another website project. The goal is to become a self-hosted system that combines:

- private cloud storage
- productivity system
- home server dashboard
- family platform
- developer playground
- future automation and AI layer

The core idea was simple: one self-hosted system that you own.

No subscriptions. No vendor lock-in. No monthly fees.

## Old Version 1 Foundation

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
- [x] In-app visual user guide
- [x] Delete confirmations
- [x] Better empty states

## Old Product Areas

### Personal Cloud Storage

- [x] Upload files
- [x] Organize with folders
- [x] Download files
- [x] Delete files
- [x] Share files with family users
- [x] Rename files
- [x] Move files between folders
- [x] Folder sharing rules
- [x] Storage usage dashboard
- [x] File search
- [x] File previews
- [ ] Automatic backups
- [ ] Remote access via Tailscale

### Family Digital Hub

- [x] User accounts
- [x] Admin/family roles
- [x] Family account creation UI
- [x] User profile page
- [x] Shared family notes
- [x] Shared family reminders
- [x] Shared family folders
- [x] Important documents area
- [x] Bills/documents tracker
- [x] Family announcements
- [x] Per-user storage visibility
- [x] Permission controls
- [x] Role-based permission defaults

### Personal Productivity System

- [x] Notes
- [x] Reminders
- [x] Shared reminders
- [x] Tasks
- [ ] Projects
- [ ] Project boards
- [x] Tags
- [x] Bookmarks
- [ ] Quick snippets
- [x] Search across notes/files/bookmarks
- [ ] Markdown support

### Self-Hosted Media Center

- [ ] Photo gallery
- [ ] Music library
- [ ] Video/media library
- [ ] Jellyfin integration
- [ ] Navidrome integration
- [ ] Immich integration
- [ ] Media indexing

### Developer Control Center

- [ ] Docker container overview
- [ ] Project deployment list
- [ ] Server health dashboard
- [ ] CPU/RAM/disk usage
- [ ] Logs viewer
- [ ] Backup status
- [ ] Minecraft server panel
- [ ] Service restart controls
- [ ] NAS deployment guide

### AI and Automation Platform

- [ ] Local AI assistant
- [ ] Smart file tagging
- [ ] Smart search
- [ ] Voice assistant
- [ ] Automation workflows
- [ ] Scheduled jobs
- [ ] Notification rules

## Old Technical Direction

- Frontend: Vue 3 + Vite
- Backend: Node.js Express API
- Database: PostgreSQL
- ORM: Prisma
- Auth: JWT
- Storage: Docker volume/local filesystem
- Deployment: Docker Compose
- Remote access: Tailscale

## Reason For Archive

Equinox 2.0 changes the architectural direction:

- Equinox should not replace NAS functionality.
- Equinox should orchestrate NAS services and self-hosted services through adapters.
- NAS storage, media libraries, photos, and server features should be integrated rather than rebuilt.
