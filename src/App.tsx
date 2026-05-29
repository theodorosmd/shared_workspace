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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="countries" element={<Countries />} />
          <Route path="users" element={<Users />} />
          <Route path="programs" element={<Programs />} />
          <Route path="settings/roles" element={<Roles />} />
          <Route path="support" element={<Support />} />
          <Route path="audit" element={<AuditLog />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
