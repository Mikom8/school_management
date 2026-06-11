import { useState, useEffect, useRef } from 'react';
import { X, FileText, Calendar, Plus, Trash2, Download, Upload, Loader } from 'lucide-react';
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
    const [downloadingFiles, setDownloadingFiles] = useState(new Set());
    const [isUploading, setIsUploading] = useState(false);
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
                allowedFileTypes: [
                    '.pdf',
                    '.doc', '.docx',
                    '.ppt', '.pptx',
                    '.xls', '.xlsx',
                    '.mdb', '.accdb', '.db', '.sqlite', '.sql'
                ],
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
                            'permanent_storage': {
                                use: ':original',
                                robot: '/backblaze/store',
                                credentials: 'new_generation_university',
                                bucket: 'NewGenerationFile',
                                path: 'assignments/${file.id}.${file.ext}'
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
                waitForEncoding: true, // Changed to true - wait for Backblaze storage
                waitForMetadata: true, // Changed to true - wait for file metadata
            });

        // Uppy event listeners
        uppyInstance.on('file-added', (file) => {
            console.log('Added file:', file.name);
        });

        uppyInstance.on('transloadit:assembly-created', (assembly) => {
            console.log('Transloadit assembly created:', assembly);
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
        if (!uppy || !showCreateModal || !dashboardRef.current) return;

        // Always add fresh — plugin is fully removed on cleanup below
        uppy.use(Dashboard, {
            target: dashboardRef.current,
            inline: true,
            height: 350,
            proudlyDisplayPoweredByUppy: false,
            showProgressDetails: true,
            hideUploadButton: true,
            note: 'Upload files up to 100MB. Max 10 files. Allowed: PDF, Word, PowerPoint, Excel, Database files.',
            theme: 'auto',
        });

        return () => {
            // Fully remove the plugin so next open mounts into the fresh DOM node
            try {
                const plugin = uppy.getPlugin('Dashboard');
                if (plugin) {
                    plugin.unmount();
                    uppy.removePlugin(plugin);
                }
            } catch (e) {
                // ignore
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
            console.log('📚 Fetched assignments:', response.data.data);
            response.data.data?.forEach(assignment => {
                console.log(`Assignment: ${assignment.title}`);
                console.log('Files:', assignment.files);
                if (assignment.files && assignment.files.length > 0) {
                    assignment.files.forEach(file => {
                        console.log(`  - File: ${file.name}, URL: ${file.url}`);
                    });
                }
            });
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
            // Update assembly options with form data
            uppy.getPlugin('Transloadit').setOptions({
                assemblyOptions: {
                    params: {
                        auth: {
                            key: '2147be3263c54c7848aa80043a9c58f6',
                        },
                        steps: {
                            ':original': {
                                robot: '/upload/handle'
                            },
                            'permanent_storage': {
                                use: ':original',
                                robot: '/backblaze/store',
                                credentials: 'new_generation_university',
                                bucket: 'NewGenerationFile',
                                path: 'assignments/${file.id}.${file.ext}'
                            }
                        },
                        notify_url: 'http://localhost:5000/api/assignments/webhook',
                    },
                    fields: {
                        type: formData.type,
                        title: formData.title,
                        description: formData.description || '',
                        course: formData.course,
                        dueDate: formData.dueDate || '',
                        teacher: user._id,
                    },
                },
            });

            // Start upload
            setIsUploading(true);
            const result = await uppy.upload();

            console.log('🔍 Full upload result:', result);
            console.log('🔍 Transloadit assemblies:', result.transloadit);

            if (result.successful.length > 0) {
                console.log('✅ Upload successful, files:', result.successful);

                // Extract file URLs from Transloadit assemblies (not from individual file responses)
                const uploadedFiles = [];

                // Check the transloadit array for assembly results
                if (result.transloadit && result.transloadit.length > 0) {
                    result.transloadit.forEach((assembly, assemblyIndex) => {
                        console.log(`🏭 Assembly ${assemblyIndex + 1}:`, assembly);

                        if (assembly.results) {
                            console.log('  ✅ Assembly has results:', assembly.results);

                            // Look through all steps in the assembly
                            Object.keys(assembly.results).forEach((stepName) => {
                                console.log(`  📍 Step: ${stepName}`);
                                const stepResults = assembly.results[stepName];
                                console.log(`     Step results:`, stepResults);

                                if (Array.isArray(stepResults)) {
                                    stepResults.forEach((fileResult) => {
                                        console.log('     📦 File result:', fileResult);
                                        uploadedFiles.push({
                                            name: fileResult.name,
                                            url: fileResult.ssl_url || fileResult.url,
                                            size: fileResult.size,
                                            type: fileResult.mime,
                                        });
                                    });
                                }
                            });
                        } else {
                            console.warn('  ⚠️ Assembly has no results property');
                        }
                    });
                } else {
                    console.warn('⚠️ No transloadit assemblies found in result');
                }

                console.log('📋 Final extracted files:', uploadedFiles);

                if (uploadedFiles.length === 0) {
                    console.warn('⚠️ No files extracted from Transloadit response!');
                    showToast('Files uploaded but URLs not found. Please try again.', 'error');
                    return;
                }

                // Manually create assignment in backend since webhook might not work on localhost
                try {
                    console.log('💾 Saving to backend:', {
                        type: formData.type,
                        title: formData.title,
                        description: formData.description,
                        course: formData.course,
                        dueDate: formData.dueDate,
                        filesCount: uploadedFiles.length,
                    });

                    const saveResponse = await axios.post('/assignments', {
                        type: formData.type,
                        title: formData.title,
                        description: formData.description || '',
                        course: formData.course,
                        dueDate: formData.dueDate || null,
                        files: uploadedFiles,
                    });

                    console.log('✅ Backend save response:', saveResponse.data);
                } catch (backendError) {
                    console.error('❌ Backend save error:', backendError);
                    console.error('Error response:', backendError.response?.data);
                    showToast('Files uploaded but failed to save assignment', 'error');
                    return;
                }

                showToast(`${formData.type === 'assignment' ? 'Assignment' : 'Handout'} created successfully!`, 'success');
                setShowCreateModal(false);
                resetForm();
                fetchAssignments();
            }
        } catch (error) {
            console.error('Error creating assignment:', error);
            showToast('Failed to create ' + formData.type, 'error');
        } finally {
            setIsUploading(false);
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
                        {user?.role === 'student'
                            ? 'View and download course materials and assignments'
                            : 'Manage course materials and assignments'
                        }
                    </p>
                </div>
                {user?.role === 'teacher' && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn btn-primary flex items-center justify-center space-x-2 cursor-pointer"
                    >
                        <Plus size={18} />
                        <span>Create New</span>
                    </button>
                )}
            </div>

            {/* Assignments List */}
            <div className="card">
                {loading ? (
                    <div className="space-y-4 animate-pulse">
                        {[...Array(3)].map((_, index) => (
                            <div
                                key={index}
                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                    <div className="flex-1 space-y-3">
                                        {/* Badge and date skeleton */}
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                        </div>

                                        {/* Title skeleton */}
                                        <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>

                                        {/* Description skeleton */}
                                        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                                        <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded"></div>

                                        {/* Course skeleton */}
                                        <div className="h-3 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>

                                        {/* Files skeleton */}
                                        <div className="mt-3 space-y-2">
                                            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded border border-gray-200 dark:border-gray-600">
                                                <div className="flex items-center gap-2 flex-1">
                                                    <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                                    <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                                    <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                                </div>
                                                <div className="h-9 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action buttons skeleton */}
                                    <div className="flex items-center gap-2">
                                        <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : assignments.length === 0 ? (
                    <div className="text-center py-12">
                        <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">No assignments or Course materials yet</p>
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

                                        {/* Files List */}
                                        {assignment.files && assignment.files.length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                    Attached Files ({assignment.files.length}):
                                                </p>
                                                {assignment.files.map((file, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-600"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                                            <FileText size={18} className="text-blue-500 shrink-0" />
                                                            <div className="min-w-0 flex-1">
                                                                <span className="text-sm text-gray-700 dark:text-gray-300 block truncate">
                                                                    {file.name}
                                                                </span>
                                                                {file.size && (
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={async () => {
                                                                const fileKey = `${assignment._id}-${index}`;

                                                                // Prevent double-click
                                                                if (downloadingFiles.has(fileKey)) {
                                                                    return;
                                                                }

                                                                try {
                                                                    // Mark as downloading
                                                                    setDownloadingFiles(prev => new Set(prev).add(fileKey));

                                                                    console.log(`🔽 Downloading: ${file.name}`);
                                                                    const response = await axios.get(
                                                                        `/assignments/download/${assignment._id}/${index}`,
                                                                        { responseType: 'blob' }
                                                                    );

                                                                    // Create download link
                                                                    const url = window.URL.createObjectURL(new Blob([response.data]));
                                                                    const link = document.createElement('a');
                                                                    link.href = url;
                                                                    link.setAttribute('download', file.name);
                                                                    document.body.appendChild(link);
                                                                    link.click();
                                                                    link.remove();
                                                                    window.URL.revokeObjectURL(url);

                                                                    console.log(`✅ Download completed: ${file.name}`);
                                                                    showToast('Download completed!', 'success');
                                                                } catch (error) {
                                                                    console.error('Download error:', error);
                                                                    showToast('Failed to download file', 'error');
                                                                } finally {
                                                                    // Remove from downloading set
                                                                    setDownloadingFiles(prev => {
                                                                        const newSet = new Set(prev);
                                                                        newSet.delete(fileKey);
                                                                        return newSet;
                                                                    });
                                                                }
                                                            }}
                                                            disabled={downloadingFiles.has(`${assignment._id}-${index}`)}
                                                            className={`flex items-center gap-2 px-3 py-2 text-white rounded-lg transition-colors shrink-0 ${downloadingFiles.has(`${assignment._id}-${index}`)
                                                                ? 'bg-gray-400 cursor-not-allowed'
                                                                : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                                                                }`}
                                                            title="Download file"
                                                        >
                                                            <Download size={16} className={downloadingFiles.has(`${assignment._id}-${index}`) ? 'animate-bounce' : ''} />
                                                            <span className="text-sm font-medium">
                                                                {downloadingFiles.has(`${assignment._id}-${index}`) ? 'Downloading...' : 'Download'}
                                                            </span>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {user?.role === 'teacher' && (
                                            <>
                                                <button
                                                    onClick={() => handleDelete(assignment._id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto custom-scrollbar">
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
                        <div className="max-h-[calc(90vh-140px)] overflow-y-auto custom-scrollbar">
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
                                        className="input w-full cursor-pointer"
                                        required
                                    >
                                        <option value="" disabled>Select a course</option>
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
                                            type="date"
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
                                <div className="sticky bottom-0 bg-white dark:bg-gray-800 flex justify-end gap-3 pt-4 pb-2 border-t border-gray-200 dark:border-gray-700 z-9999999999999">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowCreateModal(false);
                                            resetForm();
                                        }}
                                        className="btn btn-secondary cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={isUploading}
                                        className="btn btn-primary flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isUploading ? (
                                            <>
                                                <Loader className="animate-spin" size={18} />
                                                <span>Uploading...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Upload size={18} />
                                                <span>Create {formData.type === 'assignment' ? 'Assignment' : 'Handout'}</span>
                                            </>
                                        )}
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
