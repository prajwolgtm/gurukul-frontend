import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { AuthProvider } from './store/auth';
import ProtectedRoute from './components/ProtectedRoute';
import RoleBasedRoute from './components/RoleBasedRoute';
import Layout from './components/Layout';
import { Spinner } from 'react-bootstrap';
import { ROLES } from './utils/roles';

// Lazy load components for better initial load time
const Login = lazy(() => import('./pages/Login'));
const StaffRegistration = lazy(() => import('./pages/StaffRegistration'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DepartmentManagement = lazy(() => import('./pages/DepartmentManagement'));
const RequestManagement = lazy(() => import('./pages/RequestManagement'));
const DailyAttendance = lazy(() => import('./pages/attendance/DailyAttendance'));
const ClassManagement = lazy(() => import('./pages/ClassManagement'));
const ClassAttendance = lazy(() => import('./pages/ClassAttendance'));
const ReportsDashboard = lazy(() => import('./pages/reports/Dashboard'));
const DailyAttendanceReport = lazy(() => import('./pages/reports/DailyAttendanceReport'));
const ExamReport = lazy(() => import('./pages/reports/ExamReport'));
const ExamResultsList = lazy(() => import('./pages/reports/ExamResultsList'));
const StudentReport = lazy(() => import('./pages/reports/StudentReport'));
const StudentAttendanceReport = lazy(() => import('./pages/reports/StudentAttendanceReport'));

// NEW CLEAN SYSTEM COMPONENTS
const StudentManagement = lazy(() => import('./pages/StudentManagement'));
const StudentProfile = lazy(() => import('./pages/StudentProfile'));
const TeacherManagement = lazy(() => import('./pages/TeacherManagement'));
const ExamManagement = lazy(() => import('./pages/ExamManagement'));
const SelfAttendance = lazy(() => import('./pages/SelfAttendance'));
const ParentDashboard = lazy(() => import('./pages/ParentDashboard'));
const PasswordReset = lazy(() => import('./pages/PasswordReset'));
const AcademicYearSettings = lazy(() => import('./pages/AcademicYearSettings'));
const SecurityQRScanner = lazy(() => import('./pages/SecurityQRScanner'));

// Loading component
const LoadingSpinner = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
    <Spinner animation="border" role="status">
      <span className="visually-hidden">Loading...</span>
    </Spinner>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register-staff" element={<StaffRegistration />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout><Outlet /></Layout>}>
                <Route index element={
                  <RoleBasedRoute allowedRoles={[ROLES.ADMIN, ROLES.COORDINATOR, ROLES.PRINCIPAL, ROLES.HOD, ROLES.TEACHER, ROLES.CARETAKER]}>
                    <Dashboard />
                  </RoleBasedRoute>
                } />
                <Route path="departments" element={<DepartmentManagement />} />
                <Route path="requests" element={<RequestManagement />} />
                <Route path="attendance" element={<DailyAttendance />} />
                <Route path="classes" element={<ClassManagement />} />
                <Route path="class-attendance" element={<ClassAttendance />} />
                <Route path="reports" element={<ReportsDashboard />} />
                <Route path="reports/daily-attendance" element={<DailyAttendanceReport />} />
                <Route path="reports/exam/:id" element={<ExamReport />} />
                <Route path="exam-results" element={<ExamResultsList />} />
                <Route path="reports/student/:studentId" element={<StudentReport />} />
                <Route path="reports/student/:studentId/attendance" element={<StudentAttendanceReport />} />
                
                {/* NEW CLEAN SYSTEM ROUTES */}
                <Route path="students" element={<StudentManagement />} />
                <Route path="students/:studentId/profile" element={<StudentProfile />} />
                <Route path="teachers" element={<TeacherManagement />} />
                <Route path="exams" element={<ExamManagement />} />
                <Route path="my-attendance" element={<SelfAttendance />} />
                <Route path="parent-dashboard" element={<ParentDashboard />} />
                <Route path="password-reset" element={<PasswordReset />} />
                <Route path="academic-year-settings" element={<AcademicYearSettings />} />
                <Route path="security-scanner" element={<SecurityQRScanner />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
