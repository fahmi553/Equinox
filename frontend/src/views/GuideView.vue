<script setup>
import {
  Activity,
  BellRing,
  CircleHelp,
  Download,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  NotebookText,
  Search,
  Share2,
  Upload,
  UserPlus,
  UserRound,
  UsersRound
} from '@lucide/vue';
import AppPage from '../components/AppPage.vue';
import { isAdmin } from '../stores/equinox';

const guideSections = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    summary: 'Start here to see your account, current storage location, totals, and recent activity.',
    steps: [
      'Open Dashboard from the top menu.',
      'Check the status box to confirm you are signed in.',
      'Use the big cards to jump to Files, Notes, Reminders, Family, Guide, or Activity.'
    ]
  },
  {
    title: 'Files',
    icon: FolderOpen,
    summary: 'Keep private files, organize folders, and share selected items with family.',
    steps: [
      'Open Files from the top menu.',
      'Use Create folder to make a new place for files.',
      'Use Select file, then Upload file to add a file.',
      'Use Download to save a copy back to your device.',
      'Use Rename, Move, Share, or Delete when you own the item.'
    ]
  },
  {
    title: 'Sharing',
    icon: Share2,
    summary: 'Share only what family members should see. Shared items are read-only for them.',
    steps: [
      'Click Share on a file to share just that file.',
      'Click Share on a folder to share that folder and everything inside it.',
      'Items marked Shared by folder are visible because a parent folder is shared.',
      'Click Make private to stop sharing an item or folder you own.'
    ]
  },
  {
    title: 'Search',
    icon: Search,
    summary: 'Find files and folders without browsing through every folder.',
    steps: [
      'Open Files.',
      'Type a file or folder name in Search files and folders.',
      'Click Search.',
      'Click Clear to return to normal folder browsing.'
    ]
  },
  {
    title: 'Profile',
    icon: UserRound,
    summary: 'Check your account, role, personal storage, and items shared with you.',
    steps: [
      'Open Profile from the top menu.',
      'Check your role to understand what your account can manage.',
      'Review Your storage to see how much space your files use.',
      'Look at Shared with you to see recent files from family members.'
    ]
  },
  {
    title: 'Notes',
    icon: NotebookText,
    summary: 'Save quick household information, ideas, or reminders that need more detail.',
    steps: [
      'Open Notes from the top menu.',
      'Type a title and optional details.',
      'Click Add note.',
      'Use notes for things like instructions, reference info, or family plans.'
    ]
  },
  {
    title: 'Reminders',
    icon: BellRing,
    summary: 'Track small tasks and mark them done when finished.',
    steps: [
      'Open Reminders from the top menu.',
      'Type what needs to be done.',
      'Add a date and time if needed.',
      'Click Add reminder.',
      'Tick the checkbox when the reminder is complete.'
    ]
  },
  {
    title: 'Family Accounts',
    icon: UsersRound,
    adminOnly: true,
    summary: 'Admins can create accounts for family members.',
    steps: [
      'Open Family from the top menu.',
      'Enter display name, username, and a temporary password.',
      'Choose Family for normal users or Admin for trusted managers.',
      'Click Create account and share the login details privately.'
    ]
  },
  {
    title: 'Activity',
    icon: Activity,
    summary: 'See recent changes such as logins, uploads, downloads, notes, and reminders.',
    steps: [
      'Open Activity from the top menu.',
      'Read the newest activity at the top.',
      'Use it to understand what changed recently in Equinox.'
    ]
  },
  {
    title: 'Sign Out',
    icon: LogOut,
    summary: 'Keep your private hub safe when using a shared device.',
    steps: [
      'Click Logout in the top-right corner.',
      'Close the browser tab if you are done.',
      'Log in again when you need to use Equinox.'
    ]
  }
];

const quickActions = [
  { label: 'Upload', icon: Upload, text: 'Add a file into the current folder.' },
  { label: 'Download', icon: Download, text: 'Save a file copy to your device.' },
  { label: 'Share', icon: Share2, text: 'Let family view an item read-only.' },
  { label: 'Create user', icon: UserPlus, text: 'Admin-only family account setup.' }
];
</script>

<template>
  <AppPage title="Guide" eyebrow="How to use Equinox">
    <section class="guide-intro">
      <div class="guide-intro-icon" aria-hidden="true">
        <CircleHelp :size="42" :stroke-width="1.7" />
      </div>
      <div>
        <h3>Start simple</h3>
        <p>
          Equinox is your private family hub. Use the top menu to move between pages,
          and use the buttons inside each page to add, organize, share, or check information.
        </p>
      </div>
    </section>

    <section class="guide-strip" aria-label="Common actions">
      <article v-for="action in quickActions" :key="action.label">
        <component :is="action.icon" :size="26" :stroke-width="1.8" />
        <strong>{{ action.label }}</strong>
        <span>{{ action.text }}</span>
      </article>
    </section>

    <section class="guide-grid">
      <article
        v-for="section in guideSections.filter((item) => !item.adminOnly || isAdmin)"
        :key="section.title"
        class="guide-card"
      >
        <div class="guide-card-heading">
          <span aria-hidden="true">
            <component :is="section.icon" :size="28" :stroke-width="1.8" />
          </span>
          <div>
            <h3>{{ section.title }}</h3>
            <p>{{ section.summary }}</p>
          </div>
        </div>

        <ol>
          <li v-for="step in section.steps" :key="step">{{ step }}</li>
        </ol>
      </article>
    </section>
  </AppPage>
</template>
