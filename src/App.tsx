import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ScrollToTop } from './components/layout/ScrollToTop'
import { SiteLayout } from './components/layout/SiteLayout'
import { UpdatePrompt } from './components/layout/UpdatePrompt'
import HomePage from './routes/public/HomePage'

/**
 * Routing.
 *
 * Home is imported eagerly — it is what almost everyone opens first, and the
 * install prompt should never appear over a spinner. Everything else is code
 * split, which matters because the admin half of this app (charts, editors,
 * reports) is far larger than the public half and most visitors never touch it.
 */

// --- public ---------------------------------------------------------------
const AboutPage = lazy(() => import('./routes/public/AboutPage'))
const ProgrammePage = lazy(() => import('./routes/public/ProgrammePage'))
const ProgrammeDetailPage = lazy(() => import('./routes/public/ProgrammeDetailPage'))
const EventsPage = lazy(() => import('./routes/public/EventsPage'))
const EventDetailPage = lazy(() => import('./routes/public/EventDetailPage'))
const SermonsPage = lazy(() => import('./routes/public/SermonsPage'))
const SermonDetailPage = lazy(() => import('./routes/public/SermonDetailPage'))
const DevotionalPage = lazy(() => import('./routes/public/DevotionalPage'))
const DepartmentsPage = lazy(() => import('./routes/public/DepartmentsPage'))
const DepartmentDetailPage = lazy(() => import('./routes/public/DepartmentDetailPage'))
const AnnouncementsPage = lazy(() => import('./routes/public/AnnouncementsPage'))
const PrayerPage = lazy(() => import('./routes/public/PrayerPage'))
const GalleryPage = lazy(() => import('./routes/public/GalleryPage'))
const GivingPage = lazy(() => import('./routes/public/GivingPage'))
const DownloadsPage = lazy(() => import('./routes/public/DownloadsPage'))
const ContactPage = lazy(() => import('./routes/public/ContactPage'))
const PrivacyPage = lazy(() => import('./routes/public/PrivacyPage'))
const NotFoundPage = lazy(() => import('./routes/public/NotFoundPage'))

// --- admin ----------------------------------------------------------------
const AdminLayout = lazy(() => import('./routes/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./routes/admin/AdminDashboard'))
const MembersPage = lazy(() => import('./routes/admin/MembersPage'))
const AttendancePage = lazy(() => import('./routes/admin/AttendancePage'))
const AdminDepartmentsPage = lazy(() => import('./routes/admin/AdminDepartmentsPage'))
const ContentPage = lazy(() => import('./routes/admin/ContentPage'))
const ReportsPage = lazy(() => import('./routes/admin/ReportsPage'))
const SettingsPage = lazy(() => import('./routes/admin/SettingsPage'))

export default function App() {
  return (
    <>
      <ScrollToTop />
      {/* Live region for route announcements — see useDocumentTitle. */}
      <div id="route-announcer" role="status" aria-live="polite" className="sr-only" />

      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="about" element={<AboutPage />} />

          <Route path="programme" element={<ProgrammePage />} />
          <Route path="programme/:date" element={<ProgrammeDetailPage />} />
          {/* "Bulletin" is what many members will look for. Keep it working. */}
          <Route path="bulletin" element={<Navigate to="/programme" replace />} />

          <Route path="events" element={<EventsPage />} />
          <Route path="events/:slug" element={<EventDetailPage />} />

          <Route path="sermons" element={<SermonsPage />} />
          <Route path="sermons/:slug" element={<SermonDetailPage />} />

          <Route path="devotional" element={<DevotionalPage />} />
          <Route path="departments" element={<DepartmentsPage />} />
          <Route path="departments/:slug" element={<DepartmentDetailPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="prayer" element={<PrayerPage />} />
          <Route path="gallery" element={<GalleryPage />} />
          <Route path="giving" element={<GivingPage />} />
          <Route path="downloads" element={<DownloadsPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
        </Route>

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="departments" element={<AdminDepartmentsPage />} />
          <Route path="content" element={<ContentPage />} />
          <Route path="content/:collection" element={<ContentPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      <UpdatePrompt />
    </>
  )
}
