<script setup>
import {
  Activity,
  Bell,
  Bookmark,
  Boxes,
  CircleHelp,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Megaphone,
  MessageCircle,
  NotebookText,
  Search,
  Settings,
  Share2,
  Tags,
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
    summary: 'Start here to see announcements, tasks, totals, service status, and recent activity.',
    steps: [
      'Open Dashboard from the sidebar.',
      'Check the status box to confirm you are signed in.',
      'Read family announcements near the top of the workspace.',
      'Use the shortcut cards to jump to the section you need.'
    ]
  },
  {
    title: 'Announcements',
    icon: Megaphone,
    summary: 'Important family notices appear throughout Equinox so they are hard to miss.',
    steps: [
      'Read active notices near the top of Dashboard.',
      'On other pages, click the notice strip to return to the full announcement list.',
      'Pinned notices appear before normal notices.',
      'Admins create, edit, and expire notices from Family.'
    ]
  },
  {
    title: 'Chat',
    icon: MessageCircle,
    summary: 'Send household messages or chat privately with one family member.',
    steps: [
      'Open Chat from the sidebar.',
      'Choose Household for a shared room or choose one person for a private conversation.',
      'Write a message in the box at the bottom.',
      'Click Send.',
      'New messages appear automatically while the page is open.',
      'Delete one of your messages if you sent it by mistake, then confirm in the popup.'
    ]
  },
  {
    title: 'Notifications',
    icon: Bell,
    summary: 'Check new household messages, personal messages, and announcements from one inbox.',
    steps: [
      'Look for the bell near Logout when a red unread count appears.',
      'Open Notifications from the bell or sidebar.',
      'Click an update to open the related page and mark it read.',
      'Use Mark all read when you have reviewed the list.'
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
    summary: 'Find visible notes, tasks, bookmarks, announcements, and tags.',
    steps: [
      'Open Search from the sidebar.',
      'Type a word from the item you want to find.',
      'Click Search.',
      'Open the matching section or saved link.',
      'Future file, photo, and media portals will join this same search page.'
    ]
  },
  {
    title: 'Profile',
    icon: UserRound,
    summary: 'Check your account, role, and visible family items.',
    steps: [
      'Open Profile from the sidebar.',
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
      'Open Notes from the sidebar.',
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
      'Open Tasks from the sidebar.',
      'Type what needs to be done.',
      'Add details, priority, and a date if needed.',
      'Click Add task.',
      'High-priority tasks appear before normal and low-priority tasks inside each date section.',
      'Mark the task done when it is complete.'
    ]
  },
  {
    title: 'Bookmarks',
    icon: Bookmark,
    summary: 'Save useful links so family members can find them later.',
    steps: [
      'Open Bookmarks from the sidebar.',
      'Enter a title and link.',
      'Add notes if the link needs context.',
      'Share the bookmark when it should be visible to family.'
    ]
  },
  {
    title: 'Tags',
    icon: Tags,
    summary: 'Use colored labels to keep related notes, tasks, and bookmarks together.',
    steps: [
      'Open Tags from the sidebar.',
      'Create a short label such as Bills, School, or Travel and choose its color.',
      'Choose tags while creating or editing notes, tasks, and bookmarks.',
      'Look for the colored label on saved items and use tag buttons to filter visible items.'
    ]
  },
  {
    title: 'Settings',
    icon: Settings,
    summary: 'Personalize how Equinox opens and how much spacing the workspace uses.',
    steps: [
      'Open Settings from the sidebar.',
      'Choose Dashboard, Search, or Profile as your start page.',
      'Enable compact spacing when you prefer a denser workspace.',
      'Admins can also update platform names and review planned integrations.'
    ]
  },
  {
    title: 'Family Accounts',
    icon: UsersRound,
    adminOnly: true,
    summary: 'Admins can create accounts for family members.',
    steps: [
      'Open Family from the sidebar.',
      'Enter display name, username, and a temporary password.',
      'Choose Family, Child, Guest, or Admin.',
      'Use role defaults for common permissions and user buttons for exceptions.',
      'Post announcements here when the household needs to see a notice.'
    ]
  },
  {
    title: 'Modules',
    icon: Boxes,
    adminOnly: true,
    summary: 'Admins decide which optional tools appear in the family workspace.',
    steps: [
      'Open Modules from the sidebar.',
      'Keep core modules available for navigation and account safety.',
      'Switch optional productivity modules on or off without deleting their data.',
      'Review planned portals such as Files, Photos, and Media.'
    ]
  },
  {
    title: 'Activity',
    icon: Activity,
    summary: 'See recent changes without exposing private family activity.',
    steps: [
      'Open Activity from the sidebar.',
      'Read the newest activity at the top.',
      'You see your own private actions and household actions for shared items.',
      'Admins can also review sensitive account events such as sign-ins and permission changes.'
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
  { label: 'Notices', icon: Megaphone, text: 'Read household updates from any page.' },
  { label: 'Chat', icon: MessageCircle, text: 'Send a quick message to the household.' },
  { label: 'Share', icon: Share2, text: 'Let family view an item read-only.' },
  { label: 'Search', icon: Search, text: 'Find visible family information quickly.' },
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
          Equinox is your private family hub. Use the sidebar to move between pages,
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
