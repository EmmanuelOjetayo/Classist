import { useState, useEffect, useCallback} from "react";
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
  const [serialNumber, setSerialNumber] = useState(null);
  const [adminAccountDetails, setAdminAccountDetails] = useState(null);
  const [showAdminDetails, setShowAdminDetails] = useState(false);


  // --- FETCH DATA LOGIC ---
// 1. Wrap fetchHistory in useCallback so it's stable
const fetchHistory = useCallback(async () => {
  try {
    const user = await account.get();
    const response = await databases.listDocuments(
      Config.dbId,
      Config.submissionsCol,
      [Query.equal("userId", user.$id), Query.orderDesc("$createdAt")]
    );
    setHistory(response.documents);

    const verifiedRes = await databases.listDocuments(
      Config.dbId,
      Config.submissionsCol,
      [
        Query.equal("userId", user.$id),
        Query.equal("status", "verified"),
        Query.equal("type", "receipt"),
        Query.orderDesc("serialNumber"),
        Query.limit(1)
      ]
    );

    if (verifiedRes.documents.length > 0) {
      setSerialNumber(verifiedRes.documents[0].serialNumber || "Pending assignment");
    } else {
      setSerialNumber(null);
    }
  } catch (error) {
    console.error("History fetch error:", error);
  }
}, []); // Empty array means this function is created once

