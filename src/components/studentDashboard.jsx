import { useState, useEffect } from "react";
import Header from "./header";
import { useForm } from "react-hook-form";
import Swal from 'sweetalert2';
// Import Appwrite services
import { Query } from 'appwrite';
import { databases, storage, account, ID, Config } from "../backend/appwrite";
import { Loader2, Upload, BookCheck, History, X } from "lucide-react";

export default function StudentDashboard() {
  const { register, handleSubmit, reset, setValue } = useForm();
  const [openUpload, setOpenUpload] = useState(false);
  const [openAss, setOpenAss] = useState(false);
  const [openHistory, setOpenHistory] = useState(false); // Added missing state
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [studentProfile, setStudentProfile] = useState(null);
  const [history, setHistory] = useState([]);

  
  // --- FETCH DATA LOGIC ---
  const fetchHistory = async () => {
    try {
      const user = await account.get();
      const response = await databases.listDocuments(
        Config.dbId,
        Config.submissionsCol,
        [
          Query.equal("userId", user.$id),
          Query.orderDesc("$createdAt")
        ]
      );
      setHistory(response.documents);
    } catch (error) {
      console.error("History fetch error:", error);
    }
  };

  useEffect(() => {
    const fetchStudentDataAndCourses = async () => {
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

          const courseRes = await databases.listDocuments(
            Config.dbId,
            Config.coursesCol,
            [
              Query.equal("faculty", profile.faculty),
              Query.equal("department", profile.department),
              Query.equal("level", profile.level)
            ]
          );
          setCourses(courseRes.documents);
        }
        // Fetch history initially
        await fetchHistory();
      } catch (error) {
        console.error("Error fetching context:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentDataAndCourses();
  }, [setValue]);


  // --- SUBMISSION HANDLER ---
  const handleSubmission = async (data, type) => {
    setLoading(true);
    try {
      let uploadedFileId = null;

      if (type === "receipt" && data.file?.[0]) {
        const fileUpload = await storage.createFile(
          Config.bucketId,
          ID.unique(),
          data.file[0]
        );
        uploadedFileId = fileUpload.$id;
      }

      const user = await account.get();
      
      await databases.createDocument(
        Config.dbId,
        Config.submissionsCol,
        ID.unique(),
        {
          name: data.name,
          matric: data.matric,
          code: data.course,
          type: type,
          fileId: uploadedFileId,
          userId: user.$id,
          faculty: studentProfile?.faculty || "N/A",
          school: studentProfile?.school || "N/A",
          department: studentProfile?.department || "N/A",
          level: studentProfile?.level || "N/A"
        }
      );

      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: `${type === 'receipt' ? 'Receipt' : 'Assignment'} logged successfully.`,
        timer: 3000,
        showConfirmButton: false,
        customClass: { popup: 'rounded-[2rem]' }
      });

      setOpenUpload(false);
      setOpenAss(false);
      reset();
      fetchHistory(); // Refresh history list after new submission
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: error.message,
        confirmButtonColor: '#0f766e'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header />
      
      <div className="bg-teal-800 px-6 py-10 text-white shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Student Hub</h1>
            <p className="text-teal-100/80 mt-1">Manage your academic submissions and payments.</p>
          </div>
          <div className="flex gap-4">
             <button className="text-amber-400 font-bold hover:text-amber-300 transition-colors underline underline-offset-4 text-sm">
                Need Help?
             </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:border-teal-100 transition-all group">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Upload size={28} />
            </div>
            <h5 className="text-xl font-bold text-gray-800 mb-3">Manual Payment</h5>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">Upload your bank transfer receipt for verification by the class rep.</p>
            <button 
              className="w-full bg-teal-700 text-white py-3.5 rounded-xl font-bold hover:bg-teal-800 transition-all active:scale-95"
              onClick={() => setOpenUpload(true)}
            >
              Upload Receipt
            </button>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:border-teal-100 transition-all group">
            <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <BookCheck size={28} />
            </div>
            <h5 className="text-xl font-bold text-gray-800 mb-3">Submit Assignment</h5>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">Log your assignment submission details to ensure your records are up to date.</p>
            <button 
              className="w-full bg-teal-700 text-white py-3.5 rounded-xl font-bold hover:bg-teal-800 transition-all active:scale-95"
              onClick={() => setOpenAss(true)}
            >
              Submit Now
            </button>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:border-teal-100 transition-all group">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <History size={28} />
            </div>
            <h5 className="text-xl font-bold text-gray-800 mb-3">Submission History</h5>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">Track all your past receipts and assignment logs in one central place.</p>
            <button 
              onClick={() => setOpenHistory(true)}
              className="w-full border-2 border-teal-700 text-teal-700 py-3 rounded-xl font-bold hover:bg-teal-50 transition-colors"
            >
              View History
            </button>
          </div>
        </div>
      </main>

      {/* --- SUBMISSION MODAL --- */}
      {(openUpload || openAss) && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-teal-700 p-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold">
                {openUpload ? "Upload Payment Receipt" : "Assignment Submission"}
              </h3>
              <button onClick={() => { setOpenUpload(false); setOpenAss(false); }} className="hover:bg-white/20 p-2 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>

            <form 
              onSubmit={handleSubmit((data) => handleSubmission(data, openUpload ? "receipt" : "assignment"))} 
              className="p-8 space-y-5"
            >
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-black text-gray-400 mb-2 ml-1">Select Course</label>
                <select 
                  {...register("course", { required: true })} 
                  className="w-full p-3.5 border border-gray-100 rounded-2xl focus:border-teal-500 outline-none bg-gray-50 transition-all font-medium"
                >
                  <option value="">-- Choose a course --</option>
                  {courses.map((c) => (
                    <option key={c.$id} value={c.coursecode}>{c.coursecode} - {c.coursetitle}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-black text-gray-400 mb-2 ml-1">Full Name</label>
                  <input {...register("name", { required: true })} className="w-full p-3.5 border border-gray-100 rounded-2xl focus:border-teal-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-black text-gray-400 mb-2 ml-1">Matric Number</label>
                  <input {...register("matric", { required: true })} className="w-full p-3.5 border border-gray-100 rounded-2xl focus:border-teal-500 outline-none" />
                </div>
              </div>

              {openUpload && (
                <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-gray-200">
                  <label className="block text-[10px] uppercase tracking-widest font-black text-gray-400 mb-2">Receipt Image/PDF</label>
                  <input type="file" {...register("file", { required: true })} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-teal-700 file:text-white" />
                </div>
              )}

              <button 
                disabled={loading}
                className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black hover:bg-amber-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Confirm & Submit"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- HISTORY MODAL --- */}
      {openHistory && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[101] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2"><History size={24} /> My Submissions</h3>
              <button onClick={() => setOpenHistory(false)} className="hover:bg-white/20 p-2 rounded-xl"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {history.length === 0 ? (
                <div className="text-center py-10 text-slate-400">No submissions found.</div>
              ) : (
                history.map((item) => (
                  <div key={item.$id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${item.type === 'receipt' ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'}`}>
                        {item.type}
                      </span>
                      <h4 className="font-bold text-slate-800 mt-2">{item.code}</h4>
                      <p className="text-xs text-slate-500">{new Date(item.$createdAt).toLocaleDateString()}</p>
                    </div>
                    {item.fileId && (
                      <a href={storage.getFileView(Config.bucketId, item.fileId)} target="_blank" rel="noreferrer" className="p-3 bg-white text-blue-600 rounded-xl shadow-sm border border-slate-100">
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