import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/auth';
import { ROLES } from '../../utils/roles';
import api from '../../api/client';

const DailyAttendance = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState(null);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showInitializeModal, setShowInitializeModal] = useState(false);
  const [showBulkMarkModal, setShowBulkMarkModal] = useState(false);
  const [bulkMarkData, setBulkMarkData] = useState({
    sessionKey: '',
    status: 'Present',
    notes: ''
  });
  
  const [sessionStatuses, setSessionStatuses] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [studentAttendanceForm, setStudentAttendanceForm] = useState({});
  const [selectedSession, setSelectedSession] = useState('');
  const [showSessionMarkingModal, setShowSessionMarkingModal] = useState(false);
  const [sessionMarkingData, setSessionMarkingData] = useState({});

  useEffect(() => {
    if (selectedDate) {
      loadAttendanceData();
    }
  }, [selectedDate]);

  const loadAttendanceData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/attendance/daily/${selectedDate}`);
      if (response.data.success) {
        setAttendanceData(response.data.data);
        setStudents(response.data.data.attendanceRecords || []);
        const loadedSessions = response.data.data.sessions || [];
        setSessions(loadedSessions);
        
        const statuses = {};
        loadedSessions.forEach(session => {
          statuses[session.key] = 'Present';
        });
        setSessionStatuses(statuses);
        
        if (loadedSessions.length === 0) {
          setError('No attendance sessions found. Sessions will be initialized automatically on next load.');
        }
      } else {
        setError(response.data.message || 'Failed to load attendance data');
      }
    } catch (error) {
      console.error('Error loading attendance data:', error);
      if (error.response?.status === 404) {
        setAttendanceData(null);
        setStudents([]);
        setSessions([]);
      } else {
        setError('Failed to load attendance data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const initializeDailyAttendance = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/attendance/bulk-initialize', {
        date: selectedDate
      });
      
      if (response.data.success) {
        setSuccess('Daily attendance initialized successfully!');
        setShowInitializeModal(false);
        await loadAttendanceData();
      } else {
        setError(response.data.message || 'Failed to initialize attendance');
      }
    } catch (error) {
      console.error('Error initializing attendance:', error);
      setError('Failed to initialize attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const bulkMarkSession = async () => {
    if (!bulkMarkData.sessionKey) {
      setError('Please select a session');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      console.log('📋 Bulk marking session:', {
        date: selectedDate,
        sessionKey: bulkMarkData.sessionKey,
        status: bulkMarkData.status,
        notes: bulkMarkData.notes
      });
      
      const response = await api.post('/attendance/bulk-mark-session', {
        date: selectedDate,
        sessionKey: bulkMarkData.sessionKey,
        status: bulkMarkData.status,
        notes: bulkMarkData.notes
      });
      
      console.log('✅ Bulk mark response:', response.data);
      
      if (response.data.success) {
        setSuccess(`Successfully marked ${bulkMarkData.status} for all students in ${bulkMarkData.sessionKey}`);
        setShowBulkMarkModal(false);
        setBulkMarkData({
          sessionKey: '',
          status: 'Present',
          notes: ''
        });
        await loadAttendanceData();
      } else {
        setError(response.data.message || 'Failed to mark session attendance');
      }
    } catch (error) {
      console.error('Error marking session attendance:', error);
      const errorMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Failed to mark session attendance. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const markIndividualSession = async (student, sessionKey, status, notes = '') => {
    try {
      const studentId = getStudentId(student);
      const response = await api.post('/attendance/mark-session', {
        studentId,
        date: selectedDate,
        sessionKey,
        status,
        notes
      });
      
      if (response.data.success) {
        setSuccess(`Attendance marked successfully!`);
        await loadAttendanceData();
      } else {
        setError(response.data.message || 'Failed to mark individual session');
      }
    } catch (error) {
      console.error('Error marking individual session:', error);
      setError('Failed to mark individual session. Please try again.');
    }
  };

  const handleOpenStudentModal = (student) => {
    setSelectedStudent(student);
    
    const formData = {};
    sessions.forEach(session => {
      const sessionData = student.sessions?.[session.key];
      formData[session.key] = {
        status: sessionData?.status || 'Present',
        notes: sessionData?.notes || ''
      };
    });
    
    setStudentAttendanceForm(formData);
    setShowStudentModal(true);
  };

  const getStudentId = (student) => {
    return student.student?._id || student.student || student._id;
  };

  const handleStudentFormChange = (sessionKey, field, value) => {
    setStudentAttendanceForm(prev => ({
      ...prev,
      [sessionKey]: {
        ...prev[sessionKey],
        [field]: value
      }
    }));
  };

  const handleSaveStudentAttendance = async () => {
    if (!selectedStudent) return;

    try {
      setLoading(true);
      setError('');
      
      const studentId = getStudentId(selectedStudent);
      const promises = Object.entries(studentAttendanceForm).map(([sessionKey, data]) => 
        api.post('/attendance/mark-session', {
          studentId: studentId,
          date: selectedDate,
          sessionKey,
          status: data.status,
          notes: data.notes
        })
      );

      await Promise.all(promises);
      
      setSuccess('Student attendance updated successfully!');
      setShowStudentModal(false);
      await loadAttendanceData();
    } catch (error) {
      console.error('Error saving student attendance:', error);
      setError('Failed to save attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Present': 'bg-emerald-100 text-emerald-700 border-emerald-300',
      'Absent': 'bg-rose-100 text-rose-700 border-rose-300',
      'Sick': 'bg-amber-100 text-amber-700 border-amber-300',
      'Leave': 'bg-sky-100 text-sky-700 border-sky-300'
    };
    return colors[status] || 'bg-slate-100 text-slate-700 border-slate-300';
  };

  const canManageAttendance = user?.role === ROLES.ADMIN || user?.role === ROLES.PRINCIPAL || user?.role === ROLES.CARETAKER;

  if (loading && !attendanceData) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Daily Hostel Attendance</h1>
          <p className="text-slate-500 mt-1">Manage 14 daily attendance sessions for all students</p>
        </div>
        {canManageAttendance && (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setShowInitializeModal(true)}
              disabled={attendanceData !== null}
              className="px-5 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-200"
            >
              Initialize Daily Attendance
            </button>
            <button
              onClick={() => setShowBulkMarkModal(true)}
              disabled={!attendanceData}
              className="px-5 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200"
            >
              Bulk Mark Session
            </button>
          </div>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-rose-100 border-l-4 border-rose-500 text-rose-800 p-4 rounded-xl font-medium flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-rose-600 hover:text-rose-800 text-xl">×</button>
        </div>
      )}

      {success && (
        <div className="bg-emerald-100 border-l-4 border-emerald-500 text-emerald-800 p-4 rounded-xl font-medium flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-emerald-600 hover:text-emerald-800 text-xl">×</button>
        </div>
      )}

      {/* Date Selection Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-4">
          <h3 className="text-white font-semibold text-lg">📅 Select Attendance Date</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Select Date</label>
              <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 text-base"
              />
              <p className="text-sm text-slate-500 mt-2">Choose the date for attendance period (14 sessions)</p>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              {attendanceData ? (
                <>
                  <div className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl font-semibold">
                      👥 {attendanceData.totalStudents || students.length} Students
                  </div>
                  <div className="px-4 py-2 bg-sky-100 text-sky-700 rounded-xl font-semibold">
                      📋 {sessions.length} Sessions
                  </div>
                  <div className="px-4 py-2 bg-violet-100 text-violet-700 rounded-xl font-semibold">
                      📅 {new Date(selectedDate).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                  </div>
                </>
              ) : (
                <div className="w-full bg-amber-100 border-l-4 border-amber-500 text-amber-800 p-4 rounded-xl">
                  <p className="font-semibold mb-2">⚠️ No attendance data for this date.</p>
                  {canManageAttendance && (
                    <button
                        onClick={() => setShowInitializeModal(true)}
                      className="px-4 py-2 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors text-sm"
                      >
                        Initialize Attendance for This Date
                    </button>
                  )}
                    </div>
                  )}
            </div>
          </div>
        </div>
      </div>

      {/* Sessions Selection */}
      {sessions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-4">
            <h3 className="text-white font-semibold text-lg">📋 Select Session to Mark Attendance</h3>
            <p className="text-sky-100 text-sm mt-1">Choose a session and mark attendance for all students</p>
          </div>
          <div className="p-6">
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Select Session:</label>
              <select
                    value={selectedSession}
                    onChange={(e) => setSelectedSession(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100 text-base bg-white"
                  >
                    <option value="">-- Choose a session to mark attendance --</option>
                    {sessions.map((session, index) => (
                      <option key={session.key} value={session.key}>
                        {index + 1}. {session.time} - {session.name}
                      </option>
                    ))}
              </select>
            </div>
            {selectedSession && (
              <div className="bg-sky-50 border-l-4 border-sky-500 text-sky-800 p-4 rounded-xl mb-4">
                <p className="font-semibold">
                  Selected: {sessions.find(s => s.key === selectedSession)?.time} - {sessions.find(s => s.key === selectedSession)?.name}
                </p>
                {canManageAttendance && (
                  <button
                    onClick={() => setShowSessionMarkingModal(true)}
                    className="mt-3 px-4 py-2 bg-sky-500 text-white rounded-lg font-semibold hover:bg-sky-600 transition-colors text-sm"
                  >
                    📝 Mark Selected Session
                  </button>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {sessions.map((session, index) => (
                <button
                  key={session.key} 
                  onClick={() => setSelectedSession(session.key)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    selectedSession === session.key
                      ? 'bg-sky-500 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {index + 1}. {session.time} - {session.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Students List - Mobile Card View */}
      {attendanceData && students.length > 0 && sessions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800 text-lg">
                  👥 Students Attendance - {new Date(selectedDate).toLocaleDateString()}
            </h3>
            <p className="text-sm text-slate-500 mt-1">Click on student card to view/edit all sessions</p>
          </div>
          <div className="p-4 sm:p-6">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Admission No</th>
                    {sessions.map((session, index) => (
                      <th key={session.key} className="px-2 py-3 text-center text-xs font-bold text-slate-500 uppercase min-w-[60px]">
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-slate-400">{index + 1}</span>
                          <span className="text-xs">{session.time}</span>
                          <span className="text-xs font-semibold">{session.name}</span>
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Overall</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student, index) => {
                    const presentCount = student.statistics?.presentCount || 0;
                    const totalSessions = student.statistics?.totalSessions || 14;
                    const percentage = student.statistics?.attendancePercentage || 0;
                    
                    return (
                      <tr key={student.student?._id || student._id || index} className="hover:bg-violet-50 transition-colors">
                        <td className="px-4 py-4 text-sm text-slate-600">{index + 1}</td>
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-800">{student.student?.fullName || 'Unknown'}</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-semibold">
                            {student.student?.admissionNo || 'N/A'}
                          </span>
                        </td>
                        {sessions.map(session => {
                          const sessionData = student.sessions?.[session.key];
                          const status = sessionData?.status || 'Present';
                          
                          return (
                            <td key={session.key} className="px-2 py-4 text-center">
                              {canManageAttendance ? (
                                <div className="flex flex-col gap-1">
                                  <button
                                    onClick={() => markIndividualSession(student, session.key, 'Present')}
                                    className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${
                                      status === 'Present' ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    }`}
                                  >
                                    P
                                  </button>
                                  <button
                                    onClick={() => markIndividualSession(student, session.key, 'Absent')}
                                    className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${
                                      status === 'Absent' ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                    }`}
                                  >
                                    A
                                  </button>
                                  <button
                                    onClick={() => markIndividualSession(student, session.key, 'Sick')}
                                    className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${
                                      status === 'Sick' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                    }`}
                                  >
                                    S
                                  </button>
                                  <button
                                    onClick={() => markIndividualSession(student, session.key, 'Leave')}
                                    className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${
                                      status === 'Leave' ? 'bg-sky-500 text-white' : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                                    }`}
                                  >
                                    L
                                  </button>
                                </div>
                              ) : (
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(status)}`}>
                                  {status.charAt(0)}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              percentage >= 90 ? 'bg-emerald-100 text-emerald-700' :
                              percentage >= 75 ? 'bg-sky-100 text-sky-700' :
                              percentage >= 60 ? 'bg-amber-100 text-amber-700' :
                              'bg-rose-100 text-rose-700'
                            }`}>
                            {percentage}%
                            </span>
                            <span className="text-xs text-slate-500">{presentCount}/{totalSessions}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                              onClick={() => handleOpenStudentModal(student)}
                            className="px-4 py-2 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 transition-colors text-sm"
                          >
                            {canManageAttendance ? '✏️ Edit' : '👁️ View'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {students.map((student, index) => {
                const presentCount = student.statistics?.presentCount || 0;
                const totalSessions = student.statistics?.totalSessions || 14;
                const percentage = student.statistics?.attendancePercentage || 0;
                
                return (
                  <div key={student.student?._id || student._id || index} className="bg-white border-2 border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-slate-800">{student.student?.fullName || 'Unknown'}</h4>
                        <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-semibold mt-1 inline-block">
                          {student.student?.admissionNo || 'N/A'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold block mb-1 ${
                          percentage >= 90 ? 'bg-emerald-100 text-emerald-700' :
                          percentage >= 75 ? 'bg-sky-100 text-sky-700' :
                          percentage >= 60 ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {percentage}%
                        </span>
                        <span className="text-xs text-slate-500">{presentCount}/{totalSessions}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                      {sessions.slice(0, 6).map(session => {
                        const sessionData = student.sessions?.[session.key];
                        const status = sessionData?.status || 'Present';
                        return (
                          <div key={session.key} className="text-center">
                            <div className="text-xs text-slate-500 mb-1">{session.time}</div>
                            {canManageAttendance ? (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => markIndividualSession(student, session.key, 'Present')}
                                  className={`flex-1 px-2 py-2 rounded-lg text-xs font-semibold min-h-[36px] ${
                                    status === 'Present' ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700'
                                  }`}
                                >
                                  P
                                </button>
                                <button
                                  onClick={() => markIndividualSession(student, session.key, 'Absent')}
                                  className={`flex-1 px-2 py-2 rounded-lg text-xs font-semibold min-h-[36px] ${
                                    status === 'Absent' ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-700'
                                  }`}
                                >
                                  A
                                </button>
                              </div>
                            ) : (
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(status)}`}>
                                {status.charAt(0)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => handleOpenStudentModal(student)}
                      className="w-full px-4 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors"
                    >
                      {canManageAttendance ? '✏️ Edit All Sessions' : '👁️ View All Sessions'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* No Data Messages */}
      {attendanceData && students.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="bg-sky-100 border-l-4 border-sky-500 text-sky-800 p-4 rounded-xl">
            <h5 className="font-semibold mb-2">No students found for this date</h5>
            <p className="text-sm mb-4">Please initialize attendance for this date first.</p>
              {canManageAttendance && (
              <button
                  onClick={() => setShowInitializeModal(true)}
                className="px-5 py-2.5 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors"
                >
                  Initialize Attendance
              </button>
              )}
          </div>
        </div>
      )}

      {!attendanceData && !loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-800 p-4 rounded-xl">
            <h5 className="font-semibold mb-2">No attendance data for {new Date(selectedDate).toLocaleDateString()}</h5>
            <p className="text-sm mb-4">Please initialize attendance for this date to start marking.</p>
              {canManageAttendance && (
              <button
                  onClick={() => setShowInitializeModal(true)}
                className="px-5 py-2.5 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors"
                >
                  Initialize Attendance for This Date
              </button>
            )}
          </div>
        </div>
      )}

      {/* Initialize Modal */}
      {showInitializeModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Initialize Daily Attendance</h2>
              <button onClick={() => setShowInitializeModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">×</button>
            </div>
            <div className="p-6 space-y-4">
          <p>This will create attendance records for all active students for <strong>{selectedDate}</strong>.</p>
          <p>All sessions will be marked as "Absent" initially and can be updated later.</p>
              <div className="bg-sky-100 border-l-4 border-sky-500 text-sky-800 p-4 rounded-xl">
                <p className="text-sm font-semibold">Note: This action cannot be undone. If attendance already exists for this date, it will not be overwritten.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 p-6 border-t border-slate-200">
              <button
                onClick={() => setShowInitializeModal(false)}
                className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-colors"
              >
            Cancel
              </button>
              <button
                onClick={initializeDailyAttendance}
                className="flex-1 px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200"
              >
            Initialize Attendance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Modal - Edit All Sessions */}
      {showStudentModal && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">
            📝 Mark/Update Attendance - {selectedStudent?.student?.fullName || 'Student'}
              </h2>
              <button onClick={() => setShowStudentModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 text-white">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                    <span className="font-semibold text-slate-600">📅 Date:</span>{' '}
                    <span className="text-slate-800">{new Date(selectedDate).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                    })}</span>
                      </div>
                      <div>
                    <span className="font-semibold text-slate-600">🎓 Admission No:</span>{' '}
                    <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-semibold">
                      {selectedStudent.student?.admissionNo || 'N/A'}
                    </span>
                      </div>
                </div>
              </div>

              <div className="bg-sky-50 border-l-4 border-sky-500 text-sky-800 p-4 rounded-xl">
                <p className="text-sm font-semibold">ℹ️ Instructions: Select status for each of the 14 daily sessions. You can add optional notes for any session.</p>
              </div>

              <div className="space-y-3">
                    {sessions.map((session, index) => {
                      const formData = studentAttendanceForm[session.key] || { status: 'Present', notes: '' };
                      const currentStatus = selectedStudent.sessions?.[session.key]?.status || 'Present';
                      
                      return (
                    <div key={session.key} className="bg-white border-2 border-slate-200 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">{index + 1}</span>
                            <span className="font-semibold text-slate-800">{session.name}</span>
                          </div>
                          <span className="text-sm text-slate-500">{session.time}</span>
                        </div>
                        <select
                              value={formData.status}
                              onChange={(e) => handleStudentFormChange(session.key, 'status', e.target.value)}
                              disabled={!canManageAttendance}
                          className={`px-4 py-2 rounded-xl border-2 font-semibold text-sm ${
                            formData.status === 'Present' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' :
                            formData.status === 'Absent' ? 'border-rose-300 bg-rose-50 text-rose-700' :
                            formData.status === 'Sick' ? 'border-amber-300 bg-amber-50 text-amber-700' :
                            'border-sky-300 bg-sky-50 text-sky-700'
                          } disabled:opacity-50`}
                            >
                              <option value="Present">✅ Present</option>
                              <option value="Absent">❌ Absent</option>
                              <option value="Sick">🤒 Sick</option>
                              <option value="Leave">🏖️ Leave</option>
                        </select>
                      </div>
                            {currentStatus !== formData.status && (
                        <p className="text-xs text-slate-500 mb-2">Changed from: {currentStatus}</p>
                            )}
                      <input
                              type="text"
                              placeholder="Add notes if needed..."
                              value={formData.notes}
                              onChange={(e) => handleStudentFormChange(session.key, 'notes', e.target.value)}
                              disabled={!canManageAttendance}
                        className="w-full px-4 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 text-sm disabled:opacity-50"
                            />
                    </div>
                      );
                    })}
              </div>

              {/* Summary */}
              <div className="bg-emerald-50 rounded-xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div>
                    <span className="font-semibold text-slate-600">✅ Present:</span>{' '}
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                          {Object.values(studentAttendanceForm).filter(f => f.status === 'Present').length}
                    </span>
                      </div>
                      <div>
                    <span className="font-semibold text-slate-600">❌ Absent:</span>{' '}
                    <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-semibold">
                          {Object.values(studentAttendanceForm).filter(f => f.status === 'Absent').length}
                    </span>
                      </div>
                      <div>
                    <span className="font-semibold text-slate-600">📊 Total Sessions:</span>{' '}
                    <span className="px-2 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-semibold">
                      {sessions.length}
                    </span>
                      </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowStudentModal(false)}
                className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-colors"
              >
            ❌ Cancel
              </button>
          {canManageAttendance && (
                <button
              onClick={handleSaveStudentAttendance}
              disabled={loading}
                  className="flex-1 px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 disabled:opacity-50"
            >
              {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                    </span>
              ) : (
                '💾 Save Attendance'
              )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Session Marking Modal */}
      {showSessionMarkingModal && selectedSession && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">📝 Mark Session Attendance</h2>
              <button onClick={() => setShowSessionMarkingModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 text-white">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-sky-50 border-l-4 border-sky-500 text-sky-800 p-4 rounded-xl">
                <p className="font-semibold mb-1">Session: {sessions.find(s => s.key === selectedSession)?.time} - {sessions.find(s => s.key === selectedSession)?.name}</p>
                <p className="text-sm">Date: {new Date(selectedDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
                <p className="text-sm">Total Students: {students.length}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Status for All Students:</label>
                <select
                  value={sessionMarkingData.status || 'Present'}
                  onChange={(e) => setSessionMarkingData({...sessionMarkingData, status: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 text-base bg-white"
                >
                  <option value="Present">✅ Present</option>
                  <option value="Absent">❌ Absent</option>
                  <option value="Sick">🤒 Sick</option>
                  <option value="Leave">🏖️ Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Notes (Optional):</label>
                <textarea
                  rows={3}
                  value={sessionMarkingData.notes || ''}
                  onChange={(e) => setSessionMarkingData({...sessionMarkingData, notes: e.target.value})}
                  placeholder="Add notes for this session (applies to all students)..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 text-base"
                />
              </div>

              <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-800 p-4 rounded-xl">
                <p className="text-sm font-semibold">⚠️ Warning: This will mark <strong>{sessionMarkingData.status || 'Present'}</strong> for all <strong>{students.length} students</strong> in this session.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Student Name</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Current Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Will Be Marked As</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((student, index) => {
                      const currentStatus = student.sessions?.[selectedSession]?.status || 'Present';
                      return (
                        <tr key={student.student?._id || student._id || index} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-600">{index + 1}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{student.student?.fullName || 'Unknown'}</div>
                            <span className="text-xs text-slate-500">{student.student?.admissionNo || 'N/A'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(currentStatus)}`}>
                              {currentStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(sessionMarkingData.status || 'Present')}`}>
                              {sessionMarkingData.status || 'Present'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowSessionMarkingModal(false)}
                className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-colors"
              >
            Cancel
              </button>
              <button
            onClick={async () => {
              try {
                setLoading(true);
                setError('');
                
                const response = await api.post('/attendance/bulk-mark-session', {
                  date: selectedDate,
                  sessionKey: selectedSession,
                  status: sessionMarkingData.status || 'Present',
                  notes: sessionMarkingData.notes || ''
                });
                
                if (response.data.success) {
                      setSuccess(`Successfully marked ${sessionMarkingData.status || 'Present'} for all students`);
                  setShowSessionMarkingModal(false);
                  setSessionMarkingData({});
                  await loadAttendanceData();
                } else {
                  setError(response.data.message || 'Failed to mark session attendance');
                }
              } catch (error) {
                console.error('Error marking session attendance:', error);
                    const errorMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Failed to mark session attendance. Please try again.';
                    setError(errorMessage);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
                className="flex-1 px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 disabled:opacity-50"
          >
            {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Marking...
                  </span>
            ) : (
              `✅ Mark All Students as ${sessionMarkingData.status || 'Present'}`
            )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Mark Modal */}
      {showBulkMarkModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">📋 Bulk Mark Session</h2>
              <button onClick={() => setShowBulkMarkModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Select Session</label>
                <select
                value={bulkMarkData.sessionKey}
                onChange={(e) => setBulkMarkData({...bulkMarkData, sessionKey: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 text-base bg-white"
              >
                <option value="">Choose a session...</option>
                {sessions.map(session => (
                  <option key={session.key} value={session.key}>
                    {session.time} - {session.name}
                  </option>
                ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Status for All Students</label>
                <select
                value={bulkMarkData.status}
                onChange={(e) => setBulkMarkData({...bulkMarkData, status: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 text-base bg-white"
              >
                <option value="Present">✅ Present</option>
                <option value="Absent">❌ Absent</option>
                <option value="Sick">🤒 Sick</option>
                <option value="Leave">🏖️ Leave</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Notes (Optional)</label>
                <textarea
                rows={2}
                value={bulkMarkData.notes}
                onChange={(e) => setBulkMarkData({...bulkMarkData, notes: e.target.value})}
                placeholder="Add any notes for this session..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 text-base"
                />
              </div>
              
              <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-800 p-4 rounded-xl">
                <p className="text-sm font-semibold">⚠️ Warning: This will mark <strong>{bulkMarkData.status}</strong> for ALL {students.length} students in the selected session.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 p-6 border-t border-slate-200">
              <button
                onClick={() => setShowBulkMarkModal(false)}
                className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-colors"
              >
            Cancel
              </button>
              <button
            onClick={bulkMarkSession}
                disabled={!bulkMarkData.sessionKey || loading}
                className="flex-1 px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Marking...
                  </>
                ) : (
                  'Mark All Students'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyAttendance;
