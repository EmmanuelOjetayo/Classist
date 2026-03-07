import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Zap, Lightbulb, TrendingUp, CheckCircle, BookOpen, Send, Bell, Users } from 'lucide-react';
import logo from "../assets/logo.png";

const Home = () => {
  const visionMissionImageUrl = "https://images.unsplash.com/photo-1581472723648-52316e6d7821?q=80&w=2070&auto=format&fit=crop";
  const solutionsImageUrl = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop";

  const features = [
    { title: "Centralized Submissions", description: "Never miss a deadline. All assignments in one place.", icon: Zap },
    { title: "Digital Payment Receipts", description: "Effortlessly track and verify all manual payments.", icon: CheckCircle },
    { title: "Unified Academic Hub", description: "Access all your course info and updates centrally.", icon: Lightbulb },
    { title: "Smart Attendance Tracking", description: "Reliable, transparent, and easy management.", icon: TrendingUp },
  ];

  const steps = [
    { title: "Sign Up", description: "Create your student profile and get verified.", icon: Users },
    { title: "Explore", description: "View all your registered courses and activities.", icon: BookOpen },
    { title: "Engage", description: "Submit assignments and track your progress.", icon: Send },
    { title: "Stay Updated", description: "Receive real-time notifications for everything.", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans overflow-x-hidden">
      
      {/* RESPONSIVE NAVBAR */}
      <nav className="bg-white shadow-md px-4 md:px-6 py-3 flex justify-between items-center z-50 sticky top-0">
        <div className="flex items-center space-x-2">
          <img src={logo} alt="Classist Logo" className="h-8 w-8 md:h-10 md:w-10 rounded-lg object-cover" />
          <span className="text-xl md:text-2xl font-bold text-teal-700 tracking-tight">Classist</span>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4">
          <Link to="/login">
            <button className="bg-teal-700 text-white px-4 md:px-6 py-2 text-sm md:text-base font-medium rounded-full hover:bg-teal-800 transition-all">
              Login
            </button>
          </Link>
          <Link to="/signup">
            <button className="bg-amber-500 text-white px-4 md:px-6 py-2 text-sm md:text-base font-medium rounded-full hover:bg-amber-600 transition-all">
              Signup
            </button>
          </Link>
        </div>
      </nav>

      {/* 1. HERO SECTION */}
      <section 
        className="relative bg-cover bg-center h-[80vh] md:h-[75vh] flex items-center justify-center text-white px-4"
        style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url(${visionMissionImageUrl})` }}
      >
        <div className="text-center max-w-4xl animate-slideUp">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
            Your Academic Life, <span className="text-amber-400">Simplified.</span>
          </h1>
          <p className="text-lg md:text-2xl mb-10 font-light max-w-2xl mx-auto text-gray-200">
            A student-managed platform to streamline activities, boost collaboration, and end the academic chaos.
          </p>
          <Link 
            to="/signup" 
            className="inline-flex items-center justify-center bg-amber-500 text-white font-bold px-8 md:px-10 py-4 text-base md:text-lg rounded-full hover:bg-amber-400 transform hover:scale-105 transition-all shadow-xl no-underline"
          >
            Get Started Today <ChevronRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* 2. PROBLEMS SECTION */}
      <section className="py-16 md:py-24 bg-white px-4">
        <div className="container mx-auto text-center max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-teal-700">
            Tired of the Academic Maze?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10">
            {[
              { title: "Disorganized", icon: '🚫', desc: "Assignments scattered everywhere, missing deadlines easily." },
              { title: "Receipt Hassles", icon: '🧾', desc: "Lost paper receipts, no clear record of manual payments." },
              { title: "Scattered Info", icon: '🧩', desc: "No single platform for all academic announcements." },
              { title: "Attendance", icon: '✍️', desc: "Inaccurate tracking and disputes over class presence." },
            ].map((problem, index) => (
              <div 
                key={index} 
                className="bg-gray-50 p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all"
              >
                <div className="text-4xl md:text-5xl mb-4">{problem.icon}</div>
                <h3 className="text-lg md:text-xl font-semibold mb-3 text-teal-600">{problem.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{problem.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. SOLUTIONS SECTION */}
      <section className="py-16 md:py-20 bg-teal-700 text-white px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 md:mb-16 text-center text-amber-300">
            Your Unified Academic Solution
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
            <div className="space-y-8 md:space-y-10">
              {features.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <div key={index} className="flex items-start space-x-4 md:space-x-5">
                    <div className="flex-shrink-0 bg-white p-3 rounded-2xl text-teal-700 shadow-lg">
                      <IconComponent size={24} className="md:w-[28px] md:h-[28px]" />
                    </div>
                    <div>
                      <h3 className="text-xl md:text-2xl font-semibold mb-2">{feature.title}</h3>
                      <p className="text-teal-50 text-sm md:text-base">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="hidden md:block">
              <img 
                src={solutionsImageUrl} 
                alt="Workspace" 
                className="rounded-3xl shadow-2xl w-full object-cover border-4 border-teal-600/50" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. STEPS SECTION */}
      <section className="py-16 md:py-20 bg-gray-50 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 md:mb-16 text-teal-700">How Classist Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              return (
                <div key={index} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm hover:shadow-md transition-all">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <IconComponent size={24} className="md:w-[28px] md:h-[28px]" />
                  </div>
                  <h3 className="font-bold text-base md:text-lg mb-2 text-teal-800">{step.title}</h3>
                  <p className="text-gray-500 text-xs md:text-sm">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-teal-900 text-gray-300 py-10 md:py-12 px-4 text-center">
        <div className="flex justify-center items-center space-x-3 mb-6">
          <img src={logo} alt="Logo" className="h-6 w-6 md:h-8 md:w-8 grayscale opacity-50" />
          <span className="text-lg md:text-xl font-bold text-white">Classist</span>
        </div>
        <p className="max-w-md mx-auto mb-6 text-sm md:text-base text-teal-200/60 px-4">
          Empowering students through better organization and communication.
        </p>
        <div className="border-t border-teal-800 pt-8 text-xs md:text-sm">
          &copy; {new Date().getFullYear()} Classist. All rights reserved.
        </div>
      </footer>

      {/* ANIMATIONS */}
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.8s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default Home;