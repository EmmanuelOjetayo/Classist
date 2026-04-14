import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import Swal from 'sweetalert2';
import { Query } from 'appwrite';
import Header from "./header";
import { databases, storage, account, ID, Config } from "../backend/appwrite";
import { 
  Loader2, Wallet, History, BadgeCheck, 
  User as UserIcon, Bell, Fingerprint,
  GraduationCap, BookOpen, ShieldCheck, LayoutDashboard,
  Moon, Sun, ChevronRight, CheckCircle2, X, Upload
} from "lucide-react";

export default function ClassistDashboard() {
  const { register, handleSubmit, reset, setValue } = useForm();
  const [activeTab, setActiveTab] = useState("dashboard"); 
  const [darkMode, setDarkMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  
  // Data States
  const [courses, setCourses] = useState([]);
  const [studentProfile, setStudentProfile] = useState(null);
  const [classDetails, setClassDetails] = useState(null);
  const [history, setHistory] = useState([]);
  const [adminAccountDetails, setAdminAccountDetails] = useState(null);

  // --- LOGIC ---
  const fetchHistory = useCallback(async (userId) => {
    try {
      const response = await databases.listDocuments(Config.dbId, Config.submissionsCol, [
        Query.equal("userId", userId),
        Query.orderDesc("$createdAt")
      ]);
      setHistory(response.documents);
    } catch (error) { console.error(error); }
  }, []);

  const fetchAdminDetails = useCallback(async () => {
    try {
      const response = await databases.listDocuments(Config.dbId, Config.profilesCol);
      const admin = response.documents.find(p => p.accountNumber?.trim());
      if (admin) setAdminAccountDetails(admin);
    } catch (error) { console.error(error); }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const user = await account.get();
        const profileRes = await databases.listDocuments(Config.dbId, Config.profilesCol, [Query.equal("email", user.email)]);

        if (profileRes.documents.length > 0) {
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
        await Promise.all([fetchHistory(user.$id), fetchAdminDetails()]);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    init();
  }, [fetchHistory, fetchAdminDetails]);

  const handlePaymentSubmit = async (data) => {
    setLoading(true);
    try {
      const file = data.file[0];
      const up = await storage.createFile(Config.bucketId, ID.unique(), file);
      const user = await account.get();

      await databases.createDocument(Config.dbId, Config.submissionsCol, ID.unique(), {
        name: studentProfile.fullName,
        matric: studentProfile.matricNo,
        code: selectedCourse.coursecode,
        type: "receipt",
        fileId: up.$id,
        userId: user.$id,
        classCode: studentProfile?.classCode, 
        status: "pending"
      });

      Swal.fire({ title: 'Submitted', text: 'Verification pending.', icon: 'success', background: darkMode ? '#1e293b' : '#fff' });
      setSelectedCourse(null);
      reset();
      fetchHistory(user.$id);
    } catch (e) { Swal.fire('Error', e.message, 'error'); } finally { setLoading(false); }
  };

  // --- UI RENDERERS ---
const renderDashboard = () => {
    const paidCount = history.filter(h => h.status === 'verified' && h.type === 'receipt').length;
    const totalCourses = courses.length || 0;
    
    // Calculate percentage: if no courses exist, default to 0 to avoid NaN
    const percentage = totalCourses > 0 ? (paidCount / totalCourses) * 100 : 0;
    const isFullyPaid = totalCourses > 0 && paidCount >= totalCourses;
    const pendingCount = Math.max(0, totalCourses - paidCount);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-700 ease-out font-sans">
        
        {/* Paid vs Pending Bento Card */}
        <div className={`p-8 rounded-[2.5rem] transition-all duration-500 relative overflow-hidden border ${
          darkMode 
            ? 'bg-slate-800/40 border-slate-700 shadow-2xl shadow-black/20' 
            : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50'
        }`}>
          <div className="relative z-10 flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-500 mb-4">
                Transaction Overview
              </p>
              <div className="flex gap-8">
                {/* PAID COLUMN */}
                <div>
                  <h2 className="text-5xl font-black tracking-tighter flex items-center gap-2">
                    {paidCount}
                    <span className="text-[9px] bg-teal-500/10 text-teal-500 px-2 py-1 rounded-lg uppercase tracking-widest font-bold">Paid</span>
                  </h2>
                </div>

                {/* PENDING COLUMN */}
                <div className="border-l border-slate-500/20 pl-8">
                  <h2 className={`text-5xl font-black tracking-tighter flex items-center gap-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {pendingCount}
                    <span className="text-[9px] bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg uppercase tracking-widest font-bold">Pending</span>
                  </h2>
                </div>
              </div>
            </div>
            
            {/* The Pie Chart (Progress Circle) */}
            <div className="relative w-20 h-20 flex items-center justify-center">
               <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  {/* Background Track */}
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-current opacity-10" strokeWidth="3.5" />
                  
                  {/* Progress Stroke */}
                  <circle 
                    cx="18" cy="18" r="16" fill="none" 
                    className={`${isFullyPaid ? 'stroke-teal-400' : 'stroke-teal-500'} transition-all duration-1000 ease-in-out`} 
                    strokeWidth="3.5" 
                    strokeDasharray={`${percentage}, 100`} 
                    strokeLinecap={isFullyPaid ? "butt" : "round"} // Butt makes it a perfect closed ring at 100%
                  />
               </svg>
               {/* Center Icon toggle */}
               <div className="absolute inset-0 flex items-center justify-center">
                  {isFullyPaid ? (
                    <BadgeCheck className="text-teal-400 animate-bounce" size={20} />
                  ) : (
                    <span className="text-[10px] font-black opacity-40">{Math.round(percentage)}%</span>
                  )}
               </div>
            </div>
          </div>
          
          <LayoutDashboard className={`absolute -right-4 -bottom-4 w-32 h-32 opacity-[0.03] ${darkMode ? 'text-white' : 'text-slate-900'}`} />
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setActiveTab('payment')} 
            className={`group p-6 rounded-[2.5rem] text-left border transition-all hover:scale-[1.02] active:scale-95 duration-300 ${
              darkMode 
                ? 'bg-slate-800/30 border-slate-700 hover:border-teal-500/50' 
                : 'bg-white border-slate-100 shadow-md'
            }`}
          >
            <div className="w-12 h-12 bg-teal-500/10 text-teal-500 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-teal-500 group-hover:text-white transition-all duration-500">
              <Wallet size={24} />
            </div>
            <p className="font-black text-sm tracking-tight mb-1">Payments</p>
            <p className="text-[9px] font-bold uppercase opacity-40 tracking-widest">Settle Fees</p>
          </button>

          <button 
            onClick={() => setActiveTab('history')} 
            className={`group p-6 rounded-[2.5rem] text-left border transition-all hover:scale-[1.02] active:scale-95 duration-300 ${
              darkMode 
                ? 'bg-slate-800/30 border-slate-700 hover:border-teal-500/50' 
                : 'bg-white border-slate-100 shadow-md'
            }`}
          >
            <div className="w-12 h-12 bg-teal-500/10 text-teal-500 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-teal-500 group-hover:text-white transition-all duration-500">
              <History size={24} />
            </div>
            <p className="font-black text-sm tracking-tight mb-1">Activity Logs</p>
            <p className="text-[9px] font-bold uppercase opacity-40 tracking-widest">View History</p>
          </button>
        </div>

        {/* Status Badge */}
        <div className={`p-4 rounded-[2rem] border flex items-center gap-3 transition-all duration-500 ${
          isFullyPaid 
            ? (darkMode ? 'bg-teal-500/10 border-teal-500/40 shadow-[0_0_20px_rgba(79,219,200,0.1)]' : 'bg-teal-50 border-teal-200') 
            : (darkMode ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-100')
        }`}>
          <div className={`w-2 h-2 rounded-full ${isFullyPaid ? 'bg-teal-500 animate-pulse' : 'bg-slate-500'}`}></div>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isFullyPaid ? 'text-teal-500' : 'opacity-40'}`}>
            {isFullyPaid ? 'System Synchronized: 100%' : 'Required Actions Pending'}
          </p>
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
              <div key={course.$id} className={`flex items-center justify-between p-4 rounded-2xl transition-all ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPaid ? 'bg-teal-500/10 text-teal-500' : 'bg-slate-500/10 text-slate-400'}`}>
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-sm leading-tight">{course.coursecode}</p>
                    <p className="text-[10px] opacity-40 uppercase font-bold">{course.coursetitle?.substring(0, 20)}...</p>
                  </div>
                </div>

                {isPaid ? (
                  <div className="flex items-center gap-1 text-teal-500 font-black text-[9px] bg-teal-500/10 px-3 py-1.5 rounded-full">
                    <CheckCircle2 size={12} /> PAID
                  </div>
                ) : isPending ? (
                    <div className="text-amber-500 font-black text-[9px] bg-amber-500/10 px-3 py-1.5 rounded-full">PENDING</div>
                ) : (
                  <button onClick={() => setSelectedCourse(course)} className="flex items-center gap-1 text-white font-black text-[9px] bg-teal-600 px-4 py-2 rounded-full hover:bg-teal-500 active:scale-95 transition-all">
                    PAY NOW <ChevronRight size={12} />
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
      {/* Header */}
<Header/>
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
                   <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${item.status === 'verified' ? 'bg-teal-500/10 text-teal-500' : 'bg-amber-500/10 text-amber-500'}`}>
                     <Fingerprint size={20}/>
                   </div>
                   <div>
                     <p className="font-black text-sm">{item.code}</p>
                     <p className="text-[10px] opacity-40 font-bold uppercase">{item.type} • {new Date(item.$createdAt).toLocaleDateString()}</p>
                   </div>
                 </div>
                 <span className={`text-[9px] font-black px-3 py-1 rounded-full ${item.status === 'verified' ? 'bg-teal-500 text-white' : 'bg-amber-500 text-white'}`}>
                   {item.status.toUpperCase()}
                 </span>
               </div>
             ))}
           </div>
        )}
{activeTab === 'profile' && (
  <div className="space-y-6 animate-in fade-in zoom-in-95 duration-700 ease-out font-sans pb-28">
    
    {/* Identity Header - The Curator's Badge */}
    <div className={`relative p-8 rounded-[3rem] overflow-hidden transition-all duration-500 ${
      darkMode ? 'bg-[#0c1324] border border-slate-800 shadow-2xl' : 'bg-white border border-slate-100 shadow-xl'
    }`}>
      {/* Structural Accent - Top Corner */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-bl-[5rem] -mr-8 -mt-8 rotate-12"></div>
      
      <div className="relative z-10 flex flex-col items-center">
        {/* Professional 3D Avatar (Gender-Aware) */}
        <div className="relative mb-6">
          <div className={`w-32 h-32 rounded-[2.5rem] p-1 border-2 ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'
          }`}>
            <img 
          src={`https://wsrv.nl/?url=https://api.dicebear.com/7.x/avataaars/svg?seed=${studentProfile?.gender === 'Male' ? 'Felix' : 'Aneka'}&top=${studentProfile?.gender === 'Male' ? 'shortHair' : 'longHair'}&mouth=smile&eyebrows=default`} 
              alt="Identity"
              className="w-full h-full object-cover rounded-[2.2rem]"
            />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-teal-500 text-[#0c1324] p-2.5 rounded-2xl shadow-[0_0_20px_rgba(79,219,200,0.5)]">
            <ShieldCheck size={18} strokeWidth={3} />
          </div>
        </div>

        <h3 className="text-4xl font-black tracking-tighter mb-2 text-center leading-none uppercase">
          {studentProfile?.fullName}
        </h3>
        
        <div className={`px-5 py-1.5 rounded-full border font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.3em] uppercase ${
          darkMode ? 'bg-slate-900/50 border-slate-800 text-teal-400' : 'bg-teal-50 border-teal-100 text-teal-600'
        }`}>
          {studentProfile?.matricNo || 'MATRIC PENDING'}
        </div>
      </div>
    </div>

    {/* Academic Bento Grid */}
    <div className="grid grid-cols-2 gap-4">
      
      {/* Faculty - Large Top Card */}
      <div className={`col-span-2 p-6 rounded-[2.5rem] flex items-center gap-5 ${
        darkMode ? 'bg-slate-800/30 border border-slate-800' : 'bg-white border border-slate-100'
      }`}>
        <div className="w-14 h-14 bg-teal-500/10 text-teal-500 rounded-3xl flex items-center justify-center">
          <ShieldCheck size={28} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1 text-teal-500">University Faculty</p>
          <p className="text-lg font-bold tracking-tight leading-tight">{classDetails?.faculty || 'Not Assigned'}</p>
        </div>
      </div>

      {/* Department - Large Middle Card */}
      <div className={`col-span-2 p-6 rounded-[2.5rem] flex items-center gap-5 ${
        darkMode ? 'bg-slate-800/30 border border-slate-800' : 'bg-white border border-slate-100 shadow-sm'
      }`}>
        <div className="w-14 h-14 bg-slate-500/10 text-slate-400 rounded-3xl flex items-center justify-center">
          <BookOpen size={28} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1">Academic Department</p>
          <p className="text-lg font-bold tracking-tight leading-tight">{classDetails?.department || 'General Studies'}</p>
        </div>
      </div>

      {/* Level - Small Card */}
      <div className={`p-6 rounded-[2.5rem] border ${
        darkMode ? 'bg-slate-800/20 border-slate-800' : 'bg-white border-slate-100'
      }`}>
        <LayoutDashboard className="text-teal-500 mb-4" size={24} />
        <p className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-1">Standing</p>
        <p className="text-xl font-['Space_Grotesk'] font-bold tracking-tighter">{classDetails?.level || '000'} LEVEL</p>
      </div>

      {/* Class Identifier - Small Highlight Card */}
      <div className={`p-6 rounded-[2.5rem] border ${
        darkMode ? 'bg-teal-500/5 border-teal-500/20 shadow-[inset_0_0_20px_rgba(79,219,200,0.05)]' : 'bg-slate-50 border-slate-200'
      }`}>
        <Fingerprint className="text-teal-500 mb-4" size={24} />
        <p className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-1">Class Code</p>
        <p className="text-xl font-['Space_Grotesk'] font-bold text-teal-500 tracking-tighter">
          {studentProfile?.classCode || '---'}
        </p>
      </div>

      {/* Institution - Full Width Bottom */}
      <div className={`col-span-2 p-6 rounded-[2.5rem] border flex items-center justify-between ${
        darkMode ? 'bg-[#0c1324] border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-4">
          <GraduationCap size={20} className="text-teal-500" />
          <p className="text-xs font-bold opacity-60 uppercase tracking-widest">
            {classDetails?.school || 'University Campus'}
          </p>
        </div>
        <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
      </div>
    </div>

    {/* Verified Signature */}
    <div className="flex justify-center items-center gap-4 pt-4 opacity-30">
      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-500"></div>
      <p className="text-[8px] font-black uppercase tracking-[0.6em] whitespace-nowrap">
        Official Student Record • {studentProfile?.fullName}
      </p>
      <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-500"></div>
    </div>
  </div>
)}
      </main>

      {/* Bottom Nav */}
<nav className={`fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md p-2 rounded-[2.5rem] border flex justify-between items-center shadow-2xl transition-all duration-300 z-50 ${darkMode ? 'bg-slate-900/80 border-slate-700 backdrop-blur-xl' : 'bg-white/90 border-slate-200 backdrop-blur-xl'}`}>
  {[
    { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
    { id: 'payment', icon: Wallet, label: 'Pay' },
    { id: 'history', icon: History, label: 'Logs' },
    { id: 'profile', icon: UserIcon, label: 'Me' }
  ].map((tab) => (
    <button 
      key={tab.id} 
      onClick={() => setActiveTab(tab.id)} 
      className={`
        flex-1 flex flex-col items-center justify-center 
        py-3 mx-1 rounded-[2rem] 
        transition-all duration-500 ease-spring
        ${activeTab === tab.id 
          ? 'bg-teal-600 text-white shadow-[0_0_20px_rgba(79,219,200,0.4)] translate-y-[-6px]' 
          : 'text-slate-500 hover:bg-teal-500/10 hover:text-teal-500'
        }
      `}
    >
      <tab.icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
      <span className="text-[8px] font-black uppercase mt-1 tracking-widest">
        {tab.label}
      </span>
    </button>
  ))}
</nav>

      {/* Payment Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className={`w-full max-w-md rounded-[2.5rem] overflow-hidden border ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="p-6 bg-teal-600 text-white flex justify-between items-center">
                    <h3 className="font-black">PAYMENT: {selectedCourse.coursecode}</h3>
                    <button onClick={() => setSelectedCourse(null)}><X size={24}/></button>
                </div>
                <div className="p-8 space-y-6">
                    <div className={`p-4 rounded-2xl border-2 border-dashed ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <p className="text-[10px] font-black opacity-50 uppercase mb-2 text-center">Transfer To</p>
                        <p className="text-xl font-black text-center tracking-tighter text-teal-500">{adminAccountDetails?.accountNumber || '0000000000'}</p>
                        <p className="text-[10px] text-center opacity-40 font-bold uppercase mt-1">{adminAccountDetails?.bankName}</p>
                    </div>

                    <form onSubmit={handleSubmit(handlePaymentSubmit)} className="space-y-4">
                        <div className="relative group flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-teal-500/20 bg-teal-500/5 hover:bg-teal-500/10 transition-all">
                            <Upload className="text-teal-500 mb-2" />
                            <p className="text-xs font-bold opacity-50">Upload Receipt Image</p>
                            <input type="file" {...register("file", { required: true })} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                        <button disabled={loading} className="w-full py-5 bg-teal-600 text-white font-black rounded-2xl shadow-xl shadow-teal-500/20 active:scale-95 transition-all">
                            {loading ? <Loader2 className="animate-spin mx-auto"/> : "CONFIRM SUBMISSION"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
      )}

      {loading && !selectedCourse && (
        <div className="fixed inset-0 bg-[#0c1324]/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
}