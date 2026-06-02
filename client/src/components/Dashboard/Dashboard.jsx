import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserCog,
  BookOpen,
  TrendingUp,
  Plus,
  Calendar,
  AlertCircle,
  Folder,
  X,
  Save,
  UserPlus,
  GraduationCap,
  Clock,
  Trash2,
  BarChart3,
  FileText,
  Clock4,
  Award,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "framer-motion";
import SkeletonLoading from "../Common/SkeletonLoading";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// Create a mapping of icon names to components
const iconMap = {
  Users,
  UserCog,
  BookOpen,
  TrendingUp,
  Plus,
  Calendar,
  AlertCircle,
  Folder,
  X,
  Save,
  UserPlus,
  GraduationCap,
  Clock,
  Trash2,
  BarChart3,
  FileText,
  Clock4,
  Award,
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    courses: 0,
    attendance: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [myGrades, setMyGrades] = useState({ grades: [], gpa: "0.00" });
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [enrollmentTrend, setEnrollmentTrend] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  // Custom popup states
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("success");

  // Track if we've loaded from localStorage
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);

  const [newStudent, setNewStudent] = useState({
    name: "",
    email: "",
    password: "",
    grade: "",
    dateOfBirth: "",
    parentName: "",
    parentContact: "",
    emergencyContact: "",
    course: "",
    department: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
    },
  });

  const [newTeacher, setNewTeacher] = useState({
    name: "",
    email: "",
    password: "",
  });

  // Load activities and data based on user role
  useEffect(() => {
    fetchDashboardData();

    // Load role-specific data
    if (user?.role === "admin") {
      fetchStudents();
      fetchTeachers();
      fetchEnrollmentTrend();
      fetchRecentActivity();
    } else if (user?.role === "teacher") {
      fetchTeacherCourses();
      fetchTeacherSchedule();
    } else if (user?.role === "student") {
      fetchStudentCourses();
      fetchStudentGrades();
      fetchStudentSchedule();
    }
  }, [user?.role]);

  // Custom popup function
  const showCustomPopup = (message, type = "success") => {
    setPopupMessage(message);
    setPopupType(type);
    setShowPopup(true);

    setTimeout(() => {
      setShowPopup(false);
    }, 3000);
  };

  // Get icon name for type (for storage)
  const getIconNameForType = (type) => {
    switch (type) {
      case "student_added":
        return "UserPlus";
      case "teacher_added":
        return "UserCog";
      case "student_deleted":
        return "Users";
      case "teacher_deleted":
        return "UserCog";
      case "login":
        return "GraduationCap";
      default:
        return "Clock";
    }
  };

  // Get color for type
  const getActivityColor = (type) => {
    switch (type) {
      case "student_added":
        return "text-green-500";
      case "teacher_added":
        return "text-blue-500";
      case "student_deleted":
        return "text-red-500";
      case "teacher_deleted":
        return "text-red-500";
      case "login":
        return "text-purple-500";
      default:
        return "text-gray-500";
    }
  };

  // Remove activity from recent activity
  const removeActivity = (activityId) => {
    setRecentActivity((prev) =>
      prev.filter((activity) => activity.id !== activityId),
    );
    showCustomPopup("Activity removed", "success");
  };

  // Clear all activities
  const clearAllActivities = () => {
    if (recentActivity.length > 0) {
      setRecentActivity([]);
      showCustomPopup("All activities cleared", "success");
    }
  };

  const fetchEnrollmentTrend = async () => {
    try {
      const response = await axios.get("/dashboard/enrollment-trend");
      const data = response.data?.data || [];
      setEnrollmentTrend(data);
    } catch (error) {
      console.error("Error fetching enrollment trend:", error);
      setEnrollmentTrend([]);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await axios.get("/dashboard/recent-activity");
      const dbActivities = response.data?.data || [];

      const parsedActivities = dbActivities.map((activity) => ({
        id: activity._id,
        type: activity.type,
        description: activity.description,
        user: activity.user,
        timestamp: new Date(activity.createdAt),
        iconName: getIconNameForType(activity.type),
        color: getActivityColor(activity.type),
      }));

      setRecentActivity(parsedActivities);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      setRecentActivity([]);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get("/dashboard");

      if (response.data && response.data.data) {
        setStats(response.data.data);
      } else if (response.data) {
        setStats(response.data);
      } else {
        setStats({ students: 0, teachers: 0, courses: 0, attendance: 0 });
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load dashboard data");
      setStats({ students: 0, teachers: 0, courses: 0, attendance: 0 });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await axios.get("/students");
      setStudents(response.data.data || []);
    } catch (error) {
      console.error("Error fetching students:", error);
      setStudents([]);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await axios.get("/teachers");
      setTeachers(response.data || []);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      setTeachers([]);
    }
  };

  const fetchTeacherCourses = async () => {
    try {
      const response = await axios.get("/courses/teacher-courses");

      // Handle both response formats
      if (response.data && response.data.success !== false) {
        const courses = response.data.data || response.data || [];
        setMyCourses(Array.isArray(courses) ? courses : []);
      } else {
        console.warn(
          "fetchTeacherCourses: response indicated failure",
          response.data,
        );
        // If API returned a message, show it but don't treat as fatal error
        setMyCourses(response.data?.data || []);
      }
    } catch (error) {
      console.error("Error fetching teacher courses:", error);
      console.error("Error response:", error.response?.data);

      // Set empty array instead of undefined
      setMyCourses([]);
      // Show a helpful message to the user when the request fails
      showCustomPopup(
        "Unable to load your courses. Please check your connection or contact the administrator.",
        "error",
      );
    }
  };
  const fetchStudentCourses = async () => {
    try {
      const response = await axios.get("/courses/my-courses");
      setMyCourses(response.data.data || []);
    } catch (error) {
      console.error("Error fetching student courses:", error);
      setMyCourses([]);
    }
  };

  const fetchStudentGrades = async () => {
    try {
      const response = await axios.get("/grades/my-grades");
      setMyGrades(response.data.data || { grades: [], gpa: "0.00" });
    } catch (error) {
      console.error("Error fetching student grades:", error);
      setMyGrades({ grades: [], gpa: "0.00" });
    }
  };

  const fetchTeacherSchedule = async () => {
    try {
      const response = await axios.get("/schedule");
      setUpcomingClasses(response.data.data || []);
    } catch (error) {
      console.error("Error fetching teacher schedule:", error);
      setUpcomingClasses([]);
    }
  };

  const fetchStudentSchedule = async () => {
    try {
      const response = await axios.get("/schedule");
      setUpcomingClasses(response.data.data || []);
    } catch (error) {
      console.error("Error fetching student schedule:", error);
      setUpcomingClasses([]);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();

    const cleanedStudent = {
      ...newStudent,
      name: newStudent.name.trim(),
      email: newStudent.email.trim().toLowerCase(),
      password: newStudent.password,
      grade: newStudent.grade.trim(),
      dateOfBirth: newStudent.dateOfBirth,
      parentName: newStudent.parentName.trim(),
      parentContact: newStudent.parentContact.trim(),
      emergencyContact: newStudent.emergencyContact.trim(),
      course: newStudent.course.trim(),
      department: newStudent.department.trim(),
      address: {
        street: newStudent.address.street.trim(),
        city: newStudent.address.city.trim(),
        state: newStudent.address.state.trim(),
        zipCode: newStudent.address.zipCode.trim(),
      },
    };

    if (
      !cleanedStudent.name ||
      !cleanedStudent.email ||
      !cleanedStudent.password ||
      !cleanedStudent.grade ||
      !cleanedStudent.parentName ||
      !cleanedStudent.parentContact
    ) {
      showCustomPopup(
        "Please fill all required fields (marked with *)",
        "error",
      );
      return;
    }

    if (cleanedStudent.password.length < 6) {
      showCustomPopup("Password must be at least 6 characters long", "error");
      return;
    }

    try {
      const studentData = {
        name: cleanedStudent.name,
        email: cleanedStudent.email,
        password: cleanedStudent.password,
        grade: cleanedStudent.grade,
        dateOfBirth:
          cleanedStudent.dateOfBirth || new Date().toISOString().split("T")[0],
        parentName: cleanedStudent.parentName,
        parentContact: cleanedStudent.parentContact,
        emergencyContact:
          cleanedStudent.emergencyContact || cleanedStudent.parentContact,
        course: cleanedStudent.course,
        department: cleanedStudent.department,
        address: cleanedStudent.address,
      };

      const response = await axios.post("/students/register", studentData);

      if (response.data.success) {
        setNewStudent({
          name: "",
          email: "",
          password: "",
          grade: "",
          dateOfBirth: "",
          parentName: "",
          parentContact: "",
          emergencyContact: "",
          course: "",
          department: "",
          address: { street: "", city: "", state: "", zipCode: "" },
        });

        addActivity(
          "student_added",
          `Added new student: ${newStudent.name}`,
          newStudent.name,
        );

        await Promise.all([fetchStudents(), fetchDashboardData()]);
        showCustomPopup("Student added successfully!", "success");
      }
    } catch (error) {
      if (
        error.response?.data?.errors &&
        error.response.data.errors.length > 0
      ) {
        const validationError = error.response.data.errors[0];
        showCustomPopup(
          `Validation Error: ${validationError.msg} (field: ${validationError.path || validationError.param || "unknown"})`,
          "error",
        );
      } else {
        const errorMessage =
          error.response?.data?.message || "Failed to add student";
        showCustomPopup(`Error: ${errorMessage}`, "error");
      }
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();

    if (!newTeacher.name || !newTeacher.email || !newTeacher.password) {
      showCustomPopup("Please fill all required fields", "error");
      return;
    }

    if (newTeacher.password.length < 6) {
      showCustomPopup("Password must be at least 6 characters long", "error");
      return;
    }

    try {
      await axios.post("/teachers", newTeacher);

      addActivity(
        "teacher_added",
        `Added new teacher: ${newTeacher.name}`,
        newTeacher.name,
      );

      await Promise.all([fetchTeachers(), fetchDashboardData()]);
      setNewTeacher({ name: "", email: "", password: "" });
      showCustomPopup("Teacher added successfully!", "success");
    } catch (error) {
      console.error("Error adding teacher:", error);
      showCustomPopup("Failed to add teacher", "error");
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - activityTime) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return activityTime.toLocaleDateString();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("address.")) {
      const addressField = name.split(".")[1];
      setNewStudent((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else {
      setNewStudent((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleInputChange2 = (e) => {
    const { name, value } = e.target;
    setNewTeacher((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const gradeOptions = [
    "Remedial",
    "1st Year Degree",
    "2nd Year Degree",
    "3rd Year Degree",
    "4th Year Degree",
    "5th Year Degree",
    "1st-3rd Year Diploma",
  ];

  // Stat Card Components
  const AdminStatCard = ({ icon: Icon, title, value, change, color }) => (
    <div className="card group hover:shadow-md transition-shadow font-saira">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {loading ? "..." : value}
          </p>
          {change && (
            <p
              className={`text-sm ${change > 0 ? "text-green-600" : "text-red-600"
                } mt-1`}
            >
              {change > 0 ? "+" : ""}
              {change}% from last month
            </p>
          )}
        </div>
        <div
          className={`p-3 rounded-lg ${color} group-hover:scale-110 transition-transform`}
        >
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );

  const TeacherStatCard = ({ icon: Icon, title, value, subtitle, color }) => (
    <div className="card group hover:shadow-md transition-shadow font-saira">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={`p-3 rounded-lg ${color} group-hover:scale-110 transition-transform`}
        >
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );

  const StudentStatCard = ({ icon: Icon, title, value, subtitle, color }) => (
    <div className="card group hover:shadow-md transition-shadow font-saira">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={`p-3 rounded-lg ${color} group-hover:scale-110 transition-transform`}
        >
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );

  const ActivityItem = ({ activity }) => {
    const IconComponent = iconMap[activity.iconName] || Clock;

    return (
      <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors group">
        <div
          className={`p-2 rounded-full bg-gray-100 dark:bg-gray-600 ${activity.color}`}
        >
          <IconComponent size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {activity.description}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formatTime(activity.timestamp)}
          </p>
        </div>
        <button
          onClick={() => removeActivity(activity.id)}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all duration-200 cursor-pointer"
          title="Remove activity"
        >
          <X size={14} />
        </button>
      </div>
    );
  };

  // Role-specific dashboard render functions
  const renderAdminDashboard = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminStatCard
          icon={Users}
          title="Total Students"
          value={stats.students || 0}
          color="bg-linear-to-br from-blue-400 to-blue-600"
        />
        <AdminStatCard
          icon={UserCog}
          title="Faculty Members"
          value={stats.teachers || 0}
          color="bg-linear-to-br from-green-400 to-green-600"
        />
        <AdminStatCard
          icon={BookOpen}
          title="Courses"
          value={stats.courses || 0}
          color="bg-linear-to-br from-purple-400 to-purple-600"
        />
        <AdminStatCard
          icon={TrendingUp}
          title="Attendance Rate"
          value={`${stats.attendance || 0}%`}
          color="bg-linear-to-br from-orange-400 to-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                <BarChart3 className="inline" /> Enrollment Growth
              </h2>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Last 12 months
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: 300,
                minHeight: 300,
                minWidth: 0,
              }}
            >
              {enrollmentTrend.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                  No enrollment data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300} minHeight={300}>
                  <BarChart
                    data={enrollmentTrend}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis
                      dataKey="name"
                      stroke="#8884d8"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      stroke="#8884d8"
                      allowDecimals={false}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(59,130,246,0.05)" }}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                      }}
                      formatter={(value) => [`${value} students`, "Enrolled"]}
                    />
                    <Bar
                      dataKey="students"
                      fill="#3B82F6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="card shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Recent Activity
              </h2>
              {recentActivity.length > 0 && (
                <button
                  onClick={clearAllActivities}
                  className="text-sm text-red-500 hover:text-red-700 flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Clear All</span>
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="card shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-md self-start">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <button
              className="w-full btn btn-primary flex items-center justify-center space-x-2"
              onClick={() => navigate("/students")}
            >
              <Users size={18} />
              <span>Add Student</span>
            </button>
            <button
              className="w-full btn btn-secondary flex items-center justify-center space-x-2"
              onClick={() => navigate("/teachers")}
            >
              <UserCog size={18} />
              <span>Add Faculty</span>
            </button>

            <button
              className="w-full btn btn-secondary flex items-center justify-center space-x-2"
              onClick={() => navigate("/courses")}
            >
              <BookOpen size={18} />
              <span>Create Course</span>
            </button>
            <button className="w-full btn btn-secondary flex items-center justify-center space-x-2">
              <BarChart3 size={18} />
              <span>Generate Reports</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );

  const renderTeacherDashboard = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <TeacherStatCard
          icon={BookOpen}
          title="My Courses"
          value={myCourses.length}
          subtitle={`${myCourses.length} active courses`}
          color="bg-blue-500"
        />
        <TeacherStatCard
          icon={Users}
          title="Total Students"
          value={stats.students || 0}
          subtitle="Across all courses"
          color="bg-green-500"
        />
        <TeacherStatCard
          icon={FileText}
          title="Assignments Due"
          value={stats.assignments || 0}
          subtitle="This week"
          color="bg-orange-500"
        />
        <TeacherStatCard
          icon={Clock4}
          title="Next Class"
          value={upcomingClasses.length > 0 ? "Today" : "None"}
          subtitle={
            upcomingClasses.length > 0
              ? upcomingClasses[0]?.title
              : "No classes scheduled"
          }
          color="bg-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            My Courses
          </h2>
          <div className="space-y-4">
            {myCourses.length > 0 ? (
              myCourses.map((course) => (
                <div
                  key={course._id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {course.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {course.code} • {course.enrolledStudents?.length || 0}{" "}
                      students
                    </p>
                  </div>
                  <button className="btn btn-secondary text-sm">Manage</button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No courses assigned</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button className="w-full btn btn-primary flex items-center justify-center space-x-2">
                <BookOpen size={18} />
                <span>Manage Grades</span>
              </button>

              <button className="w-full btn btn-secondary flex items-center justify-center space-x-2">
                <FileText size={18} />
                <span>Create Assignment</span>
              </button>
              <button className="w-full btn btn-secondary flex items-center justify-center space-x-2">
                <Calendar size={18} />
                <span>View Schedule</span>
              </button>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Today's Classes
            </h2>
            <div className="space-y-3">
              {upcomingClasses.slice(0, 3).map((classItem, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {classItem.title}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {classItem.time} • {classItem.room}
                    </p>
                  </div>
                </div>
              ))}
              {upcomingClasses.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                  No classes today
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const renderStudentDashboard = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StudentStatCard
          icon={BookOpen}
          title="My Courses"
          value={myCourses.length}
          subtitle="Current semester"
          color="bg-blue-500"
        />
        <StudentStatCard
          icon={Award}
          title="Current GPA"
          value={myGrades.gpa || "0.00"}
          subtitle="Based on completed courses"
          color="bg-green-500"
        />
        <StudentStatCard
          icon={FileText}
          title="Assignments Due"
          value="2"
          subtitle="This week"
          color="bg-orange-500"
        />
        <StudentStatCard
          icon={Clock4}
          title="Next Class"
          value={upcomingClasses.length > 0 ? "Today" : "None"}
          subtitle={
            upcomingClasses.length > 0
              ? upcomingClasses[0]?.title
              : "No classes"
          }
          color="bg-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            My Courses
          </h2>
          <div className="space-y-4">
            {myCourses.length > 0 ? (
              myCourses.map((course) => (
                <div
                  key={course._id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {course.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {course.code} • {course.teacher?.name} •{" "}
                      {course.schedule?.days?.join(", ")}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                    Enrolled
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No courses enrolled</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button className="w-full btn btn-primary flex items-center justify-center space-x-2">
                <Award size={18} />
                <span>View Grades</span>
              </button>
              <button className="w-full btn btn-secondary flex items-center justify-center space-x-2">
                <BookOpen size={18} />
                <span>Course Materials</span>
              </button>
              <button className="w-full btn btn-secondary flex items-center justify-center space-x-2">
                <Calendar size={18} />
                <span>My Schedule</span>
              </button>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Today's Schedule
            </h2>
            <div className="space-y-3">
              {upcomingClasses.slice(0, 3).map((classItem, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {classItem.title}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {classItem.time} • {classItem.room}
                    </p>
                  </div>
                </div>
              ))}
              {upcomingClasses.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                  No classes today
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // Custom Popup Component
  const CustomPopup = () => {
    if (!showPopup) return null;

    const popupStyles = {
      success:
        "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/90 dark:border-green-800 dark:text-green-300",
      error:
        "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/90 dark:border-red-800 dark:text-red-300",
      warning:
        "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/90 dark:border-yellow-800 dark:text-yellow-300",
    };

    return (
      <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
        <div
          className={`${popupStyles[popupType]} border rounded-lg p-4 shadow-lg max-w-sm`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {popupType === "success" && (
                <TrendingUp size={18} className="text-green-600" />
              )}
              {popupType === "error" && (
                <AlertCircle size={18} className="text-red-600" />
              )}
              {popupType === "warning" && (
                <AlertCircle size={18} className="text-yellow-600" />
              )}
              <span className="font-medium">{popupMessage}</span>
            </div>
            <button
              onClick={() => setShowPopup(false)}
              className="text-gray-400 hover:text-gray-600 ml-4"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <SkeletonLoading />;
  }

  if (error) {
    return (
      <div className="space-y-6 font-poppins">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Welcome back, {user?.name}!
          </p>
        </div>
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
              Unable to load dashboard data
            </h3>
            <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
            <button onClick={fetchDashboardData} className="btn btn-primary">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-saira">
      <CustomPopup />

      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {user?.role === "admin"
            ? "Admin Dashboard"
            : user?.role === "teacher"
              ? "Faculty Dashboard"
              : "Student Dashboard"}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {user?.role === "admin"
            ? `Welcome back, ${user?.name}! Here's an overview of the college.`
            : user?.role === "teacher"
              ? `Welcome, Professor ${user?.name}! Here's your teaching overview.`
              : `Welcome back, ${user?.name}! Here's your academic overview.`}
        </p>
      </div>

      {/* Render role-specific dashboard */}
      {user?.role === "admin" && renderAdminDashboard()}
      {user?.role === "teacher" && renderTeacherDashboard()}
      {user?.role === "student" && renderStudentDashboard()}
    </div>
  );
};

export default Dashboard;
