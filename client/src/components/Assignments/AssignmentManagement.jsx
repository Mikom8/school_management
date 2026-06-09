import { useState, useEffect } from 'react';
import { Upload, X, FileText, Calendar, AlertCircle, Folder, Plus, Edit2, Trash2, Download } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import Toast from '../Common/Toast';

const AssignmentManagement = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const [formData, setFormData] = useState({
    type: 'assignment', // 'assignment' or 'handout'
    title: '',
    description: '',
    course: '',
    dueDate: '',
    files: []
  });

  useEffect(() => {
    fetchAssignments();
    if (user?.role === 'teacher') {
      fetchTeacherCourses();
    }
  }, [user]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/assignments');
      setAssignments(response.data.data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      showToast('Failed to load assignments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherCourses = async () => {
    try {
      const response = await axios.get('/courses/teacher-courses');
      setCourses(response.data.data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      files: [...prev.files, ...files]
    }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    setFormData(prev => ({
      ...prev,
      files: [...prev.files, ...files]
    }));
  };

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.course) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    if (formData.type === 'assignment' && !formData.dueDate) {
      showToast('Please set a due date for the assignment', 'error');
      return;
    }

    try {
      const submitData = new FormData();
      submitData.append('type', formData.type);
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('course', formData.course);
      
      if (formData.type === 'assignment') {
        submitData.append('dueDate', formData.dueDate);
      }

      formData.files.forEach(file => {
        submitData.append('files', file);
      });

      await axios.post('/assignments', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showToast(`${formData.type === 'assignment' ? 'Assignment' : 'Handout'} created successfully!`, 'success');
      setShowCreateModal(false);
      resetForm();
      fetchAssignments();
    } catch (error) {
      console.error('Error creating assignment:', error);
      showToast('Failed to create ' + formData.type, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'assignment',
      title: '',
      description: '',
      course: '',
      dueDate: '',
      files: []
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this?')) return;

    try {
      await axios.delete(`/assignments/${id}`);
      showToast('Deleted successfully', 'success');
      fetchAssignments();
    } catch (error) {
      console.error('Error deleting:', error);
      showToast('Failed to delete', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            Assignments & Handouts
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage course materials and assignments
          </p>
        </div>
        {user?.role === 'teacher' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center justify-center space-x-2"
          >
            <Plus size={18} />
            <span>Create New</span>
          </button>
        )}
      </div>

      {/* Assignments List */}
      <div className="card">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 dark:text-gray-400 mt-4">Loading...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No assignments yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <div
                key={assignment._id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        assignment.type === 'assignment'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      }`}>
                        {assignment.type === 'assignment' ? 'Assignment' : 'Handout'}
                      </span>
                      {assignment.type === 'assignment' && assignment.dueDate && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Calendar size={12} />
                          Due: {new Date(assignment.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {assignment.title}
                    </h3>
                    {assignment.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {assignment.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Course: {assignment.course?.name || 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {user?.role === 'teacher' && (
                      <>
                        <button
                          onClick={() => handleDelete(assignment._id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Create New {formData.type === 'assignment' ? 'Assignment' : 'Handout'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="assignment"
                      checked={formData.type === 'assignment'}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      className="mr-2"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Assignment</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="handout"
                      checked={formData.type === 'handout'}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      className="mr-2"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Handout</span>
                  </label>
                </div>
              </div>

              {/* Course Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Course *
                </label>
                <select
                  value={formData.course}
                  onChange={(e) => setFormData(prev => ({ ...prev, course: e.target.value }))}
                  className="input w-full"
                  required
                >
                  <option value="">Select a course</option>
                  {courses.map(course => (
                    <option key={course._id} value={course._id}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="input w-full"
                  placeholder="Enter title"
                  required
                />
              </div>

              {/* Due Date (only for assignments) */}
              {formData.type === 'assignment' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Due Date *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.dueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="input w-full"
                    required
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="input w-full"
                  rows="4"
                  placeholder="Enter description or instructions..."
                ></textarea>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Attachments (Optional)
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-lg p-8 sm:p-12 text-center transition-all ${
                    dragOver
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <input
                    multiple
                    className="hidden"
                    id="fileInput"
                    type="file"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="fileInput" className="cursor-pointer flex flex-col items-center">
                    <Folder size={48} className="text-blue-500 mb-4" />
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                      Drag & Drop your files here or <u className="text-blue-600 dark:text-blue-400">click to upload</u>
                    </p>
                  </label>
                </div>

                {/* Selected Files */}
                {formData.files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Selected files ({formData.files.length}):
                    </p>
                    {formData.files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <FileText size={16} className="text-gray-500 dark:text-gray-400 shrink-0" />
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                            {file.name}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors shrink-0"
                        >
                          <X size={16} className="text-gray-500 dark:text-gray-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex items-center gap-2">
                  <Upload size={18} />
                  <span>Create {formData.type === 'assignment' ? 'Assignment' : 'Handout'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        show={toast.show}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </div>
  );
};

export default AssignmentManagement;
