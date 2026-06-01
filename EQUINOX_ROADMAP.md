# Equinox Roadmap

## Equinox 2.0 Vision

Equinox is not a NAS replacement.

Equinox is a self-hosted digital ecosystem platform that provides one interface for family services, productivity tools, media, projects, and NAS resources through standard integrations.

```text
User
  |
  v
Equinox
  |
  v
Apps & Services
  |
  v
NAS Infrastructure
```

The user should not need to understand SMB, WebDAV, Docker, PostgreSQL, Jellyfin, Immich, Tailscale, or UGOS. Those are implementation details behind Equinox.

## Core Principles

### 1. Do Not Rebuild NAS Functions

Equinox should not rebuild:

- RAID
- storage pools
- snapshots
- disk health
- SMART monitoring
- NAS share management

UGOS, TrueNAS, Unraid, and other infrastructure platforms already handle those better.

### 2. Build The User Experience

Equinox should focus on:

- dashboard
- family hub
- notes
- tasks
- announcements
- unified search
- unified navigation
- simple family-friendly workflows

### 3. Use Standard Integrations

Equinox should communicate through adapters and standard interfaces:

- WebDAV
- SMB
- Docker
- SSH
- REST APIs

Do not hardcode Equinox specifically to UGREEN. UGREEN is the first deployment target, not the permanent architectural boundary.

## Module Structure

### Module A - Identity

Purpose: who is using Equinox?

- login
- family accounts
- user profiles
- roles
- permission defaults
- per-user overrides

Target roles:

- Admin
- Family Member
- Guest
- Child

### Module B - Dashboard

Main homepage.

- storage usage summary
- recent files
- recent photos
- recent tasks
- announcements
- server status
- quick module shortcuts

### Module C - Family Hub

Shared family space.

- announcements
- calendar
- shopping list
- birthdays
- shared notes
- important documents
- shared tasks
- household chat
- in-app notifications

### Module D - File Portal

Not a file system replacement. A portal over storage services.

- files
- folders
- upload
- download
- search
- tags
- adapter-backed storage

Storage should live on NAS or another storage backend, not inside Equinox as the long-term source of truth.

### Module E - Photo Portal

Future module.

Possible backends:

- Immich
- UGOS Photos
- generic photo API adapter

### Module F - Media Portal

Future module.

Possible backends:

- Jellyfin
- Navidrome
- Audiobookshelf

The user sees movies, TV, music, and audiobooks without needing to know which service provides them.

### Module G - Project Portal

Developer and project workspace.

- project list
- documentation
- GitHub repositories
- deployments
- Docker containers

### Module H - Server Portal

NAS and service status.

- CPU
- RAM
- storage
- network
- Docker
- UPS status
- service health

### Module I - Automation Portal

Future automation layer.

- scheduled backups
- file cleanup
- photo organization
- notifications
- workflow automations

## Integration Layer

All infrastructure communication should go through adapters.

```text
Equinox
|-- UI Layer
|-- Business Logic
|-- Database
`-- Integration Layer
    |-- Local Storage Adapter
    |-- WebDAV Adapter
    |-- SMB Adapter
    |-- Docker Adapter
    |-- SSH Adapter
    `-- API Adapter
```

This keeps Equinox portable across:

- Windows PC
- UGREEN NAS
- TrueNAS
- Unraid
- mini-PC server
- future self-hosted infrastructure

## Technology Stack

### Frontend

- Vue 3
- Vite
- Pinia
- Vue Router
- Tailwind CSS

### Backend

- Node.js
- Express
- Prisma

### Database

- PostgreSQL

Equinox database stores application data only:

- users
- roles
- permissions
- notes
- tasks
- announcements
- bookmarks
- tags
- settings
- activity logs
- integration metadata

Equinox should not treat media files or NAS storage as database-owned application data.

### Infrastructure

- Docker
- Docker Compose
- Tailscale

## Development Roadmap

### Phase 1 - Foundation

No NAS required.

- [x] Authentication
  - [x] Login
  - [x] First admin bootstrap
  - [x] Session handling
- [x] Identity
  - [x] Admin role
  - [x] Family Member role
  - [x] Guest role
  - [x] Child role
  - [x] User profiles
  - [x] Role permission defaults
  - [x] Per-user permission overrides
- [x] Core dashboard
  - [x] Dashboard shell
  - [x] Recent activity
  - [x] Announcements widget
  - [x] Task summary
  - [x] Service status placeholder
