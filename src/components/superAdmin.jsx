import { useEffect, useState, useCallback } from "react";
import Header from "./header";
import { useForm } from "react-hook-form";
import { databases, Config, ID, account, Query } from "../backend/appwrite";
import { Menu, X, BookOpen, Users, Settings, Edit, Trash2, Plus, Loader2, Search, UserCog, ShieldCheck } from "lucide-react";
import Swal from 'sweetalert2';

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

  // ✅ FIX 1: classData state was used but never declared
  const [classData, setClassData] = useState({
    dept: '', faculty: '', level: '', school: '', code: ''
  });

  const showToast = (message, type) => setToast({ message, type });

  const syncRegistryData = useCallback(async () => {
    setLoading(true);
    try {
      const user = await account.get();

      const profileRes = await databases.listDocuments(
        Config.dbId,
        Config.profilesCol,
        [Query.equal('email', user.email)]
      );

      if (profileRes.documents.length > 0) {
        const doc = profileRes.documents[0];
        const code = doc.classCode;

        // ✅ FIX 3: setAdminProfile was never called — submit button was always disabled
        setAdminProfile(doc);

        const [classRes, courseRes, userRes] = await Promise.all([
          databases.listDocuments(Config.dbId, Config.classDataCol, [Query.equal("schoolId", code)]),
          databases.listDocuments(Config.dbId, Config.coursesCol, [Query.equal("classCode", code)]),
          databases.listDocuments(Config.dbId, Config.profilesCol, [Query.equal("classCode", code)])
        ]);

        if (classRes.documents.length > 0) {
          const meta = classRes.documents[0];
          setClassData({
            dept: meta.department,
            faculty: meta.faculty,
            level: meta.level,
            school: meta.school,
            code: code
          });
        }

        setAllcourses(courseRes.documents);
        setAllUsers(userRes.documents);
      }
    } catch (e) {
      console.error(e);
      showToast("Sync Failed", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ FIX 2: Removed the second broken useEffect that called undefined
  // fetchCourses() and fetchUsers() inside the dependency array.
  // This single effect handles everything.
  useEffect(() => {
    syncRegistryData();
  }, [syncRegistryData, activeContent]);

  const onSubmitCourse = async (data) => {
    if (!classData.code) return;

    const payload = {
      coursecode: data.code.toUpperCase(),
      coursetitle: data.title,
      courseunit: parseInt(data.unit),
      faculty: classData.faculty,
      school: classData.school,
      department: classData.dept,
      level: classData.level,
      classCode: classData.code
    };

    try {
      if (editingId) {
        await databases.updateDocument(Config.dbId, Config.coursesCol, editingId, payload);
        showToast("Entry Updated", 'success');
      } else {
        await databases.createDocument(Config.dbId, Config.coursesCol, ID.unique(), payload);
        showToast("Entry Created", 'success');
      }
      setEditingId(null);
      reset();
      setActiveContent("viewCourses");
      syncRegistryData();
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
      confirmButtonColor: "#0f766e",
      cancelButtonColor: "#e11d48",
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
          Swal.fire({ title: "Deleted!", icon: "success", timer: 1500, showConfirmButton: false });
          syncRegistryData();
        } catch (e) {
          showToast(e.message, 'error');
        }
      }
    });
  };

  const toggleUserRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'student' : 'admin';
    try {
      const updateData = { role: newRole };
      if (newRole === 'admin') {
        updateData.bankName = '';
        updateData.accountNumber = '';
        updateData.accountName = '';
        updateData.bvn = '';
      }
      await databases.updateDocument(Config.dbId, Config.profilesCol, userId, updateData);
      showToast(`User ${newRole === 'admin' ? 'promoted' : 'demoted'}`, 'success');
      syncRegistryData();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  // 1. Get students who aren't already reps
const getAvailableStudents = async (classCode) => {
  const allUsers = await databases.listDocuments(Config.dbId, Config.profilesCol, [
    Query.equal("classCode", classCode)
  ]);
  const activeAdmins = await databases.listDocuments(Config.dbId, Config.adminCol, [
    Query.equal("classCode", classCode)
  ]);
  
  const adminEmails = activeAdmins.documents.map(a => a.email);
  return allUsers.documents.filter(u => !adminEmails.includes(u.email));
};

// 2. Assign a Rep
// 2. Assign a Rep
const assignCourseRep = async (course, student) => {
  try {
    const adminPayload = {
      name: student.full_name,
      email: student.email,
      studentId: student.$id, 
      coursetitle: course.coursetitle,
      classCode: course.classCode,
      isOnboarded: false
    };
    
    // Create Admin Record
    const adminDoc = await databases.createDocument(Config.dbId, Config.adminCol, ID.unique(), adminPayload);

    // Update Course with AdminDoc ID (NOT studentId) so we can delete the admin record easily later
    await databases.updateDocument(Config.dbId, Config.coursesCol, course.$id, {
      assignedRepId: adminDoc.$id 
    });

    // Elevate Role
    await databases.updateDocument(Config.dbId, Config.profilesCol, student.$id, {
      role: 'admin'
    });

    return { success: true };
  } catch (e) {
    throw new Error("Assignment failed: " + e.message);
  }
};

// 3. Unassign a Rep
const unassignCourseRep = async (courseId, adminId, studentProfileId) => {
  try {
    // A. Delete from adminCol
    await databases.deleteDocument(Config.dbId, Config.adminCol, adminId);
    
    // B. Clear assignedRepId in coursesCol
    await databases.updateDocument(Config.dbId, Config.coursesCol, courseId, {
      assignedRepId: null 
    });
  // Change this line in your unassignCourseRep function:
await databases.updateDocument(Config.dbId, Config.profilesCol, studentProfileId, { role: 'student' });
    return { success: true };
  } catch (e) {
    throw new Error("Unassignment failed: " + e.message);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-14">
      <Header />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex max-w-[1600px] mx-auto min-h-[calc(100vh-56px)]">

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/95 backdrop-blur-xl border-r border-white/10 transform transition-all duration-300 md:relative md:translate-x-0 md:w-56 lg:w-64 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="p-5 h-full flex flex-col pt-16 md:pt-6">
            <div className="flex items-center gap-3 mb-10 px-1">
              <div className="bg-teal-600 p-2 rounded-xl">
                <Settings className="text-white" size={20} />
              </div>
              <h2 className="text-lg font-black text-white">SuperHub</h2>
            </div>

            <nav className="space-y-1 flex-1">
              {[
                { key: "viewCourses", label: "Directory", icon: BookOpen },
                { key: "createCourse", label: "New Course", icon: Plus },
                { key: "manageUsers", label: "User Roles", icon: Users },
                { key: "settings", label: "System", icon: Settings },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => { setActiveContent(item.key); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-bold text-sm transition-all ${activeContent === item.key
                    ? "bg-teal-600 text-white shadow-lg"
                    : "text-white/50 hover:text-white hover:bg-white/10"
                    }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Admin profile chip at sidebar bottom */}
            {adminProfile && (
              <div className="mt-auto pt-4 border-t border-white/10">
                <div className="flex items-center gap-3 px-2 py-2">
                  <div className="w-8 h-8 rounded-full bg-teal-700 flex items-center justify-center text-white text-xs font-black">
                    {adminProfile.full_name?.[0] ?? 'A'}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-white truncate">{adminProfile.full_name}</p>
                    <p className="text-[10px] text-white/40 truncate">{adminProfile.email}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-5 md:p-8 lg:p-10 overflow-y-auto">
          {/* Top bar */}
          <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                className="md:hidden p-2.5 bg-teal-600 text-white rounded-xl"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu size={18} />
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight capitalize">
                  {activeContent.replace(/([A-Z])/g, ' $1')}
                </h1>
                <p className="text-white/40 text-xs font-medium mt-0.5">
                  {classData.dept ? `${classData.dept} · ${classData.level}L` : 'System Management'}
                </p>
              </div>
            </div>

            {(activeContent === "viewCourses" || activeContent === "manageUsers") && (
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Filter results..."
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 ring-teal-500/20"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}
          </div>

{/* View Courses Tab */}
{activeContent === "viewCourses" && (
  loading ? <LoadingState /> : (
    allCourses.filter(c => c.coursecode.toLowerCase().includes(searchTerm.toLowerCase())).length === 0
      ? <EmptyState message="No courses found." />
      : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {allCourses
            .filter(c => c.coursecode.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((c) => {
              // Find if this course has an assigned rep name (optional: requires profile sync)
              const hasRep = c.assignedRepId;

              return (
                <div key={c.$id} className="bg-white p-5 rounded-2xl border border-slate-100 hover:shadow-lg transition-all group relative">
                  
                  {/* Header: Units & Rep Status */}
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-[10px] font-black text-teal-700 bg-teal-50 px-2 py-1 rounded-lg uppercase tracking-wider">
                      {c.courseunit} Units
                    </span>
                    
                    {hasRep ? (
                      <div className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-2 py-1 rounded-lg border border-amber-100 animate-in fade-in zoom-in">
                        <ShieldCheck size={12} />
                        <span className="text-[10px] font-bold uppercase">Rep Assigned</span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-300 uppercase italic">No Rep</span>
                    )}
                  </div>

                  {/* Course Details */}
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                    {c.coursecode}
                  </h3>
                  <p className="text-slate-500 text-sm font-medium mt-1 mb-4 line-clamp-2">
                    {c.coursetitle}
                  </p>

                  {/* Action Footer */}
                  <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-auto">
                    
                    {/* ASSIGNMENT LOGIC TRIGGER */}
                    {!hasRep ? (
                      <button 
                        onClick={async () => {
                          // 1. Fetch available students first
                          const available = await getAvailableStudents(classData.code);
                          if (available.length === 0) {
                            return showToast("No available students found", "error");
                          }
                          
                          // 2. Simple SweetAlert2 Selection (Instead of a complex modal)
                          const { value: studentId } = await Swal.fire({
                            title: 'Select Course Rep',
                            input: 'select',
                            inputOptions: Object.fromEntries(available.map(s => [s.$id, s.full_name])),
                            inputPlaceholder: 'Select a student',
                            showCancelButton: true,
                            confirmButtonColor: '#0f766e',
                            customClass: { popup: 'rounded-3xl', input: 'rounded-xl font-bold' }
                          });

                          if (studentId) {
                            const selectedStudent = available.find(s => s.$id === studentId);
                            try {
                              setLoading(true);
                              await assignCourseRep(c, selectedStudent);
                              showToast("Rep Assigned!", "success");
                              syncRegistryData(); // Refresh UI
                            } catch (err) {
                              showToast(err.message, "error");
                            } finally {
                              setLoading(false);
                            }
                          }
                        }}
                        className="flex items-center gap-1.5 text-[11px] font-black text-teal-600 hover:text-teal-700 uppercase tracking-tight"
                      >
                        <Plus size={14} />
                        Assign Rep
                      </button>
                    ) : (
                      <button 
                       onClick={async () => {
      try {
        setLoading(true);
        // 1. We need to get the admin record to find the student's Profile ID for demotion
        const adminRecord = await databases.getDocument(Config.dbId, Config.adminCol, c.assignedRepId);
        
        // 2. Run your unassign logic
        await unassignCourseRep(c.$id, c.assignedRepId, adminRecord.studentId);
        
        showToast("Rep Removed & Demoted", "success");
        syncRegistryData();
      } catch (err) {
        showToast("Failed to unassign: " + err.message, "error");
      } finally {
        setLoading(false);
      }
    }}
    className="flex items-center gap-1.5 text-[11px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-tight"
  >
                        <X size={14} />
                        Unassign
                      </button>
                    )}

                    {/* Standard Actions */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingId(c.$id);
                          setActiveContent("createCourse");
                          reset({ 
                            code: c.coursecode, 
                            title: c.coursetitle, 
                            unit: c.courseunit 
                          });
                        }}
                        className="p-2 text-slate-300 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                        title="Edit Details"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(c.$id)}
                        className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Delete Course"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Quick-Info Hover (Optional) */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-slate-800 text-white text-[9px] px-2 py-1 rounded-md font-bold uppercase shadow-xl">
                      ID: {c.$id.slice(-5)}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )
  )
)}

          {/* Create / Edit Course */}
          {activeContent === "createCourse" && (
            <div className="max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-lg animate-in fade-in zoom-in-95 duration-300">
              <div className="mb-6 pb-5 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black text-slate-800">
                    {editingId ? "Edit Course" : "New Course"}
                  </h2>
                  <p className="text-slate-400 text-xs font-medium mt-1">
                    {classData.dept
                      ? <span>Target: <span className="text-teal-600 font-bold uppercase">{classData.dept} ({classData.level}L)</span></span>
                      : 'Loading class data...'}
                  </p>
                </div>
                {editingId && (
                  <button
                    onClick={() => { setEditingId(null); reset(); setActiveContent("viewCourses"); }}
                    className="text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 px-3 py-2 rounded-lg hover:bg-rose-100 transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit(onSubmitCourse)} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Course Code</label>
                    <input
                      {...register("code")}
                      required
                      className="w-full mt-1.5 px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-teal-500 rounded-xl outline-none transition-all font-bold text-slate-700 text-sm"
                      placeholder="e.g. CSC 201"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Credit Units</label>
                    <input
                      {...register("unit")}
                      required
                      type="number"
                      min={1}
                      max={6}
                      className="w-full mt-1.5 px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-teal-500 rounded-xl outline-none transition-all font-bold text-slate-700 text-sm"
                      placeholder="e.g. 3"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Full Course Title</label>
                  <input
                    {...register("title")}
                    required
                    className="w-full mt-1.5 px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-teal-500 rounded-xl outline-none transition-all font-bold text-slate-700 text-sm"
                    placeholder="e.g. Introduction to Software Engineering"
                  />
                </div>

                <div className="bg-slate-50 px-4 py-3 rounded-xl flex items-center gap-3 border border-slate-100">
                  <div className="bg-white p-1.5 rounded-lg shadow-sm">
                    <ShieldCheck className="text-teal-600" size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Authorized Publisher</p>
                    <p className="text-slate-700 font-bold text-sm">{adminProfile?.full_name ?? "Loading..."}</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!adminProfile || !classData.code}
                  className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-sm hover:bg-teal-700 transition-all shadow-md hover:shadow-teal-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {editingId ? <><Edit size={17} /> Save Changes</> : <><Plus size={17} /> Create & Publish</>}
                </button>
              </form>
            </div>
          )}

          {/* Manage Users */}
          {activeContent === "manageUsers" && (
            loading ? <LoadingState /> : (
              <div className="bg-white rounded-2xl border border-slate-100 overflow-x-auto shadow-sm">
                <table className="w-full text-left min-w-[540px]">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Identity</th>
                      <th className="px-6 py-4">Department</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {allUsers
                      .filter(u => u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((u) => (
                        <tr key={u.$id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-800 text-sm">{u.full_name || "Guest"}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{u.email || u.matricNo}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-slate-500">{u.department || '—'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${u.role === 'admin'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-500'
                              }`}>
                              {u.role || 'Student'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => toggleUserRole(u.$id, u.role)}
                              className="inline-flex items-center gap-1.5 text-xs font-black text-teal-600 hover:bg-teal-50 px-3 py-2 rounded-xl transition-all"
                            >
                              <UserCog size={13} />
                              {u.role === 'admin' ? 'Demote' : 'Promote'}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {allUsers.filter(u => u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                  <div className="py-12 text-center text-slate-400 text-sm font-medium">No users match your search.</div>
                )}
              </div>
            )
          )}

          {/* Settings placeholder */}
          {activeContent === "settings" && (
            <div className="py-24 text-center bg-white border border-dashed border-slate-200 rounded-2xl text-slate-400">
              <ShieldCheck size={40} className="mx-auto mb-3 opacity-20" />
              <p className="font-bold text-sm tracking-tight">System configuration is restricted to Global SuperAdmins.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 space-y-3">
      <Loader2 className="animate-spin text-teal-600" size={36} />
      <p className="text-slate-400 font-bold animate-pulse tracking-widest uppercase text-xs">Accessing cloud...</p>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="py-24 text-center text-slate-400 bg-white border border-dashed border-slate-200 rounded-2xl">
      <BookOpen size={36} className="mx-auto mb-3 opacity-20" />
      <p className="font-bold text-sm">{message}</p>
    </div>
  );
}