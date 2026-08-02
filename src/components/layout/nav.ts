import {
  BookOpenText,
  CalendarDays,
  Church,
  Download,
  HandHeart,
  Home,
  Images,
  Info,
  Megaphone,
  Mic,
  ScrollText,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  /** Shorter label for the mobile bottom bar. */
  short?: string
  icon: LucideIcon
  description: string
}

/** The five destinations that earn a permanent slot on small screens. */
export const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, description: 'Welcome and what is happening now' },
  {
    to: '/programme',
    label: 'Programme',
    short: 'Order',
    icon: ScrollText,
    description: 'Order of service and weekly bulletin',
  },
  { to: '/events', label: 'Events', icon: CalendarDays, description: 'Church calendar and upcoming programmes' },
  { to: '/sermons', label: 'Sermons', icon: Mic, description: 'Messages, notes and audio' },
  {
    to: '/devotional',
    label: 'Devotional',
    short: 'Daily',
    icon: BookOpenText,
    description: 'Today’s verse and reading plan',
  },
]

/** Everything else, shown in the desktop bar and the mobile "More" sheet. */
export const SECONDARY_NAV: NavItem[] = [
  { to: '/about', label: 'About', icon: Info, description: 'Our story, beliefs and leadership' },
  { to: '/departments', label: 'Departments', icon: Users, description: 'Choir, ushers, WMU, MMU, RA and more' },
  { to: '/announcements', label: 'Notice Board', icon: Megaphone, description: 'Church announcements' },
  { to: '/prayer', label: 'Prayer', icon: HandHeart, description: 'Prayer points and requests' },
  { to: '/gallery', label: 'Gallery', icon: Images, description: 'Pictures and videos of church life' },
  { to: '/giving', label: 'Giving', icon: Wallet, description: 'Tithes, offerings and church accounts' },
  { to: '/downloads', label: 'Downloads', icon: Download, description: 'Bulletins, outlines and study material' },
  { to: '/contact', label: 'Contact', icon: Church, description: 'Find us and get in touch' },
]

export const ALL_NAV: NavItem[] = [...PRIMARY_NAV, ...SECONDARY_NAV]

export const ADMIN_NAV_ICON = Sparkles
