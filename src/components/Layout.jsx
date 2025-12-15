import { Container, Navbar, Nav, Button, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import RoleBasedNav from './RoleBasedNav';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <Navbar bg="light" expand="lg" className="mb-3">
        <Container>
          <Navbar.Brand as={Link} to="/">Gurukul</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <RoleBasedNav />
            </Nav>
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted small">
                {user?.personalInfo?.fullName || user?.fullName || user?.email}
                {user?.role && (
                  <Badge bg="secondary" className="ms-2">{user.role}</Badge>
                )}
              </span>
              <Button variant="outline-danger" size="sm" onClick={onLogout}>Logout</Button>
            </div>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container className="mb-5">
        {children}
      </Container>
    </>
  );
};

export default Layout;
