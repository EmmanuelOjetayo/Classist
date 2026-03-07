import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
// Added Eye and EyeOff icons
import { LogIn as LogInIcon, Loader2, Eye, EyeOff } from "lucide-react";
import { account } from "../backend/appwrite";

const Login = ({ onAuthSuccess }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  // State for password visibility
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const [dialog, setDialog] = useState({ open: false, msg: "", type: "success" });

  useEffect(() => {
    if (dialog.open) {
      const timer = setTimeout(() => {
        setDialog((prev) => ({ ...prev, open: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [dialog.open]);

const onSubmit = async (data) => {
  setLoading(true);
  const { identifier, password } = data;

  try {
    // 1. Clear old session
    try { await account.deleteSession('current'); } catch (e) {}

    // 2. Create the new session in Appwrite Auth
    await account.createEmailPasswordSession(identifier, password);

    // 3. CALL THE PROP: This runs fetchUser in App.jsx
    // This is the "onAuthSuccess" you just added to the function arguments above
    const verifiedUser = await onAuthSuccess();

    if (verifiedUser) {
      setDialog({
        open: true,
        msg: "Login successful! Redirecting...",
        type: "success",
      });

      // 4. Navigate based on the role we just fetched
      setTimeout(() => {
        if (verifiedUser.role === 'superAdmin') navigate("/superAdmin");
        else if (verifiedUser.role === 'admin') navigate("/admin");
        else navigate("/student");
      }, 1500);
    }
  } catch (error) {
    setDialog({
      open: true,
      msg: error.message || "Login failed.",
      type: "error",
    });
  } finally {
    setLoading(false);
  }
};
  const FormField = ({ label, name, children }) => (
    <div className="flex flex-col">
      <label htmlFor={name} className="text-sm font-medium text-teal-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 sm:p-10 w-full max-w-md rounded-xl shadow-2xl">
        
        <div className="flex justify-center mb-6">
          <LogInIcon size={48} className="text-amber-500" />
        </div>

        <h2 className="text-3xl font-extrabold text-teal-700 mb-8 text-center">
          Classist Login
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormField label="Email Address *" name="identifier">
            <input
              type="email"
              className="p-3 border rounded-lg focus:ring-2 ring-teal-500 outline-none w-full"
              placeholder="your@email.com"
              {...register("identifier", { required: "Email is required" })}
            />
            {errors.identifier && <p className="text-red-500 text-xs mt-1">{errors.identifier.message}</p>}
          </FormField>

          <FormField label="Password *" name="password">
            {/* Added relative container for the icon */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="p-3 border rounded-lg focus:ring-2 ring-teal-500 outline-none w-full pr-10"
                placeholder="••••••••"
                {...register("password", { required: "Password is required" })}
              />
              {/* Toggle Button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-teal-600 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </FormField>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 py-3 rounded-xl font-bold hover:bg-amber-600 transition text-white disabled:opacity-50"
          >
            <span className="flex items-center justify-center">
              {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : <LogInIcon size={20} className="mr-2" />}
              Proceed to Dashboard
            </span>
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-500">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-emerald-800 font-bold underline">Signup here</Link>
        </p>
      </div>

      {dialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4">
            <h2 className={`text-xl font-bold mb-2 ${dialog.type === "error" ? "text-red-600" : "text-emerald-600"}`}>
              {dialog.type === "error" ? "Login Failed" : "Success"}
            </h2>
            <p className="text-gray-700">{dialog.msg}</p>
            <p className="text-xs text-gray-400 mt-3">Closing automatically...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;