import { useEffect, useState } from "react";
import Header from "./header";
import { databases, storage, functions, Config } from "../backend/appwrite";
import { Query } from "appwrite";
import {
  Menu, X, Users, BookOpen, BarChart, Loader2,
  UserCircle, Eye, CheckCircle, Clock, ExternalLink
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // Import the function directly

export default function Admins({ user }) {
  const [activeContent, setActiveContent] = useState("manageStudents");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [receipts, setReceipts] = useState([]); // Store receipts
  const [assignments, setAssignments] = useState([]); // Store assignments
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); // For Image Popup

  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedForReport, setSelectedForReport] = useState([]);

  // 1. Add this state at the top of your Admins component
const [onboardingData, setOnboardingData] = useState({
  bank_code: user.bank_code || "",
  account_number: user.account_number || "",
  manual_price: user.manual_price || ""
});

// 2. The Logic Function
const handleOnboarding = async (e) => {
  e.preventDefault();
  setLoading(true);

  // CRITICAL: Force string and remove spaces
  const cleanAccountNumber = String(onboardingData.account_number).trim();
  const cleanBankCode = String(onboardingData.bank_code).trim();

  try {
    const execution = await functions.createExecution(
      '69caa0e800257591f0b4',
      JSON.stringify({
        userId: user.$id,
        bank_code: cleanBankCode, // Sending as "033" not 33
        account_number: cleanAccountNumber,
        manual_price: Number(onboardingData.manual_price)
      })
    );

    const result = JSON.parse(execution.responseBody);
    
    if (result.success) {
      alert("Verification successful! You are now a verified Classist Admin.");
      window.location.reload(); 
    } else {
      // result.message will now say "Sorry we couldn't verify..." if FLW fails
      throw new Error(result.message || "Verification failed");
    }
  } catch (err) {
    alert(err.message);
  } finally {
    setLoading(false);
  }
};
useEffect(() => {
  const fetchAdminStatus = async () => {
    try {
      // Attempt to fetch the specific admin record using the logged-in User ID
      const adminDoc = await databases.getDocument(Config.dbId, Config.adminCol, user.$id);
      
      // Update the local state with the actual verified data from the 'admins' collection
      setOnboardingData({
        bank_code: adminDoc.bank_code || "",
        account_number: adminDoc.account_number || "",
        manual_price: adminDoc.manual_price || ""
      });

      // Update the user object locally to reflect the subaccount and onboarding status
      user.isOnboarded = adminDoc.isOnboarded;
      user.subaccount_id = adminDoc.subaccount_id;
    } catch (err) {
      console.log("Admin record not found yet. User needs onboarding.");
    }
  };

  if (user?.$id) fetchAdminStatus();
}, [user]);