// 2. Update the useEffect
useEffect(() => {
  const fetchStudentDataAndCourses = async () => {
    try {
      setLoading(true);
      const user = await account.get();
      
      // These don't trigger infinite loops if the dependency array is []
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
      
      await fetchHistory();
    } catch (error) {
      console.error("Error fetching context:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchStudentDataAndCourses();
  // REMOVE setValue from here to stop the loop
}, [fetchHistory, setValue]);

  const fetchAdminAccountDetails = async () => {
    try {
      // Fetch all profiles and filter those with accountNumber
      const response = await databases.listDocuments(
        Config.dbId,
        Config.profilesCol
      );
      const adminsWithDetails = response.documents.filter(profile => profile.accountNumber && profile.accountNumber.trim() !== '');
      if (adminsWithDetails.length > 0) {
        // For now, take the first one; in future, filter by faculty/school if needed
        setAdminAccountDetails(adminsWithDetails[0]);
      }
    } catch (error) {
      console.error("Error fetching admin account details:", error);
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
        // Fetch admin account details
        await fetchAdminAccountDetails();
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

      // Upload file for both receipt and assignment
      if (data.file?.[0]) {
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
          level: studentProfile?.level || "N/A",
          serialNumber: null,
          status: "pending"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 font-sans">
      <Header />

      <div className="relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse delay-700"></div>
        </div>

        <div className="relative bg-gradient-to-r from-teal-700 via-teal-600 to-teal-700 px-6 py-16 text-white shadow-2xl">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-5xl font-black tracking-tight mb-2">Student Hub</h1>
              <p className="text-teal-100 text-lg">Manage your academic submissions and payments effortlessly.</p>
            </div>
            <div className="flex gap-4">
              <button className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white font-bold hover:bg-white/30 transition-all rounded-xl border border-white/30 text-sm">
                📚 Need Help?
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        {serialNumber && (
          <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white p-8 rounded-3xl shadow-2xl mb-12 border border-emerald-300/30 backdrop-blur-sm animate-in slide-in-from-top duration-500">
            <div className="flex items-center justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black mb-2">🎉 Payment Verified!</h2>
                <p className="text-emerald-100">Your receipt has been approved by the admin.</p>
              </div>
              <div className="text-right bg-white/15 backdrop-blur-sm px-6 py-4 rounded-2xl border border-white/20">
                <div className="text-5xl font-black text-amber-300">{serialNumber}</div>
                <div className="text-sm text-emerald-100 mt-1">Serial Number</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">

          <div className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-teal-200">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-300 shadow-lg">
                <Upload size={32} />
              </div>
              <h5 className="text-2xl font-bold text-gray-900 mb-2">Manual Payment</h5>
              <p className="text-gray-600 text-sm leading-relaxed mb-8">Upload your bank transfer receipt for verification by the class rep.</p>
              <button
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white py-3.5 rounded-xl font-bold hover:shadow-lg hover:-translate-y-1 transition-all active:scale-95"
                onClick={() => setOpenUpload(true)}
              >
                Upload Receipt →
              </button>
            </div>
          </div>

          <div className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-teal-200">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-100 to-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-300 shadow-lg">
                <BookCheck size={32} />
              </div>
              <h5 className="text-2xl font-bold text-gray-900 mb-2">Submit Assignment</h5>
              <p className="text-gray-600 text-sm leading-relaxed mb-8">Log your assignment submission details to ensure your records are up to date.</p>
              <button
                className="w-full bg-gradient-to-r from-teal-600 to-teal-700 text-white py-3.5 rounded-xl font-bold hover:shadow-lg hover:-translate-y-1 transition-all active:scale-95"
                onClick={() => setOpenAss(true)}
              >
                Submit Now →
              </button>
            </div>
          </div>

          <div className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-blue-200">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-300 shadow-lg">
                <History size={32} />
              </div>
              <h5 className="text-2xl font-bold text-gray-900 mb-2">Submission History</h5>
              <p className="text-gray-600 text-sm leading-relaxed mb-8">View all your past submissions and payment records in one place.</p>
              <button
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-xl font-bold hover:shadow-lg hover:-translate-y-1 transition-all active:scale-95"
                onClick={() => setOpenHistory(true)}
              >
                View History →
              </button>
            </div>
          </div>

          <div className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-green-200">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-300 shadow-lg">
                <BookCheck size={32} />
              </div>
              <h5 className="text-2xl font-bold text-gray-900 mb-2">Admin Account</h5>
              <p className="text-gray-600 text-sm leading-relaxed mb-8">View the admin's account details for payments.</p>
              <button
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3.5 rounded-xl font-bold hover:shadow-lg hover:-translate-y-1 transition-all active:scale-95"
                onClick={() => setShowAdminDetails(true)}
              >
                View Details →
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* --- SUBMISSION MODAL --- */}
      {(openUpload || openAss) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className={`bg-gradient-to-r ${openUpload ? 'from-amber-600 to-amber-700' : 'from-teal-600 to-teal-700'} p-8 text-white flex justify-between items-center`}>
              <h3 className="text-2xl font-bold">
                {openUpload ? "💳 Upload Payment Receipt" : "📝 Assignment Submission"}
              </h3>
              <button onClick={() => { setOpenUpload(false); setOpenAss(false); }} className="hover:bg-white/20 p-2 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit((data) => handleSubmission(data, openUpload ? "receipt" : "assignment"))}
              className="p-8 space-y-6"
            >
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Select Course *</label>
                <select
                  {...register("course", { required: true })}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none bg-white transition-all font-medium text-gray-700"
                >
                  <option value="">-- Choose a course --</option>
                  {courses.map((c) => (
                    <option key={c.$id} value={c.coursecode}>{c.coursecode} - {c.coursetitle}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Full Name *</label>
                  <input {...register("name", { required: true })} className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none font-medium" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Matric Number *</label>
                  <input {...register("matric", { required: true })} className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none font-medium" placeholder="CSC/2020/001" />
                </div>
              </div>

              {openUpload && (
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-2xl border-2 border-dashed border-amber-300">
                  <label className="block text-sm font-bold text-amber-900 mb-3">📸 Receipt Image/PDF</label>
                  <input type="file" accept="image/*,.pdf" {...register("file", { required: true })} className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-500 file:text-white file:font-bold file:cursor-pointer hover:file:bg-amber-600" />
                  <p className="text-xs text-amber-700 mt-2">Max file size: 10MB</p>
                </div>
              )}

              {openAss && (
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-6 rounded-2xl border-2 border-dashed border-teal-300">
                  <label className="block text-sm font-bold text-teal-900 mb-3">📄 Assignment Document/Image</label>
                  <input type="file" accept="image/*,.pdf,.doc,.docx" {...register("file", { required: true })} className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-teal-600 file:text-white file:font-bold file:cursor-pointer hover:file:bg-teal-700" />
                  <p className="text-xs text-teal-700 mt-2">Accepted: Images, PDF, DOC, DOCX</p>
                </div>
              )}

              <button
                disabled={loading}
                className="w-full bg-gradient-to-r from-teal-600 to-teal-700 text-white py-4 rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-lg"
              >
                {loading ? <Loader2 className="animate-spin" /> : <span>✓ Confirm & Submit</span>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- HISTORY MODAL --- */}
      {openHistory && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xl z-[101] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="p-8 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex justify-between items-center">
              <h3 className="text-2xl font-bold flex items-center gap-3"><History size={28} /> My Submissions</h3>
              <button onClick={() => setOpenHistory(false)} className="hover:bg-white/20 p-2 rounded-xl transition-colors"><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {history.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <History size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-lg">No submissions found.</p>
                </div>
              ) : (
                history.map((item, idx) => (
                  <div key={item.$id} className="group bg-gradient-to-r from-slate-50 to-white p-6 rounded-2xl border border-slate-200 hover:border-blue-300 flex justify-between items-center hover:shadow-lg transition-all hover:bg-blue-50/30 animate-in fade-in slide-in-from-left duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-xs font-bold uppercase px-3 py-1.5 rounded-lg transition-transform group-hover:scale-105 ${item.type === 'receipt' ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'}`}>
                          {item.type === 'receipt' ? '💳 Receipt' : '📝 Assignment'}
                        </span>
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${item.status === 'verified' ? 'bg-green-100 text-green-700' : item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                          {item.status === 'verified' ? '✓ Verified' : item.status === 'pending' ? '⏳ Pending' : '✗ Rejected'}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-lg">{item.code}</h4>
                      <p className="text-sm text-slate-600 mt-1">👤 {item.name} • 📅 {new Date(item.$createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    </div>
                    {item.fileId && (
                      <a href={storage.getFileDownload(Config.bucketId, item.fileId)} className="ml-4 p-3 bg-white hover:bg-blue-100 text-blue-600 rounded-xl shadow-md border border-slate-300 transition-all hover:shadow-lg group-hover:scale-110" download>
                        <Upload size={20} />
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- ADMIN ACCOUNT DETAILS MODAL --- */}
      {showAdminDetails && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xl z-[101] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-8 text-white flex justify-between items-center">
              <h3 className="text-2xl font-bold flex items-center gap-2">🏦 Payment Details</h3>
              <button onClick={() => setShowAdminDetails(false)} className="hover:bg-white/20 p-2 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-8">
              {adminAccountDetails ? (
                <div className="space-y-5">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-2xl border border-green-200">
                    <label className="block text-xs font-bold text-green-700 uppercase tracking-wide mb-2">🏥 Bank Name</label>
                    <p className="text-gray-900 font-bold text-lg">{adminAccountDetails.bankName || 'N/A'}</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-2xl border border-blue-200">
                    <label className="block text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">👤 Account Name</label>
                    <p className="text-gray-900 font-bold text-lg">{adminAccountDetails.accountName || 'N/A'}</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-2xl border border-amber-200">
                    <label className="block text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">🔢 Account Number</label>
                    <p className="text-gray-900 font-bold text-lg font-mono tracking-wider">{adminAccountDetails.accountNumber || 'N/A'}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl border-l-4 border-blue-500 text-sm text-blue-800">
                    <p className="font-semibold">💡 Tip:</p>
                    <p>Copy the account details above before making your transfer.</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4">🔍</div>
                  <p className="text-lg text-slate-500">No payment details available yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
