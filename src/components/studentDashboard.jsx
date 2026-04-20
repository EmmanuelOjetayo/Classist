import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import Swal from 'sweetalert2';
import { Query } from 'appwrite';
import Header from "./header";
import { databases, account, ID, Config } from "../backend/appwrite";
import { 
  Loader2, Wallet, History, BadgeCheck, 
  User as UserIcon, Fingerprint,
  GraduationCap, BookOpen, ShieldCheck, LayoutDashboard,
  ChevronRight, CheckCircle2, X, Send
} from "lucide-react";

export default function ClassistDashboard() {
  const { handleSubmit, reset } = useForm();
  const [activeTab, setActiveTab] = useState("dashboard"); 
  const [darkMode, setDarkMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  
  const [courses, setCourses] = useState([]);
  const [studentProfile, setStudentProfile] = useState(null);
  const [classDetails, setClassDetails] = useState(null);
  const [history, setHistory] = useState([]);
  const [adminAccountDetails, setAdminAccountDetails] = useState(null);

  const fetchHistory = useCallback(async (userId) => {
    try {
      const response = await databases.listDocuments(Config.dbId, Config.submissionsCol, [
        Query.equal("userId", userId),
        Query.orderDesc("$createdAt")
      ]);
      setHistory(response.documents);
    } catch (error) { console.error("History Fetch Error:", error); }
  }, []);

  const fetchAdminDetails = useCallback(async () => {
    try {
      const response = await databases.listDocuments(Config.dbId, Config.profilesCol, [
        Query.isNotNull("accountNumber"),
        Query.limit(1)
      ]);
      if (response.documents.length > 0) setAdminAccountDetails(response.documents[0]);
    } catch (error) { console.error("Admin Fetch Error:", error); }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        setLoading(true);
        const user = await account.get();
        const profileRes = await databases.listDocuments(Config.dbId, Config.profilesCol, [
          Query.equal("email", user.email)
        ]);

        if (profileRes.documents.length > 0 && isMounted) {
          const profile = profileRes.documents[0];
          setStudentProfile(profile);
          if (profile.classCode) {
            const [classRes, courseRes] = await Promise.all([
              databases.listDocuments(Config.dbId, Config.classDataCol, [Query.equal("schoolId", profile.classCode)]),
              databases.listDocuments(Config.dbId, Config.coursesCol, [Query.equal("classCode", profile.classCode)])
            ]);
            if (classRes.documents.length > 0) setClassDetails(classRes.documents[0]);
            setCourses(courseRes.documents);
          }
        }
        if (isMounted) await Promise.all([fetchHistory(user.$id), fetchAdminDetails()]);
      } catch (error) { console.error("Init Error:", error); } finally { if (isMounted) setLoading(false); }
    };
    init();
    return () => { isMounted = false; };
  }, [fetchHistory, fetchAdminDetails]);

  const handlePaymentSubmit = async () => {
    setLoading(true);
    try {
      const user = await account.get();

      await databases.createDocument(Config.dbId, Config.submissionsCol, ID.unique(), {
        name: studentProfile.fullName,
        matric: studentProfile.matricNo,
        code: selectedCourse.coursecode,
        type: "transfer_alert",
        userId: user.$id,
        classCode: studentProfile?.classCode, 
        status: "pending"
      });

      Swal.fire({ 
        title: 'Payment Notified', 
        text: 'Admin will verify your transfer shortly.', 
        icon: 'success', 
        background: darkMode ? '#1e293b' : '#fff',
        color: darkMode ? '#fff' : '#000'
      });
      
      setSelectedCourse(null);
      reset();
      fetchHistory(user.$id);
    } catch (e) { 
      Swal.fire('Error', e.message, 'error'); 
    } finally { 
      setLoading(false); 
    }
  };

  const renderDashboard = () => {
    const paidCount = history.filter(h => h.status === 'verified').length;
    const totalCourses = courses.length || 0;
    const percentage = totalCourses > 0 ? (paidCount / totalCourses) * 100 : 0;
    const isFullyPaid = totalCourses > 0 && paidCount >= totalCourses;
    const pendingCount = Math.max(0, totalCourses - paidCount);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-700 font-sans">
        <div className={`p-8 rounded-[2.5rem] border transition-all duration-500 relative overflow-hidden ${
          darkMode ? 'bg-slate-800/40 border-slate-700 shadow-2xl' : 'bg-white border-slate-100 shadow-xl'
        }`}>
          <div className="relative z-10 flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-500 mb-4">Transaction Overview</p>
              <div className="flex gap-8">
                <div>
                  <h2 className="text-5xl font-black tracking-tighter flex items-center gap-2">
                    {paidCount}
                    <span className="text-[9px] bg-teal-500/10 text-teal-500 px-2 py-1 rounded-lg uppercase tracking-widest font-bold">Paid</span>
                  </h2>
                </div>
                <div className="border-l border-slate-500/20 pl-8">
                  <h2 className={`text-5xl font-black tracking-tighter flex items-center gap-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {pendingCount}
                    <span className="text-[9px] bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg uppercase tracking-widest font-bold">Pending</span>
                  </h2>
                </div>
              </div>
            </div>
            <div className="relative w-20 h-20">
               <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-current opacity-10" strokeWidth="3.5" />
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-teal-500 transition-all duration-1000" strokeWidth="3.5" strokeDasharray={`${percentage}, 100`} strokeLinecap="round" />
               </svg>
               <div className="absolute inset-0 flex items-center justify-center">
                  {isFullyPaid ? <BadgeCheck className="text-teal-400" size={20} /> : <span className="text-[10px] font-black opacity-40">{Math.round(percentage)}%</span>}
               </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setActiveTab('payment')} className={`group p-6 rounded-[2.5rem] text-left border transition-all hover:scale-[1.02] ${darkMode ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-100 shadow-md'}`}>
            <div className="w-12 h-12 bg-teal-500/10 text-teal-500 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-teal-500 group-hover:text-white transition-all"><Wallet size={24} /></div>
            <p className="font-black text-sm tracking-tight mb-1">Payments</p>
            <p className="text-[9px] font-bold uppercase opacity-40 tracking-widest">Settle Fees</p>
          </button>
          <button onClick={() => setActiveTab('history')} className={`group p-6 rounded-[2.5rem] text-left border transition-all hover:scale-[1.02] ${darkMode ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-100 shadow-md'}`}>
            <div className="w-12 h-12 bg-teal-500/10 text-teal-500 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-teal-500 group-hover:text-white transition-all"><History size={24} /></div>
            <p className="font-black text-sm tracking-tight mb-1">Activity Logs</p>
            <p className="text-[9px] font-bold uppercase opacity-40 tracking-widest">View History</p>
          </button>
        </div>
      </div>
    );
  };

  const renderPayment = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-10 duration-700">
      <div className={`p-6 rounded-[2rem] border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white shadow-xl shadow-slate-100'}`}>
        <h3 className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-6">Course Ledger</h3>
        <div className="space-y-3">
          {courses.map((course) => {
            const isPaid = history.some(h => h.code === course.coursecode && h.status === 'verified');
            const isPending = history.some(h => h.code === course.coursecode && h.status === 'pending');
            return (
              <div key={course.$id} className={`flex items-center justify-between p-4 rounded-2xl ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPaid ? 'bg-teal-500/10 text-teal-500' : 'bg-slate-500/10 text-slate-400'}`}><BookOpen size={18} /></div>
                  <div>
                    <p className="font-bold text-sm leading-tight">{course.coursecode}</p>
                    <p className="text-[10px] opacity-40 uppercase font-bold">{course.coursetitle?.substring(0, 20)}...</p>
                  </div>
                </div>
                {isPaid ? (
                  <div className="flex items-center gap-1 text-teal-500 font-black text-[9px] bg-teal-500/10 px-3 py-1.5 rounded-full"><CheckCircle2 size={12} /> PAID</div>
                ) : isPending ? (
                  <div className="text-amber-500 font-black text-[9px] bg-amber-500/10 px-3 py-1.5 rounded-full">PENDING VERIFICATION</div>
                ) : (
                  <button onClick={() => setSelectedCourse(course)} className="text-white font-black text-[9px] bg-teal-600 px-4 py-2 rounded-full hover:bg-teal-500 transition-all flex items-center gap-1">
                    INITIATE <ChevronRight size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen font-sans transition-colors duration-500 ${darkMode ? 'bg-[#0c1324] text-slate-100' : 'bg-[#f8fafc] text-slate-900'} pb-32`}>
      <Header />
      <main className="max-w-xl mx-auto px-6 mt-12">
        <div className="mb-10">
          <h2 className="text-5xl font-black tracking-tighter capitalize">{activeTab}</h2>
          <p className="text-xs font-bold opacity-30 uppercase tracking-[0.3em] mt-1">Portal Management System</p>
        </div>

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'payment' && renderPayment()}
        {activeTab === 'history' && (
          <div className="space-y-3 animate-in fade-in slide-in-from-right-10 duration-500">
            {history.map(item => (
              <div key={item.$id} className={`p-5 rounded-3xl border flex justify-between items-center ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-100'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${item.status === 'verified' ? 'bg-teal-500/10 text-teal-500' : 'bg-amber-500/10 text-amber-500'}`}><Fingerprint size={20}/></div>
                  <div>
                    <p className="font-black text-sm">{item.code}</p>
                    <p className="text-[10px] opacity-40 font-bold uppercase">{item.type.replace('_', ' ')} • {new Date(item.$createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`text-[9px] font-black px-3 py-1 rounded-full ${item.status === 'verified' ? 'bg-teal-500 text-white' : 'bg-amber-500 text-white'}`}>{item.status.toUpperCase()}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in zoom-in-95 duration-700">
            <div className={`relative p-8 rounded-[3rem] text-center ${darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-100 shadow-xl'}`}>
              <div className="w-32 h-32 mx-auto mb-6 rounded-[2.5rem] overflow-hidden border-2 border-teal-500/20">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${studentProfile?.fullName}`} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <h3 className="text-3xl font-black tracking-tighter uppercase">{studentProfile?.fullName}</h3>
              <div className="inline-block mt-2 px-4 py-1 rounded-full bg-teal-500/10 text-teal-500 text-[10px] font-bold tracking-widest">{studentProfile?.matricNo}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div className={`col-span-2 p-6 rounded-[2rem] border ${darkMode ? 'bg-slate-800/30 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <p className="text-[9px] font-black opacity-30 uppercase tracking-widest">Institution</p>
                  <p className="text-lg font-bold">{classDetails?.school || 'University'}</p>
               </div>
               <div className={`p-6 rounded-[2rem] border ${darkMode ? 'bg-slate-800/30 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <p className="text-[9px] font-black opacity-30 uppercase tracking-widest">Level</p>
                  <p className="text-xl font-bold">{classDetails?.level || '---'}</p>
               </div>
               <div className={`p-6 rounded-[2rem] border ${darkMode ? 'bg-teal-500/5 border-teal-500/20' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-[9px] font-black opacity-30 uppercase tracking-widest">Class Code</p>
                  <p className="text-xl font-bold text-teal-500">{studentProfile?.classCode}</p>
               </div>
            </div>
          </div>
        )}
      </main>

      <nav className={`fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md p-2 rounded-[2.5rem] border flex justify-between items-center shadow-2xl z-50 ${darkMode ? 'bg-slate-900/80 border-slate-700 backdrop-blur-xl' : 'bg-white/90 border-slate-200 backdrop-blur-xl'}`}>
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
          { id: 'payment', icon: Wallet, label: 'Pay' },
          { id: 'history', icon: History, label: 'Logs' },
          { id: 'profile', icon: UserIcon, label: 'Me' }
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex flex-col items-center py-3 rounded-[2rem] transition-all ${activeTab === tab.id ? 'bg-teal-600 text-white shadow-lg -translate-y-1' : 'text-slate-500'}`}>
            <tab.icon size={20} />
            <span className="text-[8px] font-black uppercase mt-1 tracking-widest">{tab.label}</span>
          </button>
        ))}
      </nav>

      {selectedCourse && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className={`w-full max-w-md rounded-[2.5rem] overflow-hidden border ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="p-6 bg-teal-600 text-white flex justify-between items-center">
                    <h3 className="font-black uppercase">Transfer Portal: {selectedCourse.coursecode}</h3>
                    <button onClick={() => setSelectedCourse(null)}><X size={24}/></button>
                </div>
                <div className="p-8 space-y-6">
                    <div className={`p-6 rounded-2xl border-2 border-dashed ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <p className="text-[10px] font-black opacity-50 uppercase mb-2 text-center">Transfer Fee To</p>
                        <p className="text-2xl font-black text-center tracking-tighter text-teal-500">{adminAccountDetails?.accountNumber || '0000000000'}</p>
                        <p className="text-[10px] text-center opacity-40 font-bold uppercase mt-1">{adminAccountDetails?.bankName || 'Loading Bank...'}</p>
                    </div>
                    <div className="space-y-4">
                        <p className="text-[10px] text-center opacity-50 font-bold">By clicking confirm, you notify the system that a transfer has been made.</p>
                        <button onClick={handlePaymentSubmit} disabled={loading} className="w-full py-5 bg-teal-600 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="animate-spin"/> : <><Send size={18}/> CONFIRM TRANSFER</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}