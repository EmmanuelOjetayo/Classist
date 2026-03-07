import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { account, databases, ID, Config } from "../backend/appwrite";
import { 
  ChevronRight, Loader2, School, GraduationCap, 
  BookOpen, Phone, Mail, Lock, User, 
  CheckCircle2, Eye, EyeOff 
} from "lucide-react";
import Swal from "sweetalert2";

const UNIVERSITY_DATA = {
  LAUTECH: { faculties: { "Engineering & Tech": ["Computer Science", "Mechanical Engineering"], "Pure & Applied Sciences": ["Biology", "Physics"], "Management Sciences": ["Accounting"] } },
  UNILAG: { faculties: { "Arts": ["English", "History"], "Engineering": ["Systems Engineering"], "Social Sciences": ["Economics"] } },
  UI: { faculties: { "Agriculture": ["Agronomy"], "Technology": ["Mechanical Engineering"], "Law": ["Public Law"] } },
  OAU: { faculties: { "Technology": ["Computer Engineering"], "Administration": ["International Relations"] } }
};

const FormField = ({ label, icon: Icon, children, error, className = "" }) => (
  <div className={`flex flex-col space-y-1 ${className}`}>
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 ml-1">
      <div className="w-3 h-3 flex items-center justify-center">
        {Icon && <Icon size={12} className="text-teal-600" />}
      </div>
      {label}
    </label>
    <div className="relative">{children}</div>
    {error && <span className="text-[10px] text-red-500 font-medium ml-1">{error.message}</span>}
  </div>
);

const SignUp = () => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Watch fields for conditional logic
  const selectedSchool = watch("school");
  const selectedFaculty = watch("faculty");
  const password = watch("password");

  const faculties = selectedSchool && UNIVERSITY_DATA[selectedSchool] ? Object.keys(UNIVERSITY_DATA[selectedSchool].faculties) : [];
  const departments = selectedSchool && selectedFaculty && UNIVERSITY_DATA[selectedSchool].faculties[selectedFaculty] ? UNIVERSITY_DATA[selectedSchool].faculties[selectedFaculty] : [];

  const onSubmit = async (data) => {
    setLoading(true);
    const full_name = `${data.surname} ${data.firstName} ${data.middleName}`.trim();
    try {
      const userAccount = await account.create(ID.unique(), data.email, data.password, full_name);
      await databases.createDocument(Config.dbId, Config.profilesCol, userAccount.$id, {
        user_id: userAccount.$id,
        full_name,
        matric_number: data.matric_number,
        school_name: data.school,
        faculty: data.faculty,
        department: data.department,
        level: String(data.level),
        phone: data.phone
      });

      Swal.fire({
        icon: 'success',
        title: 'Registration Successful',
        text: 'Welcome to Classist!',
        confirmButtonColor: '#0f766e',
        timer: 2000
      });
      
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Registration Failed', text: error.message, confirmButtonColor: '#0f766e' });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 outline-none transition-all text-sm text-slate-800 placeholder:text-slate-400";

  return (
    <div className="h-screen bg-slate-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden font-sans">
      <div className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] overflow-hidden max-w-5xl w-full flex flex-col md:flex-row max-h-[95vh] border border-slate-100">
        
        {/* Sidebar */}
        <div className="bg-teal-800 md:w-1/3 p-8 text-white flex flex-col justify-between hidden md:flex">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center">
                <BookOpen size={18} className="text-teal-900" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white">Classist.</h2>
            </div>
            <p className="text-teal-100/70 text-sm leading-relaxed">The unified platform for modern student management.</p>
          </div>

          <div className="space-y-5">
            {[
              { t: "Verified Identity", d: "Secure academic profiles" },
              { t: "Instant Sync", d: "Connect with your department" }
            ].map((item, i) => (
              <div key={i} className="flex gap-3">
                <div className="mt-1 bg-white/10 p-1 rounded-md h-fit">
                  <CheckCircle2 size={14} className="text-amber-400" />
                </div>
                <div>
                  <p className="font-bold text-sm text-white">{item.t}</p>
                  <p className="text-xs text-teal-200/60">{item.d}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-6 border-t border-teal-700/50">
            <p className="text-teal-400 text-[10px] font-mono uppercase tracking-widest">System Node: v2.0.4</p>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 md:p-10 flex-1 overflow-y-auto">
          <header className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Create Account</h2>
            <p className="text-slate-400 text-xs">Enter your details to join your campus network.</p>
          </header>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Identity Group */}
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Surname" icon={User} error={errors.surname}>
                <input {...register("surname", { required: "Required" })} placeholder="Smith" className={inputClass} />
              </FormField>
              <FormField label="First Name" icon={User} error={errors.firstName}>
                <input {...register("firstName", { required: "Required" })} placeholder="Alex" className={inputClass} />
              </FormField>
              <FormField label="Middle Name" icon={User} error={errors.middleName}>
                <input {...register("middleName")} placeholder="John" className={inputClass} />
              </FormField>
            </div>

            {/* Academic Group */}
            <div className="space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <FormField label="University" icon={School} error={errors.school}>
                <select {...register("school", { required: "Required" })} className={inputClass}>
                  <option value="">Choose Institution</option>
                  {Object.keys(UNIVERSITY_DATA).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Faculty" icon={GraduationCap} error={errors.faculty}>
                  <select {...register("faculty", { required: "Required" })} disabled={!selectedSchool} className={inputClass}>
                    <option value="">Select Faculty</option>
                    {faculties.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </FormField>
                <FormField label="Department" icon={BookOpen} error={errors.department}>
                  <select {...register("department", { required: "Required" })} disabled={!selectedFaculty} className={inputClass}>
                    <option value="">Select Dept</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Matric Number" error={errors.matric_number}>
                  <input {...register("matric_number", { required: "Required" })} placeholder="20/1234" className={inputClass} />
                </FormField>
                <FormField label="Current Level" error={errors.level}>
                  <select {...register("level", { required: "Required" })} className={inputClass}>
                    <option value="">Level</option>
                    {[100, 200, 300, 400, 500].map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                  </select>
                </FormField>
              </div>
            </div>

            {/* Contact & Security Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Email Address" icon={Mail} error={errors.email}>
                <input type="email" {...register("email", { required: "Invalid email" })} placeholder="alex@school.edu.ng" className={inputClass} />
              </FormField>
              <FormField label="Phone" icon={Phone} error={errors.phone}>
                <input {...register("phone", { required: "Required" })} placeholder="080..." className={inputClass} />
              </FormField>
              
              {/* PASSWORD FIELDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:col-span-2">
                <FormField label="Password" icon={Lock} error={errors.password}>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      {...register("password", { required: "Min 8 chars", minLength: 8 })} 
                      className={inputClass} 
                      placeholder="••••••••"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </FormField>

                <FormField label="Confirm Password" icon={CheckCircle2} error={errors.confirmPassword}>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      {...register("confirmPassword", { 
                        required: "Please confirm",
                        validate: (val) => val === password || "Passwords do not match"
                      })} 
                      className={inputClass} 
                      placeholder="••••••••"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </FormField>
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-900/10 disabled:opacity-50 active:scale-[0.99]"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <>Create Account <ChevronRight size={18} /></>}
            </button>
          </form>

          <footer className="mt-8 text-center">
            <p className="text-slate-500 text-xs font-medium">
              Existing user? <Link to="/login" className="text-teal-700 font-bold hover:text-teal-900 underline underline-offset-4">Sign into portal</Link>
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default SignUp;