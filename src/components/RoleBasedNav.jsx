import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { ROLES } from '../utils/roles';

const NavLink = ({ to, children, mobile, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  const initial = String(children || '').slice(0, 1).toUpperCase();
  
  if (mobile) {
    return (
      <Link
        to={to}
        onClick={onClick}
        className={`app-nav-link app-nav-link-mobile ${isActive ? 'active' : ''}`}
      >
        <span className="app-nav-icon" aria-hidden="true">{initial}</span>
        <span>{children}</span>
      </Link>
    );
  }

  return (
    <Link
      to={to}
      className={`app-nav-link ${isActive ? 'active' : ''}`}
    >
      <span className="app-nav-icon" aria-hidden="true">{initial}</span>
      <span>{children}</span>
    </Link>
  );
};

const RoleBasedNav = ({ mobile, onItemClick }) => {
  const { user } = useAuth();

  if (!user) return null;

  const navItems = {
    [ROLES.ADMIN]: [
      { to: '/', label: 'Dashboard' },
      { to: '/departments', label: 'Departments' },
      { to: '/students', label: 'Students' },
      { to: '/teachers', label: 'Teachers' },
      { to: '/exams', label: 'Exams' },
      { to: '/requests', label: 'Requests' },
      { to: '/classes', label: 'Classes' },
      { to: '/subjects', label: 'Subjects' },
      { to: '/reports', label: 'Reports' },
      { to: '/exam-results', label: 'Results' },
      { to: '/password-reset', label: 'Reset Password' },
      { to: '/security-scanner', label: 'QR Scanner' },
    ],
    [ROLES.COORDINATOR]: [
      { to: '/', label: 'Dashboard' },
      { to: '/departments', label: 'Departments' },
      { to: '/students', label: 'Students' },
      { to: '/teachers', label: 'Teachers' },
      { to: '/exams', label: 'Exams' },
      { to: '/requests', label: 'Requests' },
      { to: '/classes', label: 'Classes' },
      { to: '/subjects', label: 'Subjects' },
      { to: '/reports', label: 'Reports' },
      { to: '/exam-results', label: 'Results' },
      { to: '/password-reset', label: 'Reset Password' },
    ],
    [ROLES.PRINCIPAL]: [
      { to: '/', label: 'Dashboard' },
      { to: '/departments', label: 'Departments' },
      { to: '/students', label: 'Students' },
      { to: '/teachers', label: 'Teachers' },
      { to: '/exams', label: 'Exams' },
      { to: '/requests', label: 'Requests' },
      { to: '/classes', label: 'Classes' },
      { to: '/subjects', label: 'Subjects' },
      { to: '/reports', label: 'Reports' },
      { to: '/exam-results', label: 'Results' },
    ],
    [ROLES.HOD]: [
      { to: '/', label: 'Dashboard' },
      { to: '/departments', label: 'Department' },
      { to: '/students', label: 'Students' },
      { to: '/exams', label: 'Exams' },
      { to: '/requests', label: 'Requests' },
      { to: '/classes', label: 'Classes' },
      { to: '/subjects', label: 'Subjects' },
      { to: '/reports', label: 'Reports' },
      { to: '/exam-results', label: 'Results' },
    ],
    [ROLES.TEACHER]: [
      { to: '/', label: 'Dashboard' },
      { to: '/classes', label: 'Classes' },
      { to: '/subjects', label: 'Subjects' },
      { to: '/exams', label: 'Exams' },
      { to: '/reports', label: 'Reports' },
      { to: '/exam-results', label: 'Results' },
    ],
    [ROLES.PARENT]: [
      { to: '/parent-dashboard', label: 'Dashboard' },
      { to: '/requests', label: 'Requests' },
    ],
    [ROLES.CARETAKER]: [
      { to: '/', label: 'Dashboard' },
      { to: '/students', label: 'Students' },
      { to: '/reports', label: 'Reports' },
      { to: '/security-scanner', label: 'QR Scanner' },
    ],
    [ROLES.SECURITY]: [
      { to: '/security-scanner', label: 'Gate Scanner' },
    ],
  };

  const items = navItems[user.role] || [{ to: '/', label: 'Dashboard' }];

  return (
    <>
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} mobile={mobile} onClick={onItemClick}>
          {item.label}
        </NavLink>
      ))}
    </>
  );
};

export default RoleBasedNav;
