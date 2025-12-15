import React from 'react';
import { Nav } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { ROLES } from '../utils/roles';

const RoleBasedNav = () => {
  const { user } = useAuth();

  if (!user) return null;

  const renderNavItems = () => {
    switch (user.role) {
      case ROLES.ADMIN:
      case ROLES.COORDINATOR:
      case ROLES.PRINCIPAL:
        return (
          <>
            <Nav.Link as={Link} to="/">Dashboard</Nav.Link>
            <Nav.Link as={Link} to="/departments">Departments</Nav.Link>
            <Nav.Link as={Link} to="/students">Students</Nav.Link>
            <Nav.Link as={Link} to="/teachers">Teachers</Nav.Link>
            <Nav.Link as={Link} to="/exams">Exams</Nav.Link>
            <Nav.Link as={Link} to="/requests">Requests</Nav.Link>
            <Nav.Link as={Link} to="/classes">Classes</Nav.Link>
            <Nav.Link as={Link} to="/reports">Reports</Nav.Link>
            <Nav.Link as={Link} to="/exam-results">Exam Results</Nav.Link>
            <Nav.Link as={Link} to="/password-reset">Password Reset</Nav.Link>
          </>
        );

      case ROLES.HOD:
        return (
          <>
            <Nav.Link as={Link} to="/">Dashboard</Nav.Link>
            <Nav.Link as={Link} to="/departments">My Department</Nav.Link>
            <Nav.Link as={Link} to="/students">Students</Nav.Link>
            <Nav.Link as={Link} to="/exams">Exams</Nav.Link>
            <Nav.Link as={Link} to="/requests">Requests</Nav.Link>
            <Nav.Link as={Link} to="/classes">Classes</Nav.Link>
            <Nav.Link as={Link} to="/reports">Reports</Nav.Link>
            <Nav.Link as={Link} to="/exam-results">Exam Results</Nav.Link>
          </>
        );

      case ROLES.TEACHER:
        return (
          <>
            <Nav.Link as={Link} to="/">Dashboard</Nav.Link>
            <Nav.Link as={Link} to="/classes">My Classes</Nav.Link>
            <Nav.Link as={Link} to="/exams">Exams</Nav.Link>
            <Nav.Link as={Link} to="/reports">Reports</Nav.Link>
            <Nav.Link as={Link} to="/exam-results">Exam Results</Nav.Link>
          </>
        );

      case ROLES.PARENT:
        return (
          <>
            <Nav.Link as={Link} to="/parent-dashboard">Dashboard</Nav.Link>
            <Nav.Link as={Link} to="/requests">Requests</Nav.Link>
          </>
        );

      case ROLES.CARETAKER:
        return (
          <>
            <Nav.Link as={Link} to="/">Dashboard</Nav.Link>
            <Nav.Link as={Link} to="/students">Students</Nav.Link>
            <Nav.Link as={Link} to="/reports">Reports</Nav.Link>
          </>
        );

      default:
        return (
          <>
            <Nav.Link as={Link} to="/">Dashboard</Nav.Link>
          </>
        );
    }
  };

  return <>{renderNavItems()}</>;
};

export default RoleBasedNav;
