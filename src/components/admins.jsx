import { useEffect, useState } from "react";
import Header from "./header";
import { databases, storage, Config } from "../backend/appwrite";
import { Query } from "appwrite";
import {
  Menu, X, Users, BookOpen, BarChart, Loader2, ShieldCheck,
  UserCircle, Eye, CheckCircle, Clock, ExternalLink
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; 
import Swal from 'sweetalert2';

export default function Admins({ user }) {
  const [activeContent, setActiveContent] = useState("manageStudents");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [receipts, setReceipts] = useState([]); 
  const [assignments, setAssignments] = useState([]); 
  const [selectedImage, setSelectedImage] = useState(null); 
  const [showPromotionPopup, setShowPromotionPopup] = useState(false);
  const [accountDetails, setAccountDetails] = useState({
    name: "",
    bankCode: "",
    accountNumber: "",
    email: ""
  });

const [loading, setLoading] = useState(false);
const [classMeta, setClassMeta] = useState(null);

  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedForReport, setSelectedForReport] = useState([]);

  const toggleReportSelection = (student) => {
    setSelectedForReport(prev =>
      prev.find(s => s.$id === student.$id)
        ? prev.filter(s => s.$id !== student.$id)
        : [...prev, student]
    );
  };

  // 1. Updated Toggle: Moves student from Pending -> Verified
  const handleStatusToggle = async (rcpt) => {
    try {
      // Get the highest serial number for verified students in this department/level
      const verifiedRes = await databases.listDocuments(Config.dbId, Config.submissionsCol, [
        Query.equal("status", "verified"),
        Query.equal("department", user.department),
        Query.equal("level", user.level),
        Query.orderDesc("serialNumber"),
        Query.limit(1)
      ]);

      const nextSerialNumber = verifiedRes.documents.length > 0 ? (verifiedRes.documents[0].serialNumber || 0) + 1 : 1;

      await databases.updateDocument(
        Config.dbId,
        Config.submissionsCol,
        rcpt.$id,
        {
          status: "verified",
          serialNumber: nextSerialNumber
        }
      );

      setReceipts(prev => prev.filter(item => item.$id !== rcpt.$id));
      setSelectedStudents(prev => [...prev, { ...rcpt, status: "verified", serialNumber: nextSerialNumber }]);

    } catch (error) {
      console.error("Verification failed:", error);
    }
  };

  // 2. Professional PDF Generator
  const downloadVerifiedPDF = async (customList = null) => {
    setLoading(true);
    try {
      let dataToPrint = customList;
      if (!dataToPrint) {
        const res = await databases.listDocuments(Config.dbId, Config.submissionsCol, [
          Query.equal("status", "verified"),
          Query.equal("department", user.department),
          Query.equal("level", user.level),
          Query.limit(500)
        ]);
        dataToPrint = res.documents;
      }

      if (dataToPrint.length === 0) {
        alert("No verified records found.");
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // Header Branding
      doc.setFillColor(20, 158, 136);
      doc.roundedRect(14, 12, 12, 12, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text("C", 18, 20);
      doc.setTextColor(20, 158, 136);
      doc.setFontSize(18);
      doc.text("CLASSIST", 30, 18);

      // Metadata
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`DEPARTMENT: ${user.department.toUpperCase()}`, 14, 47);
      doc.text(`LEVEL: ${user.level}L`, 14, 52);
      doc.text(`DATE: ${new Date().toLocaleDateString()}`, 14, 57);

      const tableData = dataToPrint.map((s) => [
        s.serialNumber,
        s.name.toUpperCase(),
        s.matric,
        s.code || "GST101",
        "VERIFIED"
      ]);

      autoTable(doc, {
        startY: 65,
        head: [['S/N', 'STUDENT NAME', 'MATRIC NO', 'COURSE CODE', 'STATUS']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [20, 158, 136] }
      });

      // Signature
      const finalY = doc.lastAutoTable.finalY + 25;
      doc.line(14, finalY, 70, finalY);
      doc.text("Admin Signature", 14, finalY + 5);
      doc.text(user.name, 14, finalY + 10);

      doc.save(`Report_${user.department}.pdf`);
    } catch (error) {
      console.error("PDF Export Error:", error);
    } finally {
      setLoading(false);
    }
  };

const handleAccountDetailsSubmit = async () => {

  // 🔒 VALIDATION WITH SWAL
  if (!accountDetails.name.trim()) {
    return Swal.fire({
      icon: "warning",
      title: "Missing Field",
      text: "Account name is required"
    });
  }

  if (!accountDetails.bankCode) {
    return Swal.fire({
      icon: "warning",
      title: "Missing Field",
      text: "Please select a bank"
    });
  }

  if (accountDetails.accountNumber.length !== 10) {
    return Swal.fire({
      icon: "warning",
      title: "Invalid Account Number",
      text: "Account number must be 10 digits"
    });
  }

  // 🔍 CONFIRMATION STEP (PRO UX)
  const confirm = await Swal.fire({
    title: "Confirm Account Details",
    html: `
      <p><strong>Name:</strong> ${accountDetails.name}</p>
      <p><strong>Account Number:</strong> ${accountDetails.accountNumber}</p>
    `,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Proceed",
    cancelButtonText: "Edit"
  });

  if (!confirm.isConfirmed) return;

  setLoading(true);

  // 🔄 LOADING STATE
  Swal.fire({
    title: "Processing...",
    text: "Creating your payout account",
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  try {
    const payload = {
      business_name: accountDetails.name,
      account_bank: accountDetails.bankCode,
      account_number: accountDetails.accountNumber,
      business_email: accountDetails.email || "default@email.com",
      business_contact: accountDetails.name,
      business_contact_mobile: user?.phone || "08000000000"
    };

    const response = await functions.createExecution(
      "69caa0e800257591f0b4",
      JSON.stringify(payload)
    );

    const result = JSON.parse(response.response);

    // ❌ ERROR FROM BACKEND
    if (!result.success) {
      return Swal.fire({
        icon: "error",
        title: "Failed",
        text: result.message || "Unable to create subaccount"
      });
    }

    // ✅ SUCCESS
    await Swal.fire({
      icon: "success",
      title: "Account Setup Successful 🎉",
      text: "Your payout account has been created successfully"
    });

    console.log("Subaccount:", result);

    // 🔐 CLOSE POPUP
    setShowPromotionPopup(false);

    // 🧠 OPTIONAL: Save locally
    // setUserSubaccount(result.subaccount_id);

  } catch (error) {
    console.error(error);

    Swal.fire({
      icon: "error",
      title: "Network Error",
      text: "Something went wrong. Please try again."
    });

  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  const fetchData = async () => {
    if (!user?.classCode) return;
    setLoading(true);
    try {
      const code = user.classCode;

      // 1. Fetch Class Metadata (School, Dept, Level, Faculty)
      const classRes = await databases.listDocuments(Config.dbId, Config.classDataCol, [
        Query.equal("schoolId", code) // Assuming schoolId stores the classCode
      ]);
      if (classRes.documents.length > 0) setClassMeta(classRes.documents[0]);

      // 2. Fetch Content based on active tab
      if (activeContent === "manageStudents") {
        const res = await databases.listDocuments(Config.dbId, Config.profilesCol, [
          Query.equal("classCode", code),
          Query.orderAsc("full_name"),
        ]);
        setStudents(res.documents);
      }
      // ... fetch payments/assignments using Query.equal("classCode", code)
    } catch (error) {
      console.error("Registry Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, [activeContent, user]);


  useEffect(() => {
    if (user?.role === 'admin' && !user?.accountNumber) {
      setShowPromotionPopup(true);
    }
  }, [user]);

// Helper: Transforms "Emmanuel Ojetayo" into "EO"
const getInitials = (name) => {
  if (!name) return "??";
  const parts = name.trim().split(" ");
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0]).toUpperCase();
};

// Refactored ProfileField
function ProfileField({ label, value, icon: Icon }) {
  return (
    <div className="p-4 bg-white rounded-[2rem] border border-slate-100 flex items-center gap-4 shadow-sm">
      <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center shrink-0">
        {Icon && <Icon size={18} />}
      </div>
      <div className="min-w-0 text-left">
        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-slate-800 font-bold text-xs uppercase truncate">{value || "---"}</p>
      </div>
    </div>
  );
}

  const navItems = [
    { key: "submission", label: "Assignments", icon: BarChart },
    { key: "viewPayment", label: "Payment Receipts", icon: BookOpen },
    { key: "manageStudents", label: "View Students", icon: Users },
    { key: "profile", label: "My Profile", icon: UserCircle },
  ];

  if (!user) return null;

  return (
    <>
      <Header />
      <div className="flex min-h-screen bg-gray-50 pt-14">
        {/* Mobile Toggle */}
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden fixed top-[4.5rem] right-4 z-[60] p-3 bg-teal-700 text-white rounded-full">
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Sidebar */}
        <aside className={`w-64 bg-white border-r p-6 fixed top-14 bottom-0 md:sticky md:h-[calc(100vh-3.5rem)] transition-transform z-50 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-teal-700 rounded-lg flex items-center justify-center text-white font-bold">A</div>
            <h2 className="text-lg font-bold text-gray-800">Admin Hub</h2>
          </div>
          <nav className="space-y-1.5">
            {navItems.map((item) => (
              <div key={item.key} onClick={() => { setActiveContent(item.key); setIsSidebarOpen(false); }}
                className={`flex items-center space-x-3 cursor-pointer px-4 py-2.5 rounded-xl text-sm ${activeContent === item.key ? "bg-teal-50 text-teal-700 font-bold" : "text-gray-500 hover:bg-gray-50"}`}>
                <item.icon size={18} />
                <span>{item.label}</span>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-10">
          <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
  <div className="flex items-center gap-4">
    {/* Encoded Name / Profile Initial (e.g., EO) */}
    <div className="w-16 h-16 bg-slate-900 text-teal-400 rounded-[1.5rem] flex items-center justify-center text-xl font-black shadow-xl shadow-slate-200 shrink-0 border-4 border-white">
      {getInitials(user.name)}
    </div>

    <div className="min-w-0">
      <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter leading-none">
        {user.name}
      </h1>
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <span className="bg-teal-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest">
          {classMeta?.department}  {classMeta?.level} Level 
        </span>
        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-tight truncate max-w-[200px]">
          {classMeta?.school || "Loading Institution..."}
        </span>
      </div>
    </div>
  </div>

  {/* Class Summary Badge - Hidden on very small screens, visible on md+ */}
  <div className="hidden md:flex items-center gap-3 bg-white p-2 pr-6 rounded-full border border-slate-100 shadow-sm">
    <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center">
      <Users size={18} />
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1 text-left">Management Scope</p>
      <p className="text-xs font-bold text-slate-700 uppercase">
        {classMeta?.department} • {classMeta?.level}L
      </p>
    </div>
  </div>
</header>

{activeContent === "manageStudents" && (
  <div className="space-y-3">
    {students.map((s) => (
      <div key={s.$id} className="bg-white p-4 rounded-[2rem] border border-slate-100 flex items-center gap-4 hover:shadow-lg transition-all">
        {/* EO-style Profile Initial */}
        <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-black text-sm border border-teal-100 shrink-0">
          {getInitials(s.full_name)}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-black text-slate-800 text-sm uppercase truncate">{s.full_name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase">{s.matricNo}</p>
            <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
            <p className="text-[10px] font-black text-teal-600 uppercase">{classMeta?.level}L</p>
          </div>
        </div>
        
        <div className="hidden md:block text-right">
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Registry</p>
            <p className="text-[10px] font-bold text-slate-600 uppercase">{classMeta?.department}</p>
        </div>
      </div>
    ))}
  </div>
)}

          {activeContent === "viewPayment" && (
            <div className="space-y-8">
              <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-amber-50/50 border-b flex justify-between items-center">
                  <h3 className="text-amber-700 font-black text-xs uppercase flex items-center gap-2"><Clock size={14} /> Pending ({receipts.length})</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {receipts.map((rcpt) => (
                    <div key={rcpt.$id} className="flex items-center gap-4 p-4">
                      <input type="checkbox" onChange={() => handleStatusToggle(rcpt)} className="w-5 h-5 accent-teal-600 cursor-pointer" />
                      <span className="flex-1 font-bold text-sm">{rcpt.name}</span>
                      <button onClick={() => setSelectedImage(storage.getFileView(Config.bucketId, rcpt.fileId))} className="p-2 text-teal-600 bg-teal-50 rounded-lg"><Eye size={18} /></button>
                    </div>
                  ))}
                </div>
              </div>

              {selectedStudents.length > 0 && (
                <div className="bg-teal-900 rounded-[2.5rem] p-8 text-white">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black">Verified Batch</h3>
                    <button onClick={() => downloadVerifiedPDF()} className="px-6 py-3 bg-white text-teal-900 rounded-2xl font-black text-sm">DOWNLOAD REPORT</button>
                  </div>
                  <table className="w-full text-left text-sm">
                    <tbody className="divide-y divide-teal-800/30">
                      {selectedStudents.map(s => (
                        <tr key={s.$id}><td className="py-4">{s.serialNumber}</td><td className="py-4 font-bold">{s.name}</td><td className="py-4">{s.matric}</td><td className="py-4 text-right"><span className="bg-teal-400/10 text-teal-400 px-3 py-1 rounded-full text-[10px]">VERIFIED</span></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

{activeContent === "profile" && (
  <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
    <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
      {/* Visual Identity Section */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-24 h-24 bg-teal-500 rounded-[2.5rem] flex items-center justify-center text-3xl font-black mb-4 shadow-xl border-4 border-white/10">
          {getInitials(user.name)}
        </div>
        <h2 className="text-3xl font-black tracking-tighter mb-1">{user.name}</h2>
        <div className="flex items-center gap-2 mb-8">
            <span className="text-teal-400 font-black text-[10px] uppercase tracking-widest">Administrator</span>
            <span className="w-1 h-1 bg-white/20 rounded-full"></span>
            <span className="text-white/40 font-black text-[10px] uppercase tracking-widest">{user.classCode}</span>
        </div>

        {/* Data Grid: Sourced from classMeta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
          <ProfileField 
            label="Institution" 
            value={classMeta?.school} 
            icon={BookOpen} 
          />
          <ProfileField 
            label="Faculty" 
            value={classMeta?.faculty} 
            icon={ShieldCheck} 
          />
          <ProfileField 
            label="Department" 
            value={classMeta?.department} 
            icon={Users} 
          />
          <ProfileField 
            label="Level" 
            value={`${classMeta?.level}L`} 
            icon={BarChart} 
          />
        </div>
      </div>
      
      {/* Background Glow */}
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl"></div>
    </div>
  </div>
)}
        </main>
      </div>

      {/* Image Popup */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center">
          <button onClick={() => setSelectedImage(null)} className="absolute top-10 right-10 text-white"><X size={40} /></button>
          <img src={selectedImage} alt="Receipt" className="max-w-[90%] max-h-[90%] rounded-lg" />
        </div>
      )}

      {/* Promotion Popup */}
{showPromotionPopup && (
<div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
<div className="bg-white rounded-3xl p-8 max-w-md w-full">
  <h2 className="text-2xl font-bold text-center mb-6">
    Setup Payout Account
  </h2>

  <div className="space-y-4">

    {/* Business Name */}
    <input
      type="text"
      placeholder="Account / Business Name"
      value={accountDetails.name}
      onChange={(e) =>
        setAccountDetails({ ...accountDetails, name: e.target.value })
      }
      className="w-full p-3 border rounded-lg"
    />

    {/* Bank Dropdown (IMPORTANT: Use bank codes) */}
    <select
      value={accountDetails.bankCode}
      onChange={(e) =>
        setAccountDetails({ ...accountDetails, bankCode: e.target.value })
      }
      className="w-full p-3 border rounded-lg"
    >
      <option value="">Select Bank</option>
      <option value="044">Access Bank</option>
      <option value="058">GTBank</option>
      <option value="011">First Bank</option>
      <option value="033">UBA</option>
      <option value="057">Zenith Bank</option>
    </select>

    {/* Account Number */}
    <input
      type="text"
      placeholder="Account Number"
      value={accountDetails.accountNumber}
      onChange={(e) =>
        setAccountDetails({
          ...accountDetails,
          accountNumber: e.target.value.replace(/\D/g, "")
        })
      }
      maxLength={10}
      className="w-full p-3 border rounded-lg"
    />

    {/* Optional Email */}
    <input
      type="email"
      placeholder="Business Email (optional)"
      value={accountDetails.email}
      onChange={(e) =>
        setAccountDetails({ ...accountDetails, email: e.target.value })
      }
      className="w-full p-3 border rounded-lg"
    />

    {/* Button */}
    <button
      onClick={handleAccountDetailsSubmit}
      disabled={loading}
      className="w-full bg-teal-700 text-white py-3 rounded-xl font-bold"
    >
      {loading ? "Processing..." : "Save Details"}
    </button>
  </div>
</div>
</div>
)}
    </>
  );
}