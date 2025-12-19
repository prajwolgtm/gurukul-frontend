import { useState, useEffect } from 'react';
import { parentDashboardAPI } from '../api/parent-dashboard';
import { getLeaveRequests, createLeaveRequest, getVisitRequests, createVisitRequest } from '../api/requests';
import { useAuth } from '../store/auth';

const ParentDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('info');

  // Student Info
  const [studentInfo, setStudentInfo] = useState(null);
  
  // Exam Marks
  const [examMarks, setExamMarks] = useState([]);
  const [examFilters, setExamFilters] = useState({ academicYear: '', term: '', examType: '' });
  
  // Transactions
  const [transactions, setTransactions] = useState([]);
  const [walletInfo, setWalletInfo] = useState(null);
  
  // Notes
  const [notes, setNotes] = useState([]);
  
  // Requests
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [visitRequests, setVisitRequests] = useState([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  
  const [leaveForm, setLeaveForm] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    isFullDay: true,
    startTime: '',
    endTime: '',
    reason: '',
    emergencyContact: { name: '', phone: '', relationship: '' }
  });
  
  const [visitForm, setVisitForm] = useState({
    visitType: '',
    preferredDate: '',
    preferredStartTime: '',
    preferredEndTime: '',
    purpose: '',
    numberOfVisitors: 1
  });

  useEffect(() => {
    loadData();
  }, [activeTab, examFilters]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      switch (activeTab) {
        case 'info':
          const infoRes = await parentDashboardAPI.getStudentInfo();
          if (infoRes.success) setStudentInfo(infoRes.data);
          break;
        case 'marks':
          const marksRes = await parentDashboardAPI.getExamMarks(examFilters);
          if (marksRes.success) setExamMarks(marksRes.data);
          break;
        case 'transactions':
          const transRes = await parentDashboardAPI.getTransactions();
          if (transRes.success) {
            setTransactions(transRes.data || []);
            setWalletInfo(transRes.wallet || null);
          }
          break;
        case 'notes':
          const notesRes = await parentDashboardAPI.getNotes();
          if (notesRes.success) setNotes(notesRes.data);
          break;
        case 'requests':
          const leaveRes = await getLeaveRequests();
          if (leaveRes.success) {
            const leaveData = leaveRes.data || leaveRes.leaveRequests || [];
            setLeaveRequests(leaveData);
          }
          const visitRes = await getVisitRequests();
          if (visitRes.success) {
            const visitData = visitRes.data || visitRes.visitRequests || [];
            setVisitRequests(visitData);
          }
          break;
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await createLeaveRequest(leaveForm);
      if (response.success) {
        setShowLeaveModal(false);
        setLeaveForm({
          leaveType: '', startDate: '', endDate: '', isFullDay: true,
          startTime: '', endTime: '', reason: '', emergencyContact: { name: '', phone: '', relationship: '' }
        });
        loadData();
      } else {
        setError(response.message || 'Failed to create leave request');
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to create leave request');
    }
  };

  const handleVisitSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await createVisitRequest(visitForm);
      if (response.success) {
        setShowVisitModal(false);
        setVisitForm({
          visitType: '', preferredDate: '', preferredStartTime: '', preferredEndTime: '', purpose: '', numberOfVisitors: 1
        });
        loadData();
      } else {
        setError(response.message || 'Failed to create visit request');
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to create visit request');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-amber-100 text-amber-700',
      approved: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-rose-100 text-rose-700',
      cancelled: 'bg-slate-100 text-slate-700'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${colors[status] || colors.cancelled}`}>
        {status}
      </span>
    );
  };

  const tabs = [
    { key: 'info', label: '📋 Basic Info' },
    { key: 'marks', label: '📊 Exam Marks' },
    { key: 'transactions', label: '💰 Wallet' },
    { key: 'notes', label: '📝 Notes' },
    { key: 'requests', label: '📋 Requests' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Parent Dashboard</h1>
        <p className="text-slate-500 mt-1">View your child's academic information and manage requests</p>
      </div>

      {error && (
        <div className="bg-rose-100 border-l-4 border-rose-500 text-rose-800 p-4 rounded-xl font-medium flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-rose-600 hover:text-rose-800">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 ${
                activeTab === tab.key
                  ? 'text-violet-600 border-violet-500 bg-violet-50'
                  : 'text-slate-600 border-transparent hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {/* Basic Info Tab */}
              {activeTab === 'info' && studentInfo && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 rounded-xl p-5">
                      <h3 className="font-semibold text-slate-800 mb-4">Personal Information</h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium text-slate-600">Name:</span> <span className="text-slate-800">{studentInfo.fullName}</span></p>
                        <p><span className="font-medium text-slate-600">Admission No:</span> <span className="text-slate-800">{studentInfo.admissionNo}</span></p>
                        <p><span className="font-medium text-slate-600">Date of Birth:</span> <span className="text-slate-800">{new Date(studentInfo.dateOfBirth).toLocaleDateString()}</span></p>
                        <p><span className="font-medium text-slate-600">Age:</span> <span className="text-slate-800">{studentInfo.age} years</span></p>
                        <p><span className="font-medium text-slate-600">Gender:</span> <span className="text-slate-800">{studentInfo.gender}</span></p>
                        <p><span className="font-medium text-slate-600">Blood Group:</span> <span className="text-slate-800">{studentInfo.bloodGroup || 'N/A'}</span></p>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-5">
                      <h3 className="font-semibold text-slate-800 mb-4">Academic Information</h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium text-slate-600">Department:</span> <span className="text-slate-800">{studentInfo.department?.name || 'N/A'}</span></p>
                        <p><span className="font-medium text-slate-600">Current Standard:</span> <span className="text-slate-800">{studentInfo.currentStandard || 'N/A'}</span></p>
                        <p><span className="font-medium text-slate-600">Date of Admission:</span> <span className="text-slate-800">{studentInfo.dateOfAdmission ? new Date(studentInfo.dateOfAdmission).toLocaleDateString() : 'N/A'}</span></p>
                        <p><span className="font-medium text-slate-600">Shaakha:</span> <span className="text-slate-800">{studentInfo.shaakha || 'N/A'}</span></p>
                        <p><span className="font-medium text-slate-600">Gothra:</span> <span className="text-slate-800">{studentInfo.gothra || 'N/A'}</span></p>
                        <p><span className="font-medium text-slate-600">Status:</span> <span className={`px-2 py-1 rounded-full text-xs font-semibold ${studentInfo.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{studentInfo.status}</span></p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 rounded-xl p-5">
                      <h3 className="font-semibold text-slate-800 mb-4">Contact Information</h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium text-slate-600">Phone:</span> <span className="text-slate-800">{studentInfo.phone || 'N/A'}</span></p>
                        <p><span className="font-medium text-slate-600">Email:</span> <span className="text-slate-800">{studentInfo.email || 'N/A'}</span></p>
                        <p><span className="font-medium text-slate-600">Address:</span> <span className="text-slate-800">{studentInfo.address || 'N/A'}</span></p>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-5">
                      <h3 className="font-semibold text-slate-800 mb-4">Family Information</h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium text-slate-600">Father:</span> <span className="text-slate-800">{studentInfo.fatherName}</span></p>
                        <p><span className="font-medium text-slate-600">Mother:</span> <span className="text-slate-800">{studentInfo.motherName}</span></p>
                        <p><span className="font-medium text-slate-600">Guardian Phone:</span> <span className="text-slate-800">{studentInfo.guardianPhone}</span></p>
                        <p><span className="font-medium text-slate-600">Guardian Email:</span> <span className="text-slate-800">{studentInfo.guardianEmail || 'N/A'}</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Exam Marks Tab */}
              {activeTab === 'marks' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <input
                        type="text"
                        placeholder="Academic Year"
                        value={examFilters.academicYear}
                        onChange={(e) => setExamFilters({ ...examFilters, academicYear: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 text-base"
                      />
                      <input
                        type="text"
                        placeholder="Term/Semester"
                        value={examFilters.term}
                        onChange={(e) => setExamFilters({ ...examFilters, term: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 text-base"
                      />
                      <select
                        value={examFilters.examType}
                        onChange={(e) => setExamFilters({ ...examFilters, examType: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 text-base bg-white"
                      >
                        <option value="">All Exam Types</option>
                        <option value="unit">Unit Test</option>
                        <option value="midterm">Midterm</option>
                        <option value="final">Final</option>
                        <option value="assignment">Assignment</option>
                      </select>
                    </div>
                  </div>
                  {examMarks.length === 0 ? (
                    <div className="bg-sky-100 border-l-4 border-sky-500 text-sky-800 p-4 rounded-xl">No exam marks found</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Exam</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Total</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Percentage</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Grade</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {examMarks.map((exam, idx) => (
                            <tr key={idx} className="bg-white hover:bg-violet-50 transition-colors">
                              <td className="px-4 py-4 text-sm text-slate-800 font-medium">{exam.examName}</td>
                              <td className="px-4 py-4 text-sm text-slate-600">{exam.examType}</td>
                              <td className="px-4 py-4 text-sm text-slate-600">{exam.examDate ? new Date(exam.examDate).toLocaleDateString() : 'N/A'}</td>
                              <td className="px-4 py-4 text-sm text-slate-800">{exam.totalMarksObtained}/{exam.totalMaxMarks}</td>
                              <td className="px-4 py-4 text-sm text-slate-800 font-semibold">{exam.overallPercentage?.toFixed(2) || 0}%</td>
                              <td className="px-4 py-4"><span className="px-2 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-700">{exam.overallGrade || 'N/A'}</span></td>
                              <td className="px-4 py-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${exam.isPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{exam.isPassed ? 'Pass' : 'Fail'}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Transactions Tab */}
              {activeTab === 'transactions' && (
                <div className="space-y-6">
                  {walletInfo && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                        <p className="text-violet-200 text-sm font-medium mb-1">Current Balance</p>
                        <p className="text-3xl font-bold">{walletInfo.currentBalance?.toFixed(2) || '0.00'}</p>
                        <p className="text-violet-200 text-xs mt-1">{walletInfo.currency || 'INR'}</p>
                      </div>
                      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
                        <p className="text-emerald-200 text-sm font-medium mb-1">Total Credit</p>
                        <p className="text-3xl font-bold">{walletInfo.totalCredit?.toFixed(2) || '0.00'}</p>
                        <p className="text-emerald-200 text-xs mt-1">{walletInfo.currency || 'INR'}</p>
                      </div>
                      <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-6 text-white shadow-lg">
                        <p className="text-rose-200 text-sm font-medium mb-1">Total Debit</p>
                        <p className="text-3xl font-bold">{walletInfo.totalDebit?.toFixed(2) || '0.00'}</p>
                        <p className="text-rose-200 text-xs mt-1">{walletInfo.currency || 'INR'}</p>
                      </div>
                    </div>
                  )}
                  {transactions.length === 0 ? (
                    <div className="bg-sky-100 border-l-4 border-sky-500 text-sky-800 p-4 rounded-xl">No transactions found</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Source</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Remark</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {transactions.map((tx) => (
                            <tr key={tx.id} className="bg-white hover:bg-violet-50 transition-colors">
                              <td className="px-4 py-4 text-sm text-slate-600">{new Date(tx.date).toLocaleDateString()}</td>
                              <td className="px-4 py-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  tx.type === 'credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                }`}>
                                  {tx.type === 'credit' ? 'Credit' : 'Debit'}
                                </span>
                              </td>
                              <td className={`px-4 py-4 text-sm font-semibold ${tx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {tx.type === 'credit' ? '+' : '-'}{tx.amount?.toFixed(2) || '0.00'}
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-600">{tx.source || 'N/A'}</td>
                              <td className="px-4 py-4 text-sm text-slate-600">{tx.creditRemark || tx.debitRemark || 'N/A'}</td>
                              <td className="px-4 py-4 text-sm text-slate-800 font-medium">{tx.balanceAfter?.toFixed(2) || '0.00'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Notes Tab */}
              {activeTab === 'notes' && (
                <div className="space-y-4">
                  {notes.length === 0 ? (
                    <div className="bg-sky-100 border-l-4 border-sky-500 text-sky-800 p-4 rounded-xl">No notes available</div>
                  ) : (
                    notes.map((note) => (
                      <div key={note.id || note._id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                        {note.title && (
                          <h4 className="font-semibold text-slate-800 mb-2">{note.title}</h4>
                        )}
                        <p className="text-slate-700 mb-3 whitespace-pre-wrap">{note.content}</p>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            {note.category && (
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                note.category === 'academic' ? 'bg-violet-100 text-violet-700' :
                                note.category === 'attendance' ? 'bg-amber-100 text-amber-700' :
                                note.category === 'behaviour' ? 'bg-rose-100 text-rose-700' :
                                note.category === 'health' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {note.category}
                              </span>
                            )}
                            <span className="text-xs text-slate-500">
                              By {note.createdBy || 'System'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">
                            {new Date(note.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Requests Tab */}
              {activeTab === 'requests' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => setShowLeaveModal(true)}
                      className="px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200"
                    >
                      Apply for Leave
                    </button>
                    <button
                      onClick={() => setShowVisitModal(true)}
                      className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200"
                    >
                      Request Visit
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-4">Leave Requests</h3>
                      {leaveRequests.length === 0 ? (
                        <div className="bg-sky-100 border-l-4 border-sky-500 text-sky-800 p-4 rounded-xl">No leave requests</div>
                      ) : (
                        <div className="space-y-3">
                          {leaveRequests.map((req) => (
                            <div key={req.id || req._id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-medium text-slate-800">{req.leaveType}</span>
                                {getStatusBadge(req.status)}
                              </div>
                              <p className="text-sm text-slate-600 mb-1">{new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</p>
                              <p className="text-sm text-slate-500">{req.reason}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-4">Visit Requests</h3>
                      {visitRequests.length === 0 ? (
                        <div className="bg-sky-100 border-l-4 border-sky-500 text-sky-800 p-4 rounded-xl">No visit requests</div>
                      ) : (
                        <div className="space-y-3">
                          {visitRequests.map((req) => (
                            <div key={req.id || req._id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-medium text-slate-800">{req.visitType}</span>
                                {getStatusBadge(req.status)}
                              </div>
                              <p className="text-sm text-slate-600 mb-1">{new Date(req.preferredDate).toLocaleDateString()}</p>
                              <p className="text-sm text-slate-600 mb-1">{req.preferredStartTime} - {req.preferredEndTime}</p>
                              <p className="text-sm text-slate-500">{req.purpose}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Leave Request Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Apply for Leave</h2>
              <button onClick={() => setShowLeaveModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">×</button>
            </div>
            <form onSubmit={handleLeaveSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Leave Type</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 text-base bg-white"
                >
                  <option value="">Select type</option>
                  <option value="sick_leave">Sick Leave</option>
                  <option value="family_emergency">Family Emergency</option>
                  <option value="personal">Personal</option>
                  <option value="medical_appointment">Medical Appointment</option>
                  <option value="family_function">Family Function</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 text-base"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="fullDay"
                  checked={leaveForm.isFullDay}
                  onChange={(e) => setLeaveForm({ ...leaveForm, isFullDay: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <label htmlFor="fullDay" className="text-sm font-medium text-slate-700">Full Day</label>
              </div>
              {!leaveForm.isFullDay && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={leaveForm.startTime}
                      onChange={(e) => setLeaveForm({ ...leaveForm, startTime: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">End Time</label>
                    <input
                      type="time"
                      value={leaveForm.endTime}
                      onChange={(e) => setLeaveForm({ ...leaveForm, endTime: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 text-base"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Reason</label>
                <textarea
                  rows={3}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Emergency Contact Name</label>
                <input
                  type="text"
                  value={leaveForm.emergencyContact.name}
                  onChange={(e) => setLeaveForm({ ...leaveForm, emergencyContact: { ...leaveForm.emergencyContact, name: e.target.value } })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Emergency Contact Phone</label>
                <input
                  type="text"
                  value={leaveForm.emergencyContact.phone}
                  onChange={(e) => setLeaveForm({ ...leaveForm, emergencyContact: { ...leaveForm.emergencyContact, phone: e.target.value } })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 text-base"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visit Request Modal */}
      {showVisitModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Request Visit</h2>
              <button onClick={() => setShowVisitModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">×</button>
            </div>
            <form onSubmit={handleVisitSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Visit Type</label>
                <select
                  value={visitForm.visitType}
                  onChange={(e) => setVisitForm({ ...visitForm, visitType: e.target.value })}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 text-base bg-white"
                >
                  <option value="">Select type</option>
                  <option value="meet_student">Meet Student</option>
                  <option value="academic_discussion">Academic Discussion</option>
                  <option value="general_inquiry">General Inquiry</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Preferred Date</label>
                <input
                  type="date"
                  value={visitForm.preferredDate}
                  onChange={(e) => setVisitForm({ ...visitForm, preferredDate: e.target.value })}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 text-base"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Preferred Start Time</label>
                  <input
                    type="time"
                    value={visitForm.preferredStartTime}
                    onChange={(e) => setVisitForm({ ...visitForm, preferredStartTime: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Preferred End Time</label>
                  <input
                    type="time"
                    value={visitForm.preferredEndTime}
                    onChange={(e) => setVisitForm({ ...visitForm, preferredEndTime: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 text-base"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Purpose</label>
                <textarea
                  rows={3}
                  value={visitForm.purpose}
                  onChange={(e) => setVisitForm({ ...visitForm, purpose: e.target.value })}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Number of Visitors</label>
                <input
                  type="number"
                  min="1"
                  value={visitForm.numberOfVisitors}
                  onChange={(e) => setVisitForm({ ...visitForm, numberOfVisitors: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 text-base"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowVisitModal(false)}
                  className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentDashboard;
