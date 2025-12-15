import { useState } from 'react';
import { Card, Button, Form, Alert, Container, Row, Col, Tabs, Tab } from 'react-bootstrap';
import { login, loginParent } from '../api/auth';
import { useAuth } from '../store/auth';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const { loginSuccess } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isParentLogin, setIsParentLogin] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let resp;
      if (isParentLogin) {
        resp = await loginParent(email, dob);
      } else {
        resp = await login(email, password);
      }
      const token = resp?.token || resp?.data?.token;
      const user = resp?.user || resp?.data?.user || null;
      if (!token) throw new Error('Token missing in response');
      loginSuccess(token, user);
      navigate(isParentLogin ? '/parent-dashboard' : '/');
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Row className="justify-content-center">
        <Col md={6} lg={4}>
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
            <Card style={{ width: '100%' }}>
              <Card.Body>
                <Card.Title className="text-center mb-4">
                  <h3>Gurukul Login</h3>
                  <p className="text-muted">Education Management System</p>
                </Card.Title>
                
                {error && <Alert variant="danger">{error}</Alert>}
                
                <Tabs activeKey={isParentLogin ? 'parent' : 'staff'} onSelect={(k) => setIsParentLogin(k === 'parent')} className="mb-3">
                  <Tab eventKey="staff" title="Staff Login">
                <Form onSubmit={onSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="Enter your email"
                      required 
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Password</Form.Label>
                    <Form.Control 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="Enter your password"
                      required 
                    />
                  </Form.Group>
                  
                  <Button 
                    type="submit" 
                    disabled={loading} 
                    className="w-100 mb-3"
                    variant="primary"
                    size="lg"
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </Form>
                  </Tab>
                  
                  <Tab eventKey="parent" title="Parent Login">
                    <Form onSubmit={onSubmit}>
                      <Form.Group className="mb-3">
                        <Form.Label>Parent Email</Form.Label>
                        <Form.Control 
                          type="email" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          placeholder="Enter parent email (from student record)"
                          required 
                        />
                        <Form.Text className="text-muted">
                          Use the email address provided in your child's student record
                        </Form.Text>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Child's Date of Birth (DDMMYYYY)</Form.Label>
                        <Form.Control 
                          type="text" 
                          value={dob} 
                          onChange={(e) => setDob(e.target.value.replace(/\D/g, '').slice(0, 8))} 
                          placeholder="e.g., 16082002 for 16/08/2002"
                          maxLength={8}
                          required 
                        />
                        <Form.Text className="text-muted">
                          Format: DDMMYYYY (e.g., 16082002 for 16th August 2002)
                        </Form.Text>
                      </Form.Group>
                      
                      <Button 
                        type="submit" 
                        disabled={loading || dob.length !== 8} 
                        className="w-100 mb-3"
                        variant="success"
                        size="lg"
                      >
                        {loading ? 'Signing in...' : 'Sign In as Parent'}
                      </Button>
                    </Form>
                  </Tab>
                </Tabs>

                <div className="text-center">
                  <small className="text-muted">
                    Need a staff account?{' '}
                    <Link to="/register-staff" className="text-decoration-none">
                      Register here
                    </Link>
                  </small>
                </div>

                <hr className="my-3" />
                
                <div className="text-center">
                  <small className="text-muted">
                    <strong>Test Accounts:</strong><br />
                    Admin: admin@gurukul.com / admin123<br />
                    Principal: principal@gurukul.com / principal123<br />
                    Teacher: teacher@gurukul.com / teacher123
                  </small>
                </div>
              </Card.Body>
            </Card>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;
