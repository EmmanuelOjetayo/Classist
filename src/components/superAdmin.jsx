import { useEffect, useState, useCallback } from "react";
import Header from "./header";
import { useForm } from "react-hook-form";
import { databases, Config, ID, account, Query } from "../backend/appwrite"; // Added Query and account
import { Menu, X, BookOpen, Users, Settings, Edit, Trash2, Plus, Loader2, Search, UserCog, ShieldCheck } from "lucide-react";
import Swal from 'sweetalert2';

// --- Custom Toast Component (Remains same) ---
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-6 right-6 px-6 py-4 rounded-2xl text-white shadow-2xl z-[150] flex items-center gap-4 animate-in slide-in-from-right-10 duration-300 ${type === 'success' ? 'bg-teal-600' : 'bg-rose-600'}`}>
      <div className="bg-white/20 p-1.5 rounded-lg">
        {type === 'success' ? <Plus size={18} className="rotate-45" /> : <X size={18} />}
      </div>
      <p className="font-bold tracking-tight">{message}</p>
    </div>
  );
};

export default function SuperAdmins() {
  const { register, handleSubmit, reset } = useForm();
  const [activeContent, setActiveContent] = useState("viewCourses");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [allCourses, setAllcourses] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [adminProfile, setAdminProfile] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const showToast = (message, type) => setToast({ message, type });

  // --- APPWRITE LOGIC ---

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await databases.listDocuments(Config.dbId, Config.coursesCol);
      setAllcourses(res.documents);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await databases.listDocuments(Config.dbId, Config.profilesCol);
      setAllUsers(res.documents);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, []);

  // Fetch Admin's own profile on mount
  useEffect(() => {
    const getAdminData = async () => {
      try {
        const user = await account.get();
        const res = await databases.listDocuments(Config.dbId, Config.profilesCol, [
          // Change 'userId' to whatever your actual attribute name is (e.g., 'email')
          Query.equal('email', user.email)
        ]);
        if (res.documents.length > 0) {
          setAdminProfile(res.documents[0]);
        }
      } catch (e) {
        console.error("Profile fetch error", e);
      } finally {
        setLoading(false);
      }
    };
    getAdminData();
  }, []);


  const onSubmitCourse = async (data) => {
    if (!adminProfile) {
      showToast("Admin profile not loaded yet.", "error");
      return;
    }

    const payload = {
      coursecode: data.code,
      coursetitle: data.title,
      courseunit: parseInt(data.unit),
      faculty: adminProfile.faculty,
      school: adminProfile.school,
      department: adminProfile.department,
      level: adminProfile.level
    };

    try {
      if (editingId) {
        // UPDATE existing course
        await databases.updateDocument(Config.dbId, Config.coursesCol, editingId, payload);
        showToast("Course updated successfully!", 'success');
      } else {
        // CREATE new course
        await databases.createDocument(Config.dbId, Config.coursesCol, ID.unique(), payload);
        showToast("Course created successfully!", 'success');
      }

      // Reset Form and State
      setEditingId(null);
      reset({ code: '', title: '', unit: '' });
      setActiveContent("viewCourses");
      fetchCourses();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };


  const handleDeleteCourse = async (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This course will be permanently removed.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#0f766e", // Teal 700
      cancelButtonColor: "#e11d48",  // Rose 600
      confirmButtonText: "Yes, delete it!",
      background: "#ffffff",
      customClass: {
        popup: 'rounded-[2rem]',
        confirmButton: 'rounded-xl font-bold px-6 py-3',
        cancelButton: 'rounded-xl font-bold px-6 py-3'
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await databases.deleteDocument(Config.dbId, Config.coursesCol, id);
          Swal.fire({
            title: "Deleted!",
            icon: "success",
            timer: 1500,
            showConfirmButton: false
          });
          fetchCourses();
        } catch (e) {
          showToast(e.message, 'error');
        }
      }
    });
  };

  const toggleUserRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'student' : 'admin';
    try {
      const updateData = {
        role: newRole
      };
      if (newRole === 'admin') {
        updateData.bankName = '';
        updateData.accountNumber = '';
        updateData.accountName = '';
        updateData.bvn = '';
      }
      await databases.updateDocument(Config.dbId, Config.profilesCol, userId, updateData);
      if (newRole === 'admin') {
        showToast(`User promoted to ${newRole}`, 'success');
      } else {
        showToast(`User demoted to ${newRole}`, 'success');
      }
      fetchUsers();
    } catch (e) { showToast(e.message, 'error'); }
  };

  useEffect(() => {
    if (activeContent === "viewCourses") fetchCourses();
    if (activeContent === "manageUsers") fetchUsers();
  }, [activeContent, fetchCourses, fetchUsers]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-14">
      <Header />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex max-w-[1600px] mx-auto min-h-[calc(100vh-80px)]">

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white/5 backdrop-blur-xl border-r border-white/10 transform transition-all duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-12 px-2">
              <div className="bg-gradient-to-br from-teal-500 to-teal-700 p-2 rounded-xl shadow-lg"><Settings className="text-white" size={24} /></div>
              <h2 className="text-xl font-black text-white">SuperHub</h2>
            </div>

            <nav className="space-y-2 flex-1">
              {[
                { key: "viewCourses", label: "Directory", icon: BookOpen },
                { key: "createCourse", label: "New Course", icon: Plus },
                { key: "manageUsers", label: "User Roles", icon: Users },
                { key: "settings", label: "System", icon: Settings },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => { setActiveContent(item.key); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${activeContent === item.key ? "bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-xl translate-x-1" : "text-white/60 hover:bg-white/10"}`}
                >
                  <item.icon size={20} /> {item.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
          <button className="md:hidden mb-6 p-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white border rounded-xl" onClick={() => setIsSidebarOpen(true)}><Menu className="text-white" size={20} /></button>

          <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h1 className="text-4xl font-black text-white tracking-tight capitalize">{activeContent.replace(/([A-Z])/g, ' $1')}</h1>
              <p className="text-white/60 font-medium mt-2">🔧 System Management</p>
            </div>

            {(activeContent === "viewCourses" || activeContent === "manageUsers") && (
              <div className="relative w-full md:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Filter results..."
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 ring-teal-500/20"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* 1. View Courses */}
          {activeContent === "viewCourses" && (
            loading ? <LoadingState /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allCourses.filter(c => c.coursecode.toLowerCase().includes(searchTerm.toLowerCase())).map((c) => (
                  <div key={c.$id} className="bg-white p-6 rounded-[2rem] border border-slate-100 hover:shadow-xl transition-all group">
                    <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-1 rounded-md uppercase tracking-wider">{c.courseunit} Units</span>
                    <h3 className="text-2xl font-black text-slate-800 mt-2">{c.coursecode}</h3>
                    <p className="text-slate-500 font-bold text-sm mb-6">{c.coursetitle}</p>
                    <div className="flex justify-end gap-2 border-t pt-4">
                      <button
                        onClick={() => {
                          setEditingId(c.$id); // Key step: Store the ID
                          setActiveContent("createCourse");
                          reset({
                            code: c.coursecode,
                            title: c.coursetitle,
                            unit: c.courseunit
                          });
                        }}
                        className="p-2 text-slate-400 hover:text-teal-600 transition-colors"
                      >
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDeleteCourse(c.$id)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* 2. Create Course (CLEANED & RESPONSIVE) */}
          {activeContent === "createCourse" && (
            <div className="max-w-3xl mx-auto bg-white p-6 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl animate-in fade-in zoom-in-95 duration-300">

              {/* Header with Dynamic Title and Cancel option */}
              <div className="mb-8 border-b border-slate-50 pb-6 flex justify-between items-start">
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                    {editingId ? "Modify Course" : "Create New Course"}
                  </h2>
                  <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">
                    Target: <span className="text-teal-600 font-bold uppercase">{adminProfile?.department} ({adminProfile?.level}L)</span>
                  </p>
                </div>

                {editingId && (
                  <button
                    onClick={() => { setEditingId(null); reset(); setActiveContent("viewCourses"); }}
                    className="text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 px-3 py-2 rounded-lg hover:bg-rose-100 transition-all"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit(onSubmitCourse)} className="space-y-6">
                {/* Responsive Grid: Stacks on mobile, side-by-side on md screens */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="w-full">
                    <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase ml-1 tracking-wider">Course Code</label>
                    <input
                      {...register("code")}
                      required
                      className="w-full mt-2 p-3 md:p-4 bg-slate-50 border-2 border-transparent focus:border-teal-500 rounded-xl md:rounded-2xl outline-none transition-all font-bold text-slate-700"
                      placeholder="e.g. CSC 201"
                    />
                  </div>
                  <div className="w-full">
                    <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase ml-1 tracking-wider">Credit Units</label>
                    <input
                      {...register("unit")}
                      required
                      type="number"
                      className="w-full mt-2 p-3 md:p-4 bg-slate-50 border-2 border-transparent focus:border-teal-500 rounded-xl md:rounded-2xl outline-none transition-all font-bold text-slate-700"
                      placeholder="e.g. 3"
                    />
                  </div>
                </div>

                <div className="w-full">
                  <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase ml-1 tracking-wider">Full Course Title</label>
                  <input
                    {...register("title")}
                    required
                    className="w-full mt-2 p-3 md:p-4 bg-slate-50 border-2 border-transparent focus:border-teal-500 rounded-xl md:rounded-2xl outline-none transition-all font-bold text-slate-700"
                    placeholder="e.g. Introduction to Software Engineering"
                  />
                </div>

                {/* Logic to show which Admin is creating the course */}
                <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-4 border border-slate-100">
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    <ShieldCheck className="text-teal-600" size={20} />
                  </div>
                  <div className="text-[10px] md:text-xs">
                    <p className="text-slate-400 uppercase font-black">Authorized Publisher</p>
                    <p className="text-slate-700 font-bold">{adminProfile?.full_name || "Super Admin"}</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!adminProfile}
                  className="w-full bg-slate-900 text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-black hover:bg-teal-700 transition-all shadow-lg hover:shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {editingId ? <Edit size={20} /> : <Plus size={20} />}
                  {adminProfile
                    ? (editingId ? "Save Changes" : "Create & Publish Course")
                    : "Fetching Credentials..."}
                </button>
              </form>
            </div>
          )}

          {/* 3. Manage Users */}
          {activeContent === "manageUsers" && (
            loading ? <LoadingState /> : (
              <div className="bg-white rounded-[2rem] border border-slate-100 overflow-x-auto shadow-sm">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-8 py-5">Identity</th>
                      <th className="px-8 py-5">Department</th>
                      <th className="px-8 py-5">Role</th>
                      <th className="px-8 py-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {allUsers.filter(u => u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())).map((u) => (
                      <tr key={u.$id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-8 py-5">
                          <p className="font-bold text-slate-800">{u.full_name || "Guest"}</p>
                          <p className="text-xs text-slate-400">{u.email || u.matricNo}</p>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-sm font-bold text-slate-600">{u.department}</p>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${u.role === 'admin' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                            {u.role || 'Student'}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button onClick={() => toggleUserRole(u.$id, u.role)} className="inline-flex items-center gap-2 text-xs font-black text-teal-600 hover:bg-teal-50 px-4 py-2 rounded-xl transition-all">
                            <UserCog size={14} /> {u.role === 'admin' ? 'Demote' : 'Promote'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* 4. Settings Placeholder */}
          {activeContent === "settings" && (
            <div className="p-20 text-center bg-white border border-dashed rounded-[3rem] text-slate-400">
              <ShieldCheck size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold tracking-tight">System configuration is restricted to Global SuperAdmins.</p>
            </div>
          )}

        </main>
      </div>

      {/* Promotion Modal */}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 space-y-4">
      <Loader2 className="animate-spin text-teal-700" size={48} />
      <p className="text-slate-400 font-bold animate-pulse tracking-widest uppercase text-xs">Accessing cloud...</p>
    </div>
  );
}