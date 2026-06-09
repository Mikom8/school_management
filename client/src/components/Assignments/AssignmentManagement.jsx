import { useState, useEffect, useRef } from 'react';
import { X, FileText, Calendar, AlertCircle, Plus, Edit2, Trash2, Download, Upload } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import Toast from '../Common/Toast';
import Uppy from '@uppy/core';
import Dashboard from '@uppy/dashboard';
import Transloadit from '@uppy/transloadit';

// Import Uppy styles (local copies)
import './uppy-core.css';
import './uppy-dashboard.css';
import './AssignmentUppy.css';

const AssignmentManagement = () => {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [uppy, setUppy] = useState(null);
    const dashboardRef = useRef(null);

    const [formData, setFormData] = useState({
        type: 'assignment', // 'assignment' or 'handout'
        title: '',
        description: '',
        course: '',
        dueDate: '',
    });

    // Initialize Uppy
    useEffect(() => {
        const uppyInstance = new Uppy({
            restrictions: {
                maxNumberOfFiles: 10,
                maxFileSize: 100 * 1024 * 1024, // 100MB
                allowedFileTypes: ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.zip', '.rar', 'image/*', 'video/*'],
            },
            autoProceed: false,
        })
            .use(Transloadit, {
                assemblyOptions: {
                    params: {
                        auth: {
                            key: '2147be3263c54c7848aa80043a9c58f6',
                        },
                        steps: {
                            ':original': {
                                robot: '/upload/handle'
                            },
                            'store_to_backblaze': {
                                use: ':original',
                                robot: '/s3/store',
                                credentials: 'backblaze_b2',
                                path: 'assignments/${fields.course}/${file.basename}',
                            }
                        },
                        notify_url: 'http://localhost:5000/api/assignments/webhook',
                    },
                    fields: {
                        metadata: JSON.stringify({
                            teacher: user?._id,
                        }),
                    },
                },
                waitForEncoding: true,
                waitForMetadata: true,
            });

        // Uppy event listeners
        uppyInstance.on('file-added', (file) => {
            console.log('Added file:', file.name);
        });

        uppyInstance.on('transloadit:complete', (assembly) => {
            console.log('Transloadit assembly complete:', assembly);
            showToast('Files uploaded successfully!', 'success');
        });

        uppyInstance.on('upload-error', (file, error) => {
            console.error('Upload error:', file?.name, error);
            showToast(`Failed to upload ${file?.name || 'file'}`, 'error');
        });

        uppyInstance.on('complete', (result) => {
            console.log('Upload complete:', result);
            if (result.successful.length > 0) {
                showToast(`Successfully uploaded ${result.successful.length} file(s)!`, 'success');
            }
        });

        setUppy(uppyInstance);

        return () => {
            if (uppyInstance) {
                uppyInstance.cancelAll();
            }
        };
    }, [user]);

    // Mount Dashboard plugin when modal opens
    useEffect(() => {
        if (uppy && showCreateModal && dashboardRef.current) {
            uppy.use(Dashboard, {
                target: dashboardRef.current,
                inline: true,
                height: 350,
                proudlyDisplayPoweredByUppy: false,
                showProgressDetails: true,
                note: 'Upload files up to 100MB. Max 10 files.',
                theme: 'auto',
            });
        }

        return () => {
            if (uppy) {
                try {
                    uppy.getPlugin('Dashboard')?.unmount();
                } catch (e) {
                    // Plugin might not be mounted
                }
            }
        };
    }, [uppy, showCreateModal]);

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

        if (!uppy || uppy.getFiles().length === 0) {
            showToast('Please upload at least one file', 'error');
            return;
        }

        try {
            // Add metadata to uppy upload
            uppy.setMeta({
                type: formData.type,
                title: formData.title,
                description: formData.description,
                course: formData.course,
                dueDate: formData.dueDate,
            });

            // Start upload
            const result = await uppy.upload();

            if (result.successful.length > 0) {
                showToast(`${formData.type === 'assignment' ? 'Assignment' : 'Handout'} created successfully!`, 'success');
                setShowCreateModal(false);
                resetForm();
                fetchAssignments();
            }
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
        });
        if (uppy) {
            uppy.cancelAll();
        }
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
                                            <span className={`px-2 py-1 text-xs font-semibold rounded ${assignment.type === 'assignment'
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl my-8">
                        {/* Modal Header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
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
                        <div className="max-h-[calc(90vh-140px)] overflow-y-auto">
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

                                {/* File Upload with Uppy */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Attachments *
                                    </label>
                                    <div ref={dashboardRef} className="uppy-wrapper"></div>
                                </div>

                                {/* Submit Button */}
                                <div className="sticky bottom-0 bg-white dark:bg-gray-800 flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
