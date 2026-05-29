import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Countries from '@/pages/Countries'
import Users from '@/pages/Users'
import Roles from '@/pages/Roles'
import Programs from '@/pages/Programs'
import Support from '@/pages/Support'
import AuditLog from '@/pages/AuditLog'
import Channels from '@/pages/Channels'
import Profile from '@/pages/Profile'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="countries" element={<Countries />} />
          <Route path="programs" element={<Programs />} />
          <Route path="support" element={<Support />} />
          <Route path="profile" element={<Profile />} />
          {/* manager+ */}
          <Route path="users" element={<ProtectedRoute minRole="manager"><Users /></ProtectedRoute>} />
          <Route path="channels" element={<ProtectedRoute minRole="manager"><Channels /></ProtectedRoute>} />
          {/* admin+ */}
          <Route path="settings/roles" element={<ProtectedRoute minRole="admin"><Roles /></ProtectedRoute>} />
          <Route path="audit" element={<ProtectedRoute minRole="admin"><AuditLog /></ProtectedRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
