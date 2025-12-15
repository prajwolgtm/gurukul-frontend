import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner, Table, Badge } from 'react-bootstrap';
import { useAuth } from '../store/auth';
import { ROLES } from '../utils/roles';
import { resetPassword, fixDoubleHashedPassword, verifyAccountByEmail, getPendingAccounts, syncTeacherVerification } from '../api/account-management';

const PasswordReset = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Password reset form
  const [resetForm, setResetForm] = useState({
    email: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Pending accounts
  const [pendingAccounts, setPendingAccounts] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);

  const canManageAccounts = [ROLES.ADMIN, ROLES.COORDINATOR].includes(user?.role);

  const handleResetFormChange = (e) => {
    const { name, value } = e.target;
    setResetForm(prev => ({ ...prev, [name]: value }));
    setMessage({ type: '', text: '' });
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!resetForm.email || !resetForm.newPassword) {
      setMessage({ type: 'danger', text: 'Please fill in all required fields' });
      return;
    }

    if (resetForm.newPassword.length < 6) {
      setMessage({ type: 'danger', text: 'Password must be at least 6 characters long' });
      return;
    }

    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setMessage({ type: 'danger', text: 'Passwords do not match' });
      return;
    }

    setLoading(true);
    try {
      const response = await resetPassword(resetForm.email, resetForm.newPassword);
      if (response.success) {
        setMessage({ type: 'success', text: response.message || 'Password reset successfully!' });
        setResetForm({ email: '', newPassword: '', confirmPassword: '' });
      } else {
        setMessage({ type: 'danger', text: response.message || 'Failed to reset password' });
      }
    } catch (error) {
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || 'Error resetting password. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFixDoubleHashed = async () => {
    if (!resetForm.email) {
      setMessage({ type: 'danger', text: 'Please enter an email address' });
      return;
    }

    setLoading(true);
    try {
      const response = await fixDoubleHashedPassword(
        resetForm.email,
        resetForm.newPassword || undefined
      );
      if (response.success) {
        setMessage({
          type: 'success',
          text: response.message || 'Password fixed successfully!',
          ...(response.temporaryPassword && {
            text: `${response.message} Temporary password: ${response.temporaryPassword}`
          })
        });
        if (response.temporaryPassword) {
          setResetForm(prev => ({ ...prev, newPassword: response.temporaryPassword }));
        }
      } else {
        setMessage({ type: 'danger', text: response.message || 'Failed to fix password' });
      }
    } catch (error) {
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || 'Error fixing password. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAccount = async (email) => {
    setLoading(true);
    try {
      const response = await verifyAccountByEmail(email);
      if (response.success) {
        setMessage({ type: 'success', text: response.message || 'Account verified successfully!' });
        loadPendingAccounts();
      } else {
        setMessage({ type: 'danger', text: response.message || 'Failed to verify account' });
      }
    } catch (error) {
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || 'Error verifying account. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPendingAccounts = async () => {
    setLoadingPending(true);
    try {
      const response = await getPendingAccounts();
      if (response.success) {
        setPendingAccounts(response.accounts || []);
      }
    } catch (error) {
      console.error('Error loading pending accounts:', error);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleSyncVerification = async () => {
    setLoading(true);
    try {
      const response = await syncTeacherVerification();
      if (response.success) {
        setMessage({
          type: 'success',
          text: response.message || `Synced ${response.synced} teacher accounts successfully!`
        });
        loadPendingAccounts();
      } else {
        setMessage({ type: 'danger', text: response.message || 'Failed to sync verification' });
      }
    } catch (error) {
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || 'Error syncing verification. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!canManageAccounts) return;
    loadPendingAccounts();
  }, [canManageAccounts]);

  return (
    <Container className="py-4">
      <h2 className="mb-4">Account Management & Password Reset</h2>

      {!canManageAccounts ? (
        <Alert variant="danger">
          You do not have permission to access this page. Only Admins and Coordinators can reset passwords.
        </Alert>
      ) : (
        <>
          {message.text && (
            <Alert variant={message.type} dismissible onClose={() => setMessage({ type: '', text: '' })}>
              {message.text}
            </Alert>
          )}

          <div className="row g-4">
            {/* Password Reset Form */}
            <div className="col-md-6">
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Reset User Password</h5>
                </Card.Header>
                <Card.Body>
                  <Form onSubmit={handleResetPassword}>
                    <Form.Group className="mb-3">
                      <Form.Label>User Email</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={resetForm.email}
                        onChange={handleResetFormChange}
                        placeholder="Enter user's email address"
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>New Password</Form.Label>
                      <Form.Control
                        type="password"
                        name="newPassword"
                        value={resetForm.newPassword}
                        onChange={handleResetFormChange}
                        placeholder="Enter new password (min 6 characters)"
                        required
                        minLength={6}
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Confirm Password</Form.Label>
                      <Form.Control
                        type="password"
                        name="confirmPassword"
                        value={resetForm.confirmPassword}
                        onChange={handleResetFormChange}
                        placeholder="Confirm new password"
                        required
                        minLength={6}
                      />
                    </Form.Group>

                    <div className="d-flex gap-2">
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={loading}
                      >
                        {loading ? <><Spinner size="sm" className="me-2" /> Resetting...</> : 'Reset Password'}
                      </Button>
                      <Button
                        type="button"
                        variant="warning"
                        onClick={handleFixDoubleHashed}
                        disabled={loading || !resetForm.email}
                      >
                        Fix Double-Hashed
                      </Button>
                    </div>
                  </Form>
                </Card.Body>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="col-md-6">
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Quick Actions</h5>
                </Card.Header>
                <Card.Body>
                  <div className="d-grid gap-2">
                    <Button
                      variant="info"
                      onClick={loadPendingAccounts}
                      disabled={loadingPending}
                    >
                      {loadingPending ? <><Spinner size="sm" className="me-2" /> Loading...</> : 'Refresh Pending Accounts'}
                    </Button>
                    <Button
                      variant="success"
                      onClick={handleSyncVerification}
                      disabled={loading}
                    >
                      {loading ? <><Spinner size="sm" className="me-2" /> Syncing...</> : 'Sync Teacher Verification'}
                    </Button>
                    {resetForm.email && (
                      <Button
                        variant="outline-primary"
                        onClick={() => handleVerifyAccount(resetForm.email)}
                        disabled={loading}
                      >
                        Verify Account by Email
                      </Button>
                    )}
                  </div>
                  <div className="mt-3">
                    <small className="text-muted">
                      <strong>Sync Teacher Verification:</strong> Syncs verification status from Teacher model to User model for all verified teachers.
                    </small>
                  </div>
                </Card.Body>
              </Card>
            </div>
          </div>

          {/* Pending Accounts */}
          <Card className="mt-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Pending Accounts ({pendingAccounts.length})</h5>
              <Button variant="outline-primary" size="sm" onClick={loadPendingAccounts} disabled={loadingPending}>
                {loadingPending ? <Spinner size="sm" /> : 'Refresh'}
              </Button>
            </Card.Header>
            <Card.Body>
              {loadingPending ? (
                <div className="text-center py-3">
                  <Spinner />
                </div>
              ) : pendingAccounts.length === 0 ? (
                <Alert variant="info">No pending accounts found.</Alert>
              ) : (
                <Table striped hover responsive>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingAccounts.map(account => (
                      <tr key={account._id || account.id}>
                        <td>{account.fullName}</td>
                        <td>{account.email}</td>
                        <td>
                          <Badge bg="secondary">{account.role}</Badge>
                        </td>
                        <td>
                          <Badge bg="warning">{account.accountStatus || 'pending'}</Badge>
                        </td>
                        <td>{new Date(account.createdAt).toLocaleDateString()}</td>
                        <td>
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => {
                              setResetForm(prev => ({ ...prev, email: account.email }));
                              handleVerifyAccount(account.email);
                            }}
                            disabled={loading}
                          >
                            Verify
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </>
      )}
    </Container>
  );
};

export default PasswordReset;