{activeContent === "profile" && (
  <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
      <div className="h-32 bg-gradient-to-r from-teal-600 to-teal-900" />
      <div className="px-8 pb-8 -mt-12">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-6 mb-10">
          <div className="w-28 h-28 bg-white p-1.5 rounded-[2rem] shadow-xl">
            <div className="w-full h-full bg-teal-50 rounded-[1.5rem] flex items-center justify-center text-teal-700">
              <UserCircle size={56} />
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-black text-gray-800">{user.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${user.isOnboarded ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {user.isOnboarded ? "✓ Verified Classist Admin" : "⚠ Action Required: Onboarding"}
              </span>
              {user.subaccount_id && (
                <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                  ID: {user.subaccount_id}
                </span>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleOnboarding} className="bg-gray-50 rounded-[2rem] p-6 md:p-10 border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2 mb-2">
            <h3 className="text-xl font-bold text-gray-800">
              {user.isOnboarded ? "Manage Payouts" : "Merchant Onboarding"}
            </h3>
            <p className="text-gray-500 text-sm">
              {user.isOnboarded 
                ? "Your bank details are locked. You can update your manual prices below." 
                : "Enter your bank details to receive automated 95% split payments from students."}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase ml-2">Bank Account</label>
            <input 
              disabled={user.isOnboarded}
              required
              className="w-full p-4 bg-white border border-gray-200 rounded-2xl font-mono disabled:bg-gray-200 disabled:text-gray-500 outline-none focus:ring-2 ring-teal-500"
              placeholder="0123456789"
              value={onboardingData.account_number}
              onChange={(e) => setOnboardingData({...onboardingData, account_number: e.target.value})}
            />
          </div>

         <div className="space-y-2">
  <label className="text-xs font-black text-gray-400 uppercase ml-2">Select Bank</label>
  <select 
    disabled={user.isOnboarded}
    required
    className="w-full p-4 bg-white border border-gray-200 rounded-2xl font-sans outline-none focus:ring-2 ring-teal-500"
    value={onboardingData.bank_code}
    onChange={(e) => setOnboardingData({...onboardingData, bank_code: e.target.value})}
  >
    <option value="">Choose your bank...</option>
    <option value="999992">OPay</option>
    <option value="999991">PalmPay</option>
    <option value="033">UBA (United Bank for Africa)</option>
    <option value="058">GTBank</option>
    <option value="044">Access Bank</option>
    <option value="011">First Bank</option>
    <option value="057">Zenith Bank</option>
    <option value="090267">Kuda Bank</option>
  </select>
</div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-black text-gray-400 uppercase ml-2">Price per Manual (₦)</label>
            <div className="relative">
               <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-teal-700">₦</span>
               <input 
                required
                type="number"
                className="w-full p-4 pl-10 bg-white border border-gray-200 rounded-2xl font-black text-teal-700 text-xl outline-none focus:ring-2 ring-teal-500"
                placeholder="2500"
                value={onboardingData.manual_price}
                onChange={(e) => setOnboardingData({...onboardingData, manual_price: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className={`md:col-span-2 p-5 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
              user.isOnboarded ? 'bg-gray-800 hover:bg-black' : 'bg-teal-700 hover:bg-teal-800'
            } disabled:bg-gray-300`}
          >
            {loading ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />}
            {user.isOnboarded ? "Update Manual Price" : "Verify & Create Subaccount"}
          </button>
        </form>
      </div>
    </div>
  </div>
)}

  const toggleStudentSelection = (rcpt) => {
    setSelectedStudents(prev =>
      prev.find(s => s.$id === rcpt.$id)
        ? prev.filter(s => s.$id !== rcpt.$id)
        : [...prev, rcpt]
    );
  };

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

      // Update Appwrite with verification and serial number
      await databases.updateDocument(
        Config.dbId,
        Config.submissionsCol,
        rcpt.$id,
        {
          status: "verified",
          serialNumber: nextSerialNumber
        }
      );

      // Remove from 'receipts' (the pending UI)
      setReceipts(prev => prev.filter(item => item.$id !== rcpt.$id));

      // Add to 'selectedStudents' (the verified UI) with serial number
      setSelectedStudents(prev => [...prev, { ...rcpt, status: "verified", serialNumber: nextSerialNumber }]);

    } catch (error) {
      console.error("Verification failed:", error);
    }
  };

  // 2. Professional PDF Generator


  const downloadVerifiedPDF = async (students = null) => {
    setLoading(true);
    try {
      let selectedStudents = students;
      if (!selectedStudents) {
        const res = await databases.listDocuments(Config.dbId, Config.submissionsCol, [
          Query.equal("status", "verified"),
          Query.equal("department", user.department),
          Query.equal("level", user.level),
          Query.limit(500)
        ]);
        selectedStudents = res.documents;
      }

      if (selectedStudents.length === 0) {
        alert("No verified records found in the database.");
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // --- 1. DRAW PAGE BORDER ---
      doc.setDrawColor(20, 158, 136); // Teal Border
      doc.setLineWidth(0.5);
      doc.rect(5, 5, pageWidth - 10, pageHeight - 10);

      // --- 2. LOGO & HEADER ---
      // Minimalist Logo Icon (A teal square with 'C')
      doc.setFillColor(20, 158, 136);
      doc.roundedRect(14, 12, 12, 12, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text("C", 18, 20);

      // Classist Branding
      doc.setTextColor(20, 158, 136);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("CLASSIST", 30, 18);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text("ACADEMIC MANAGEMENT & PAYMENT SYSTEM", 30, 23);

      // --- 3. REPORT TITLE & METADATA ---
      doc.setFontSize(14);
      doc.setTextColor(40);
      doc.setFont("helvetica", "bold");
      doc.text("OFFICIAL PAYMENT CLEARANCE REPORT", 14, 40);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`DEPARTMENT: ${user.department.toUpperCase()}`, 14, 47);
      doc.text(`LEVEL: ${user.level}L`, 14, 52);
      doc.text(`DATE GENERATED: ${new Date().toLocaleDateString()}`, 14, 57);

      // --- 4. DATA TABLE ---
      const tableData = selectedStudents.map((s) => [
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
        headStyles: {
          fillColor: [20, 158, 136],
          fontSize: 10,
          halign: 'center',
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 9,
          cellPadding: 3,
          valign: 'middle'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 },
          2: { fontStyle: 'italic' },
          3: { halign: 'center' },
          4: { halign: 'center', fontStyle: 'bold' }
        }
      });

      // --- 5. SIGNATURE FOOTER ---
      const finalY = doc.lastAutoTable.finalY + 25;
      doc.setDrawColor(200);
      doc.line(14, finalY, 70, finalY);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text("Admin Signature", 14, finalY + 5);
      doc.text(user.name, 14, finalY + 10);

      doc.save(`Classist_Payment_Report_${user.department}.pdf`);

    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("Verification Error: Please ensure jspdf and jspdf-autotable are installed.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Individual Student PDF Generator
  const downloadStudentPDF = async (student) => {
    try {
      const doc = new jsPDF();
      const campFee = 4000;
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // --- 1. DRAW PAGE BORDER ---
      doc.setDrawColor(20, 158, 136); // Teal Border
      doc.setLineWidth(0.5);
      doc.rect(5, 5, pageWidth - 10, pageHeight - 10);

      // --- 2. LOGO & HEADER ---
      // Minimalist Logo Icon (A teal square with 'C')
      doc.setFillColor(20, 158, 136);
      doc.roundedRect(14, 12, 12, 12, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text("C", 18, 20);

      // Classist Branding
      doc.setTextColor(20, 158, 136);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("CLASSIST", 30, 18);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text("ACADEMIC MANAGEMENT & PAYMENT SYSTEM", 30, 23);

      // --- 3. RECEIPT TITLE ---
      doc.setFontSize(16);
      doc.setTextColor(40);
      doc.setFont("helvetica", "bold");
      doc.text("PAYMENT RECEIPT", 14, 40);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Student: ${student.name.toUpperCase()}`, 14, 50);
      doc.text(`Matric No: ${student.matric}`, 14, 57);
      doc.text(`Department: ${user.department.toUpperCase()}`, 14, 64);
      doc.text(`Level: ${user.level}L`, 14, 71);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 78);

      // --- 4. PAYMENT DETAILS TABLE ---
      const tableData = [
        [1, "Camp Fee", `N${campFee.toLocaleString()}`, "VERIFIED"]
      ];

      autoTable(doc, {
        startY: 85,
        head: [['S/N', 'DESCRIPTION', 'AMOUNT', 'STATUS']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [20, 158, 136],
          fontSize: 10,
          halign: 'center',
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 9,
          cellPadding: 5,
          valign: 'middle'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 },
          2: { halign: 'right' },
          3: { halign: 'center', fontStyle: 'bold' }
        }
      });

      // --- 5. SIGNATURE FOOTER ---
      const finalY = doc.lastAutoTable.finalY + 25;
      doc.setDrawColor(200);
      doc.line(14, finalY, 70, finalY);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text("Admin Signature", 14, finalY + 5);
      doc.text(user.name, 14, finalY + 10);

      doc.save(`Receipt_${student.name.replace(/\s+/g, '_')}.pdf`);

    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("Error generating PDF. Please try again.");
    }
  };


  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // --- FETCH LOGIC ---
  useEffect(() => {
    const fetchData = async () => {
      if (!Config.dbId || !Config.profilesCol) return;
      setLoading(true);

      try {
        if (activeContent === "manageStudents") {
          const res = await databases.listDocuments(Config.dbId, Config.profilesCol, [
            Query.equal("school", [user.school]),
            Query.equal("department", [user.department]),
            Query.equal("level", [user.level]),
            Query.orderAsc("full_name"),
          ]);
          setStudents(res.documents);
        }

        if (activeContent === "viewPayment") {
          // 1. Fetch Pending (what you already have)
          const pendingRes = await databases.listDocuments(Config.dbId, Config.submissionsCol, [
            Query.equal("type", "receipt"),
            Query.equal("department", user.department),
            Query.equal("level", user.level),
            Query.notEqual("status", "verified") // Show only those not yet cleared
          ]);
          setReceipts(pendingRes.documents);

          // 2. Fetch already Verified (to show in the bottom table)
          const verifiedRes = await databases.listDocuments(Config.dbId, Config.submissionsCol, [
            Query.equal("status", "verified"),
            Query.equal("department", user.department),
            Query.equal("level", user.level)
          ]);
          setSelectedStudents(verifiedRes.documents);
        }

        if (activeContent === "submission") {
          const assignmentRes = await databases.listDocuments(Config.dbId, Config.submissionsCol, [
            Query.equal("type", "assignment"),
            Query.equal("department", user.department),
            Query.equal("level", user.level),
            Query.orderDesc("$createdAt")
          ]);
          setAssignments(assignmentRes.documents);
        }
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeContent, user]);

  // Helper for profile cards
  function ProfileField({ label, value }) {
    return (
      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
        <p className="text-xs text-gray-400 font-bold uppercase mb-1">{label}</p>
        <p className="text-gray-800 font-semibold">{value || "Not Specified"}</p>
      </div>
    );
  }

  const navItems = [
    { key: "submission", label: "Assignments", icon: BarChart },
    { key: "viewPayment", label: "Payment Receipts", icon: BookOpen },
    { key: "manageStudents", label: "View Students", icon: Users },
    { key: "profile", label: "My Profile", icon: UserCircle },
  ];

  return (
    <>
      <Header />
      {/* Wrapper added pt-14 to prevent content from being hidden under the fixed header */}
      <div className="flex min-h-screen bg-gray-50 pt-14">

        {/* Mobile Toggle - Adjusted top position */}
        <button
          onClick={toggleSidebar}
          className="md:hidden fixed top-[4.5rem] right-4 z-[60] p-3 bg-teal-700 text-white rounded-full shadow-lg transition-transform active:scale-90"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Sidebar - Adjusted top to 14 (3.5rem) to sit perfectly under header */}
        <aside className={`w-64 bg-white border-r p-6 transition-transform z-50 fixed top-14 bottom-0 md:sticky md:top-14 md:h-[calc(100vh-3.5rem)] md:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-teal-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">A</div>
            <h2 className="text-lg font-bold text-gray-800 tracking-tight">Admin Hub</h2>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => (
              <div
                key={item.key}
                onClick={() => { setActiveContent(item.key); setIsSidebarOpen(false); }}
                className={`flex items-center space-x-3 cursor-pointer px-4 py-2.5 rounded-xl transition-all text-sm ${activeContent === item.key ? "bg-teal-50 text-teal-700 font-bold" : "text-gray-500 hover:bg-gray-50"}`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-10">
          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-800">{user.name} Dashboard</h1>
            <p className="text-gray-500 text-sm">Managing {user.level}L Students | {user.school}</p>
          </header>

          {/* VIEW STUDENTS TABLE */}
          {activeContent === "manageStudents" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="flex flex-col items-center justify-center p-20 text-gray-400">
                  <Loader2 className="animate-spin mb-2" size={32} />
                  <p>Fetching class list...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
                      <tr>
                        <th className="px-6 py-4">Student Name</th>
                        <th className="px-6 py-4">Matric No</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {students.map((student) => (
                        <tr key={student.$id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-800">{student.full_name || "Anonymous"}</td>
                          <td className="px-6 py-4 text-gray-600">{student.matricNo || "N/A"}</td>
                          <td className="px-6 py-4"><span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">Active</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* VIEW PAYMENT RECEIPTS */}
          {activeContent === "viewPayment" && (
            <div className="space-y-8 animate-in fade-in duration-500">

              {/* PENDING TABLE */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-amber-50/50 border-b border-amber-100 flex justify-between items-center">
                  <h3 className="text-amber-700 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                    <Clock size={14} /> Inbox: Awaiting Verification ({receipts.length})
                  </h3>
                </div>

                <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                  {receipts.length > 0 ? receipts.map((rcpt) => (
                    <div key={rcpt.$id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        onChange={() => handleStatusToggle(rcpt)}
                        className="w-5 h-5 accent-teal-600 rounded-md cursor-pointer"
                      />
                      <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                        <span className="col-span-5 font-bold text-gray-800 text-sm uppercase">{rcpt.name}</span>
                        <span className="col-span-4 text-gray-400 font-mono text-xs">{rcpt.matric}</span>
                        <span className="col-span-3 text-[10px] font-black text-amber-600 italic">PENDING</span>
                      </div>
                      <button
                        onClick={() => setSelectedImage(storage.getFileView(Config.bucketId, rcpt.fileId))}
                        className="p-2 text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-all"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  )) : (
                    <div className="p-10 text-center text-gray-400 text-sm italic">No pending receipts found.</div>
                  )}
                </div>
              </div>

              {/* VERIFIED SECTION & PDF DOWNLOAD */}
              {selectedStudents.length > 0 && (
                <div className="bg-teal-900 rounded-[2.5rem] p-8 text-white shadow-2xl">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
                    <div>
                      <h3 className="text-2xl font-black">Verified Batch</h3>
                      <p className="text-teal-300/60 text-xs">These students are now cleared in the database.</p>
                    </div>

                    <button
                      onClick={() => downloadVerifiedPDF(selectedForReport.length > 0 ? selectedForReport : null)}
                      className="flex items-center gap-2 px-6 py-3 bg-white text-teal-900 rounded-2xl font-black text-sm hover:scale-105 transition-transform shadow-lg"
                    >
                      <ExternalLink size={18} /> DOWNLOAD REPORT ({selectedForReport.length > 0 ? selectedForReport.length : 'ALL'})
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-[10px] uppercase text-teal-400/50 border-b border-teal-800">
                        <tr>
                          <th className="pb-4">Select</th>
                          <th className="pb-4">S/N</th>
                          <th className="pb-4">Name</th>
                          <th className="pb-4">Matric</th>
                          <th className="pb-4">Course Code</th>
                          <th className="pb-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-teal-800/30">
                        {selectedStudents.map(s => (
                          <tr key={s.$id} className="group">
                            <td className="py-4">
                              <input
                                type="checkbox"
                                checked={selectedForReport.some(sel => sel.$id === s.$id)}
                                onChange={() => toggleReportSelection(s)}
                                className="w-4 h-4 accent-teal-400 rounded cursor-pointer"
                              />
                            </td>
                            <td className="py-4 font-mono text-xs text-teal-400/70">{s.serialNumber}</td>
                            <td className="py-4 font-bold uppercase group-hover:text-teal-300 transition-colors">{s.name}</td>
                            <td className="py-4 font-mono text-xs text-teal-400/70">{s.matric}</td>
                            <td className="py-4 font-mono text-xs text-teal-400/70">{s.code || "GST101"}</td>
                            <td className="py-4 text-right">
                              <span className="bg-teal-400/10 text-teal-400 px-3 py-1 rounded-full text-[10px] font-black">SYNCED</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ASSIGNMENTS SECTION */}
          {activeContent === "submission" && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 bg-blue-50/50 border-b border-blue-100 flex justify-between items-center">
                <h3 className="text-blue-700 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                  <BarChart size={14} /> Assignments Submitted ({assignments.length})
                </h3>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center p-20 text-gray-400">
                  <Loader2 className="animate-spin mb-2" size={32} />
                  <p>Fetching assignments...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold border-b">
                      <tr>
                        <th className="px-6 py-4">Student Name</th>
                        <th className="px-6 py-4">Matric</th>
                        <th className="px-6 py-4">Course Code</th>
                        <th className="px-6 py-4">Submission Date</th>
                        <th className="px-6 py-4 text-right">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {assignments.length > 0 ? assignments.map((assignment) => (
                        <tr key={assignment.$id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-800">{assignment.name}</td>
                          <td className="px-6 py-4 text-gray-600 font-mono text-xs">{assignment.matric}</td>
                          <td className="px-6 py-4 text-gray-600">{assignment.code || "N/A"}</td>
                          <td className="px-6 py-4 text-gray-500 text-xs">{new Date(assignment.$createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-right">
                            {assignment.fileId && (
                              <button
                                onClick={() => setSelectedImage(storage.getFileView(Config.bucketId, assignment.fileId))}
                                className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all"
                              >
                                <Eye size={18} />
                              </button>
                            )}
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="5" className="px-6 py-10 text-center text-gray-400 text-sm italic">No assignments submitted yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* PROFILE SECTION */}
        {activeContent === "profile" && (
  <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    
    {/* 1. Profile Identity Card */}
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
      <div className="h-32 bg-gradient-to-r from-teal-600 to-teal-900" />
      <div className="px-8 pb-8 -mt-12">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-6 mb-10">
          <div className="w-28 h-28 bg-white p-1.5 rounded-[2rem] shadow-xl">
            <div className="w-full h-full bg-teal-50 rounded-[1.5rem] flex items-center justify-center text-teal-700">
              <UserCircle size={56} />
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-black text-gray-800">{user.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${user.isOnboarded ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {user.isOnboarded ? "✓ Verified Merchant" : "⚠ Action Required: Onboarding"}
              </span>
              <span className="text-gray-400 text-xs font-medium">| {user.department} Admin</span>
            </div>
          </div>
        </div>

        {/* 2. Basic Info Grid (Read Only) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <ProfileField label="Institution" value={user.school} />
          <ProfileField label="Management Level" value={`${user.level} Level`} />
          <ProfileField label="Email Address" value={user.email} />
          <ProfileField label="Faculty" value={user.faculty} />
        </div>

        {/* 3. Financial Configuration (The Onboarding Form) */}
        <div className="bg-gray-50 rounded-[2.5rem] p-6 md:p-10 border border-gray-100">
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
               Payout Settings
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              {user.isOnboarded 
                ? "Your bank account is locked for security. Update your manual price below." 
                : "Link your bank details once to receive automated student payments."}
            </p>
          </div>

          <form onSubmit={handleOnboarding} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Account Number */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase ml-2">Account Number</label>
              <input 
                disabled={user.isOnboarded}
                required
                type="text"
                maxLength={10}
                className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 ring-teal-500/10 outline-none transition-all font-mono disabled:bg-gray-100 disabled:text-gray-400"
                placeholder="0123456789"
                value={onboardingData.account_number}
                onChange={(e) => setOnboardingData({...onboardingData, account_number: e.target.value})}
              />
            </div>

           <div className="space-y-2">
  <label className="text-xs font-black text-gray-400 uppercase ml-2">Select Bank</label>
  <select 
    disabled={user.isOnboarded}
    required
    className="w-full p-4 bg-white border border-gray-200 rounded-2xl font-sans outline-none focus:ring-2 ring-teal-500"
    value={onboardingData.bank_code}
    onChange={(e) => setOnboardingData({...onboardingData, bank_code: e.target.value})}
  >
    <option value="">Choose your bank...</option>
    <option value="999992">OPay</option>
    <option value="999991">PalmPay</option>
    <option value="033">UBA (United Bank for Africa)</option>
    <option value="058">GTBank</option>
    <option value="044">Access Bank</option>
    <option value="011">First Bank</option>
    <option value="057">Zenith Bank</option>
    <option value="090267">Kuda Bank</option>
  </select>
</div>

            {/* Manual Price */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-black text-gray-400 uppercase ml-2">Price per Manual (₦)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">₦</span>
                <input 
                  required
                  type="number"
                  className="w-full p-4 pl-10 bg-white border border-gray-200 rounded-2xl focus:ring-4 ring-teal-500/10 outline-none transition-all font-black text-teal-700 text-lg"
                  placeholder="2500"
                  value={onboardingData.manual_price}
                  onChange={(e) => setOnboardingData({...onboardingData, manual_price: e.target.value})}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={loading}
              className="md:col-span-2 mt-4 p-5 bg-teal-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-teal-800 hover:shadow-xl hover:shadow-teal-900/20 active:scale-[0.98] transition-all disabled:bg-gray-300"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <CheckCircle size={20} />
              )}
              {user.isOnboarded ? "Save Changes" : "Complete Onboarding"}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
)}
        </main>
      </div>

      {/* --- IMAGE LIGHTBOX POPUP --- */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 md:p-10">
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-10 right-10 text-white hover:text-teal-400 transition-colors"
          >
            <X size={40} />
          </button>

          <img
            src={selectedImage}
            alt="Receipt"
            className="max-w-full max-h-full rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
          />

          <div className="absolute bottom-10 flex gap-4">
            <a
              href={selectedImage}
              target="_blank"
              className="px-6 py-3 bg-white rounded-full font-bold flex items-center gap-2 hover:bg-teal-50"
            >
              <ExternalLink size={20} /> Open in New Tab
            </a>
          </div>
        </div>
      )}
    </>
  );
}