import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { examsAPI } from '../api/exams';
import teachersAPI from '../api/teachers';
import classesAPI from '../api/classes';
import { useAuth } from '../store/auth';
import { ROLES } from '../utils/roles';

const emptyForm = { name: '', code: '', description: '', classes: [], teachers: [] };
const idOf = value => value?._id || value;
const teacherId = teacher => teacher?.user?._id || teacher?.user || teacher?._id;
const teacherName = teacher => teacher?.user?.fullName || teacher?.fullName || teacher?.personalInfo?.fullName || teacher?.email || 'Teacher';

const SubjectManagement = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState(null);
  const canEdit = [ROLES.ADMIN, ROLES.COORDINATOR, ROLES.PRINCIPAL, ROLES.HOD].includes(user?.role);
  const canDelete = [ROLES.ADMIN, ROLES.COORDINATOR, ROLES.PRINCIPAL].includes(user?.role);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [subjectResult, teacherResult, classResult] = await Promise.all([
        examsAPI.getSubjects({ includeInactive: true }),
        teachersAPI.getTeachers({ status: 'active', isVerified: 'true', limit: 300 }),
        classesAPI.getClasses({ status: 'active', limit: 300, showAllYears: 'true' })
      ]);
      setSubjects(subjectResult.subjects || []);
      setTeachers(teacherResult.teachers || teacherResult.data?.teachers || []);
      setClasses(classResult.classes || classResult.data?.classes || classResult.docs || []);
    } catch (error) {
      setMessage({ type: 'danger', text: error.response?.data?.message || 'Could not load subjects.' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  const filtered = useMemo(() => subjects.filter(subject => `${subject.name} ${subject.code}`.toLowerCase().includes(search.toLowerCase())), [subjects, search]);
  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = subject => {
    setEditing(subject);
    setForm({ name: subject.name || '', code: subject.code || '', description: subject.description || '', classes: (subject.classes || []).map(idOf), teachers: (subject.teachers || []).map(link => idOf(link.teacher)) });
    setShowForm(true);
  };
  const toggle = (field, value) => setForm(current => ({ ...current, [field]: current[field].includes(value) ? current[field].filter(id => id !== value) : [...current[field], value] }));
  const save = async event => {
    event.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, teachers: form.teachers.map(teacher => ({ teacher })) };
      if (editing) await examsAPI.updateSubject(editing._id, payload); else await examsAPI.createSubject(payload);
      setMessage({ type: 'success', text: `Subject ${editing ? 'updated' : 'created'} successfully.` });
      setShowForm(false); await loadData();
    } catch (error) { setMessage({ type: 'danger', text: error.response?.data?.message || 'Could not save subject.' }); }
    finally { setSaving(false); }
  };
  const remove = async subject => {
    if (!window.confirm(`Remove ${subject.name} from the active subject list? Historical exams and results will stay saved.`)) return;
    try { await examsAPI.deleteSubject(subject._id); setMessage({ type: 'success', text: 'Subject removed. Historical exam data is unchanged.' }); await loadData(); }
    catch (error) { setMessage({ type: 'danger', text: error.response?.data?.message || 'Could not remove subject.' }); }
  };

  return <div className="subject-page">
    <header className="subject-page-header"><div><span className="page-eyebrow">Academic setup</span><h1>Subjects</h1><p>Manage subjects, linked classes, and teaching responsibility.</p></div>{canEdit && <Button onClick={openCreate}>Add subject</Button>}</header>
    {message && <Alert variant={message.type} dismissible onClose={() => setMessage(null)}>{message.text}</Alert>}
    <div className="subject-toolbar"><Form.Control value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by subject name or code" /><span>{filtered.length} subjects</span></div>
    {loading ? <div className="text-center py-5"><Spinner /></div> : <div className="subject-table-wrap"><table className="subject-table"><thead><tr><th>Subject</th><th>Linked classes</th><th>Assigned teachers</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map(subject => <tr key={subject._id} className={!subject.isActive ? 'is-inactive' : ''}>
      <td><strong>{subject.name}</strong><span>{subject.code}</span></td>
      <td><div className="subject-chip-list">{(subject.classes || []).slice(0, 3).map(item => <Badge key={idOf(item)} bg="light" text="dark">{item.className || item.subject}</Badge>)}{!subject.classes?.length && <span className="text-muted">Not linked</span>}</div></td>
      <td><div className="subject-teacher-list">{(subject.teachers || []).slice(0, 3).map(link => <span key={idOf(link.teacher)}>{teacherName(link.teacher)}</span>)}{!subject.teachers?.length && <span className="text-muted">Inherited from class</span>}</div></td>
      <td><Badge bg={subject.isActive ? 'success' : 'secondary'}>{subject.isActive ? 'Active' : 'Archived'}</Badge></td>
      <td><div className="subject-actions">{canEdit && <Button size="sm" variant="outline-primary" onClick={() => openEdit(subject)}>Edit</Button>}{canDelete && subject.isActive && <Button size="sm" variant="outline-danger" onClick={() => remove(subject)}>Delete</Button>}</div></td>
    </tr>)}</tbody></table></div>}
    <Modal show={showForm} onHide={() => setShowForm(false)} size="lg" scrollable fullscreen="sm-down"><Form onSubmit={save}><Modal.Header closeButton><Modal.Title>{editing ? 'Edit subject' : 'Add subject'}</Modal.Title></Modal.Header><Modal.Body><div className="subject-form-grid">
      <Form.Group><Form.Label>Subject name *</Form.Label><Form.Control required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Form.Group>
      <Form.Group><Form.Label>Subject code *</Form.Label><Form.Control required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} /></Form.Group>
      <Form.Group className="full"><Form.Label>Description</Form.Label><Form.Control as="textarea" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Form.Group>
      <section className="subject-link-section full"><div><h2>Linked classes</h2><p>Class teachers and additional teachers inherit subject access.</p></div><div className="subject-option-grid">{classes.map(item => <label key={item._id} className={form.classes.includes(item._id) ? 'selected' : ''}><Form.Check checked={form.classes.includes(item._id)} onChange={() => toggle('classes', item._id)} /><span><strong>{item.className}</strong><small>{item.subject}</small></span></label>)}</div></section>
      <section className="subject-link-section full"><div><h2>Direct teacher assignment</h2><p>Add teachers who need this subject even when they are not linked through a class.</p></div><div className="subject-option-grid">{teachers.map(item => { const id = teacherId(item); return <label key={id} className={form.teachers.includes(id) ? 'selected' : ''}><Form.Check checked={form.teachers.includes(id)} onChange={() => toggle('teachers', id)} /><span><strong>{teacherName(item)}</strong><small>{item.user?.email || item.email || 'Teacher'}</small></span></label>; })}</div></section>
    </div></Modal.Body><Modal.Footer><Button variant="outline-secondary" onClick={() => setShowForm(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save subject'}</Button></Modal.Footer></Form></Modal>
  </div>;
};

export default SubjectManagement;
