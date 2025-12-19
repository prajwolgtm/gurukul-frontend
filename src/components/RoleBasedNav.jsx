import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { ROLES } from '../utils/roles';

const NavLink = ({ to, children, mobile, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  if (mobile) {
    return (
      <Link
        to={to}
        onClick={onClick}
        className={`block px-4 py-4 rounded-xl text-base font-medium transition-all min-h-[48px] flex items-center ${
          isActive
            ? 'bg-violet-100 text-violet-700'
            : 'text-slate-600 active:bg-slate-100 hover:text-slate-800'
        }`}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        isActive
          ? 'bg-violet-100 text-violet-700'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
      }`}
    >
      {children}
    </Link>
  );
};

const RoleBasedNav = ({ mobile, onItemClick }) => {
  const { user } = useAuth();

  if (!user) return null;

  const navItems = {
    [ROLES.ADMIN]: [
      { to: '/', label: '📊 Dashboard' },
      { to: '/departments', label: '🏛️ Departments' },
      { to: '/students', label: '👨‍🎓 Students' },
      { to: '/teachers', label: '👨‍🏫 Teachers' },
      { to: '/exams', label: '📝 Exams' },
      { to: '/requests', label: '📋 Requests' },
      { to: '/classes', label: '🏫 Classes' },
      { to: '/reports', label: '📈 Reports' },
      { to: '/exam-results', label: '🏆 Results' },
    ],
    [ROLES.COORDINATOR]: [
      { to: '/', label: '📊 Dashboard' },
      { to: '/departments', label: '🏛️ Departments' },
      { to: '/students', label: '👨‍🎓 Students' },
      { to: '/teachers', label: '👨‍🏫 Teachers' },
      { to: '/exams', label: '📝 Exams' },
      { to: '/requests', label: '📋 Requests' },
      { to: '/classes', label: '🏫 Classes' },
      { to: '/reports', label: '📈 Reports' },
      { to: '/exam-results', label: '🏆 Results' },
    ],
    [ROLES.PRINCIPAL]: [
      { to: '/', label: '📊 Dashboard' },
      { to: '/departments', label: '🏛️ Departments' },
      { to: '/students', label: '👨‍🎓 Students' },
      { to: '/teachers', label: '👨‍🏫 Teachers' },
      { to: '/exams', label: '📝 Exams' },
      { to: '/requests', label: '📋 Requests' },
      { to: '/classes', label: '🏫 Classes' },
      { to: '/reports', label: '📈 Reports' },
      { to: '/exam-results', label: '🏆 Results' },
    ],
    [ROLES.HOD]: [
      { to: '/', label: '📊 Dashboard' },
      { to: '/departments', label: '🏛️ Department' },
      { to: '/students', label: '👨‍🎓 Students' },
      { to: '/exams', label: '📝 Exams' },
      { to: '/requests', label: '📋 Requests' },
      { to: '/classes', label: '🏫 Classes' },
      { to: '/reports', label: '📈 Reports' },
      { to: '/exam-results', label: '🏆 Results' },
    ],
    [ROLES.TEACHER]: [
      { to: '/', label: '📊 Dashboard' },
      { to: '/classes', label: '🏫 Classes' },
      { to: '/exams', label: '📝 Exams' },
      { to: '/reports', label: '📈 Reports' },
      { to: '/exam-results', label: '🏆 Results' },
    ],
    [ROLES.PARENT]: [
      { to: '/parent-dashboard', label: '📊 Dashboard' },
      { to: '/requests', label: '📋 Requests' },
    ],
    [ROLES.CARETAKER]: [
      { to: '/', label: '📊 Dashboard' },
      { to: '/students', label: '👨‍🎓 Students' },
      { to: '/reports', label: '📈 Reports' },
    ],
  };

  const items = navItems[user.role] || [{ to: '/', label: '📊 Dashboard' }];

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
