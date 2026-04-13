import { useState, useEffect, useCallback } from "react";
import Header from "./header";
import { useForm } from "react-hook-form";
import Swal from 'sweetalert2';
import { Query } from 'appwrite';
import { databases, storage, account, ID, Config } from "../backend/appwrite";
import { Loader2, Upload, BookCheck, History, X, Landmark } from "lucide-react";

export default function StudentDashboard() {
  const { register, handleSubmit, reset, setValue } = useForm();
  const [openUpload, setOpenUpload] = useState(false);
  const [openAss, setOpenAss] = useState(false);
  const [openHistory, setOpenHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [studentProfile, setStudentProfile] = useState(null);
  const [classDetails, setClassDetails] = useState(null);
  const [history, setHistory] = useState([]);
  const [serialNumber, setSerialNumber] = useState(null);
  const [adminAccountDetails, setAdminAccountDetails] = useState(null);

  // --- FETCH HISTORY & VERIFIED SERIAL ---
  const fetchHistory = useCallback(async (userId) => {
    try {
      const response = await databases.listDocuments(
        Config.dbId,
        Config.submissionsCol,
        [Query.equal("userId", userId), Query.orderDesc("$createdAt")]
      );
      setHistory(response.documents);

      const verifiedRes = await databases.listDocuments(
        Config.dbId,
        Config.submissionsCol,
        [
          Query.equal("userId", userId),
          Query.equal("status", "verified"),
          Query.equal("type", "receipt"),
          Query.orderDesc("$createdAt"),
          Query.limit(1)
        ]
      );

      setSerialNumber(verifiedRes.documents[0]?.serialNumber || null);
    } catch (error) {
      console.error("History fetch error:", error);
    }
  }, []);

  // --- FETCH ADMIN BANK DETAILS (FOR THE MODAL) ---
  const fetchAdminAccountDetails = useCallback(async () => {
    try {
      const response = await databases.listDocuments(Config.dbId, Config.profilesCol);
      // Finds the first profile with an account number to use as the payment target
      const admin = response.documents.find(p => p.accountNumber && p.accountNumber.trim() !== '');
      if (admin) setAdminAccountDetails(admin);
    } catch (error) {
      console.error("Error fetching admin details:", error);
    }
  }, []);

  // --- INITIAL DATA LOAD ---
  useEffect(() => {
    const initDashboard = async () => {
      try {
        setLoading(true);
        const user = await account.get();
        setValue("name", user.name);
        setValue("email", user.email);

        const profileRes = await databases.listDocuments(
          Config.dbId,
          Config.profilesCol,
          [Query.equal("email", user.email)]
        );

        if (profileRes.documents.length > 0) {
          const profile = profileRes.documents[0];
          setStudentProfile(profile);
          setValue("matric", profile.matricNo);

          // Use classCode to get school/faculty details from classData collection
          if (profile.classCode) {
            const classDataRes = await databases.listDocuments(
              Config.dbId,
              Config.classDataCol, 
              [Query.equal("schoolId", profile.classCode)]
            );

            if (classDataRes.documents.length > 0) {
              setClassDetails(classDataRes.documents[0]);
            }

            // Filter courses by classCode
            const courseRes = await databases.listDocuments(
              Config.dbId,
              Config.coursesCol,
              [Query.equal("classCode", profile.classCode)]
            );
            setCourses(courseRes.documents);
          }
        }
        
        await Promise.all([fetchHistory(user.$id), fetchAdminAccountDetails()]);
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        setLoading(false);
      }
    };
    initDashboard();
  }, [fetchHistory, fetchAdminAccountDetails, setValue]);

  // --- SUBMISSION HANDLER ---
  const handleSubmission = async (data, type) => {
    setLoading(true);
    try {
      let uploadedFileId = null;
      if (data.file?.[0]) {
        const fileUpload = await storage.createFile(Config.bucketId, ID.unique(), data.file[0]);
        uploadedFileId = fileUpload.$id;
      }

      const user = await account.get();
      await databases.createDocument(Config.dbId, Config.submissionsCol, ID.unique(), {
        name: data.name,
        matric: data.matric,
        code: data.course,
        type: type,
        fileId: uploadedFileId,
        userId: user.$id,
        faculty: classDetails?.faculty || "N/A",
        school: classDetails?.school || "N/A",
        department: classDetails?.department || "N/A",
        level: classDetails?.level || "N/A",
        classCode: studentProfile?.classCode, 
        status: "pending"
      });

      Swal.fire({ 
        icon: 'success', 
        title: 'Success!', 
        text: `${type === 'receipt' ? 'Receipt' : 'Assignment'} logged successfully.`,
        timer: 2500, 
        showConfirmButton: false 
      });

      setOpenUpload(false);
      setOpenAss(false);
      reset();
      fetchHistory(user.$id);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Submission Failed', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-200">
      <Header />
      
      {/* Hero */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-800 p-10 text-white shadow-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black">Student Dashboard</h1>
            <p className="opacity-80">Class: <span className="font-mono bg-white/20 px-2 py-1 rounded text-sm">{classDetails?.level || 'Not Assigned'}</span></p>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-sm opacity-70">Current Session</p>
            <p className="font-bold">2025/2026</p>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {serialNumber && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-8 rounded-3xl mb-12 flex justify-between items-center text-white shadow-lg border border-emerald-400/30">
            <div>
              <h2 className="text-2xl font-black">Payment Verified!</h2>
              <p className="text-emerald-50">Your receipt has been approved by the admin.</p>
            </div>
            <div className="text-4xl font-black bg-white/20 px-6 py-4 rounded-2xl">{serialNumber}</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Manual Payment */}
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 group transition-all hover:scale-[1.02]">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
              <Upload size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Manual Payment</h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">View bank details and upload your transfer receipt for verification.</p>
            <button onClick={() => setOpenUpload(true)} className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-2xl font-bold transition-colors">
              Pay & Upload →
            </button>
          </div>

          {/* Card 2: Assignment */}
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 transition-all hover:scale-[1.02]">
            <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center mb-6">
              <BookCheck size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Assignment</h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">Submit your course assignments and projects directly to the portal.</p>
            <button onClick={() => setOpenAss(true)} className="w-full bg-teal-600 hover:bg-teal-700 text-white py-4 rounded-2xl font-bold transition-colors">
              Submit Now →
            </button>
          </div>

          {/* Card 3: History */}
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 transition-all hover:scale-[1.02]">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <History size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">History</h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">Keep track of all your past payments and academic submissions.</p>
            <button onClick={() => setOpenHistory(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold transition-colors">
              View History →
            </button>
          </div>
        </div>
      </main>

      {/* --- UNIFIED MODAL FOR PAYMENT & ASSIGNMENT --- */}
      {(openUpload || openAss) && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl border border-gray-200">
            <div className={`p-8 text-white flex justify-between items-center ${openUpload ? 'bg-amber-600' : 'bg-teal-600'}`}>
              <h3 className="font-black text-2xl">{openUpload ? "Manual Payment" : "Assignment Submission"}</h3>
              <button onClick={() => { setOpenUpload(false); setOpenAss(false); }} className="hover:bg-white/20 p-2 rounded-xl transition-colors"><X /></button>
            </div>

            <div className="p-8 max-h-[75vh] overflow-y-auto">
              {/* Payment Context: Only shows when Manual Payment is selected */}
              {openUpload && adminAccountDetails && (
                <div className="mb-8 p-6 bg-amber-50 rounded-2xl border border-amber-200">
                  <div className="flex items-center gap-2 mb-4 text-amber-800 font-black text-xs uppercase tracking-widest">
                    <Landmark size={18} /> Make Transfer To:
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] text-amber-600 font-bold uppercase">Bank Name</p>
                      <p className="text-slate-900 font-bold">{adminAccountDetails.bankName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-amber-600 font-bold uppercase">Account Number</p>
                      <p className="text-2xl font-black text-amber-700 font-mono tracking-tighter">{adminAccountDetails.accountNumber}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-amber-600 font-bold uppercase">Account Name</p>
                      <p className="text-slate-700 font-medium">{adminAccountDetails.accountName}</p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit((data) => handleSubmission(data, openUpload ? "receipt" : "assignment"))} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Select Course</label>
                  <select {...register("course", { required: true })} className="w-full p-4 border-2 border-gray-100 rounded-xl bg-gray-50 text-slate-800 font-bold focus:border-teal-500 outline-none">
                    <option value="">-- Choose Course --</option>
                    {courses.map(c => <option key={c.$id} value={c.coursecode}>{c.coursecode} - {c.coursetitle}</option>)}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Student Name</label>
                    <input {...register("name")} className="w-full p-4 border-2 border-gray-100 rounded-xl text-slate-800 bg-gray-100 font-medium" readOnly />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Matric No</label>
                    <input {...register("matric")} className="w-full p-4 border-2 border-gray-100 rounded-xl text-slate-800 bg-gray-100 font-medium" readOnly />
                  </div>
                </div>
                
                <div className={`p-6 rounded-2xl border-2 border-dashed ${openUpload ? 'bg-amber-50 border-amber-200' : 'bg-teal-50 border-teal-200'}`}>
                  <label className="block text-sm font-bold mb-3 text-slate-700">Attach {openUpload ? 'Receipt (Image/PDF)' : 'Assignment File'}</label>
                  <input type="file" {...register("file", { required: true })} className="text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-slate-200 file:text-slate-700 file:font-bold hover:file:bg-slate-300" />
                </div>

                <button disabled={loading} className={`w-full py-5 rounded-2xl text-white font-black text-lg shadow-lg hover:-translate-y-1 transition-all flex justify-center items-center gap-3 ${openUpload ? 'bg-amber-600 hover:bg-amber-700' : 'bg-teal-600 hover:bg-teal-700'}`}>
                  {loading ? <Loader2 className="animate-spin" /> : "Confirm & Submit Submission"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- HISTORY MODAL --- */}
      {openHistory && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[101] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
              <h3 className="font-black text-2xl flex items-center gap-3"><History /> Submission Logs</h3>
              <button onClick={() => setOpenHistory(false)} className="hover:bg-white/20 p-2 rounded-xl transition-colors"><X /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {history.length === 0 ? (
                <div className="text-center py-20 opacity-30"><p className="text-xl font-bold">No records found</p></div>
              ) : (
                history.map(item => (
                  <div key={item.$id} className="p-5 border-2 border-gray-50 rounded-2xl flex justify-between items-center hover:bg-blue-50/50 transition-colors">
                    <div>
                      <div className="flex gap-2 mb-1">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${item.type === 'receipt' ? 'bg-amber-100 text-amber-600' : 'bg-teal-100 text-teal-600'}`}>{item.type.toUpperCase()}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${item.status === 'verified' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>{item.status.toUpperCase()}</span>
                      </div>
                      <p className="font-black text-gray-800 text-lg">{item.code}</p>
                      <p className="text-xs text-gray-400 font-medium">{new Date(item.$createdAt).toLocaleDateString()}</p>
                    </div>
                    {item.fileId && (
                      <a href={storage.getFileDownload(Config.bucketId, item.fileId)} className="p-3 bg-slate-100 hover:bg-blue-100 text-blue-600 rounded-xl transition-colors shadow-sm" download>
                        <Upload size={18} />
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}