- [x] Productivity basics
  - [x] Notes
  - [x] Tasks
  - [x] Tags
  - [x] Bookmarks
  - [x] Announcements
- [x] Family communication
  - [x] Household chat
  - [x] Personal one-to-one chat
  - [x] Custom chat deletion confirmation
  - [x] Personal notification inbox
  - [x] Unread notification badge
  - [x] Chat and announcement notifications
- [x] Activity logs
  - [x] Admin-only sensitive account history
  - [x] Private owner activity filtering
  - [x] Shared household activity filtering

### Phase 2 - Portal Framework

Still no NAS required.

- [x] App shell
  - [x] Sidebar navigation
  - [x] Mobile navigation
  - [x] Module landing pages
  - [x] Consistent empty states
  - [x] Practical family-friendly layouts
- [x] Module system
  - [x] Module registry
  - [x] Module enable/disable settings
  - [x] Module health states
  - [x] Route guards by permission
- [x] Unified search
  - [x] Search notes
  - [x] Search tasks
  - [x] Search bookmarks
  - [x] Search announcements
  - [x] Search tags
  - [x] Prepare adapter-backed search results
- [x] Settings foundation
  - [x] System settings table
  - [x] Integration settings table
  - [x] User preferences

### Phase 3 - Storage Integration

Works on PC first and future NAS later.

- [ ] Integration adapter contracts
  - [ ] Storage adapter interface
  - [ ] Health check interface
  - [ ] Capability reporting
  - [ ] Error mapping for user-friendly messages
- [ ] Local Storage Adapter
  - [ ] Browse files
  - [ ] Upload files
  - [ ] Download files
  - [ ] Delete files
  - [ ] Search local metadata
- [ ] WebDAV Adapter
  - [ ] Connection settings
  - [ ] Browse files
  - [ ] Upload files
  - [ ] Download files
  - [ ] Folder support
- [ ] File Portal
  - [ ] Unified file browser
  - [ ] Adapter-backed file actions
  - [ ] Important documents
  - [ ] Shared file portal view
  - [ ] File tags

### Phase 4 - NAS Integration

Connect Equinox to UGOS through standard integrations.

- [ ] SMB Adapter
  - [ ] Connection settings
  - [ ] Browse shares
  - [ ] Read file metadata
- [ ] Docker Adapter
  - [ ] Container list
  - [ ] Container status
  - [ ] Service links
  - [ ] Basic start/stop controls behind admin permissions
- [ ] SSH Adapter
  - [ ] Connection settings
  - [ ] Command allowlist
  - [ ] Server status checks
- [ ] Server Portal
  - [ ] CPU summary
  - [ ] RAM summary
  - [ ] Storage summary
  - [ ] Network summary
  - [ ] Docker summary

### Phase 5 - Ecosystem Expansion

- [ ] Family Hub expansion
  - [ ] Calendar
  - [ ] Shopping list
  - [ ] Birthdays
  - [ ] Shared household checklist
- [ ] Photo Portal
  - [ ] Immich adapter
  - [ ] UGOS Photos adapter research
  - [ ] Recent photos
  - [ ] Albums
- [ ] Media Portal
  - [ ] Jellyfin adapter
  - [ ] Navidrome adapter
  - [ ] Audiobookshelf adapter
  - [ ] Continue watching / recently added
- [ ] Project Portal
  - [ ] Project list
  - [ ] Documentation links
  - [ ] GitHub repository links
  - [ ] Deployment links
  - [ ] Docker project grouping
- [ ] Automation Portal
  - [ ] Scheduled jobs
  - [ ] Automated notification rules
  - [ ] Cleanup workflows
  - [ ] Backup workflow UI

## Current Checklist Audit

The new roadmap now covers the missing items from the 2.0 vision:

- roles include Admin, Family Member, Guest, and Child
- dashboard includes server status and recent photos/files/tasks
- Family Hub includes calendar, shopping list, birthdays, notes, and documents
- File Portal is explicitly adapter-backed instead of NAS-replacement storage
- Integration Layer includes Local Storage, WebDAV, SMB, Docker, SSH, and API adapter concepts
- settings tables and integration settings are included
- module registry and enable/disable states are included
- Server Portal and Automation Portal are represented as separate roadmap tracks

## Final One-Line Definition

**Equinox is a self-hosted digital ecosystem platform that provides a unified interface for family services, productivity tools, media, projects, and NAS resources through standard integrations such as WebDAV, SMB, Docker, and SSH, allowing the underlying infrastructure to evolve without changing the user experience.**
