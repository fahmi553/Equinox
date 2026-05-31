<script setup>
import {
  Activity,
  Bookmark,
  CircleHelp,
  LayoutDashboard,
  ListChecks,
  LogOut,
  NotebookText,
  Search,
  Share2,
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
    summary: 'Start here to see your account, totals, and recent activity.',
    steps: [
      'Open Dashboard from the top menu.',
      'Check the status box to confirm you are signed in.',
      'Use the big cards to jump to Notes, Tasks, Bookmarks, Family, Guide, or Activity.'
    ]
  },
  {
    title: 'Sharing',
    icon: Share2,
    summary: 'Share only what family members should see. Shared items are read-only for them.',
    steps: [
      'Click Share on a note, task, bookmark, or tag you own.',
      'Family members can view shared items but cannot edit your private content.',
      'Click Make private to stop sharing an item you own.'
    ]
  },
  {
    title: 'Search',
    icon: Search,
    summary: 'Find visible notes, tasks, and bookmarks.',
    steps: [
      'Open Search from the top menu.',
      'Type a word from the item you want to find.',
      'Click Search.',
      'Open the matching section or saved link.'
    ]
  },
  {
    title: 'Profile',
    icon: UserRound,
    summary: 'Check your account, role, and visible family items.',
    steps: [
      'Open Profile from the top menu.',
      'Check your role to understand what your account can manage.',
      'Review your own notes, tasks, and bookmarks.',
      'Look at shared counts to understand what family members made visible.'
    ]
  },
  {
    title: 'Notes',
    icon: NotebookText,
    summary: 'Save quick household information, ideas, or reference details.',
    steps: [
      'Open Notes from the top menu.',
      'Type a title and optional details.',
      'Click Add note.',
      'Use notes for things like instructions, reference info, or family plans.'
    ]
  },
  {
    title: 'Tasks',
    icon: ListChecks,
    summary: 'Track work that needs action and mark it done when finished.',
    steps: [
      'Open Tasks from the top menu.',
      'Type what needs to be done.',
      'Add details, priority, and a date if needed.',
      'Click Add task.',
      'Mark the task done when it is complete.'
    ]
  },
  {
    title: 'Bookmarks',
    icon: Bookmark,
    summary: 'Save useful links so family members can find them later.',
    steps: [
      'Open Bookmarks from the top menu.',
      'Enter a title and link.',
      'Add notes if the link needs context.',
      'Share the bookmark when it should be visible to family.'
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
    summary: 'See recent changes such as logins, notes, tasks, bookmarks, and account updates.',
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
  { label: 'Share', icon: Share2, text: 'Let family view an item read-only.' },
  { label: 'Search', icon: Search, text: 'Find visible notes, tasks, and bookmarks.' },
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
