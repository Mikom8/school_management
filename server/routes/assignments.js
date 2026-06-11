const express = require("express");
const Assignment = require("../models/Assignment");
const Course = require("../models/Course");
const { auth, authorize } = require("../middleware/auth");

const router = express.Router();

// @desc    Get Transloadit signature (for frontend authentication)
// @route   GET /api/assignments/signature
// @access  Private (Teacher)
router.get("/signature", auth, authorize("teacher"), (req, res) => {
  try {
    const crypto = require("crypto");
    const signature = crypto
      .createHmac("sha384", process.env.TRANSLOADIT_SECRET)
      .update(Buffer.from(JSON.stringify({}), "utf-8"))
      .digest("hex");

    res.json({
      success: true,
      data: {
        key: process.env.TRANSLOADIT_KEY,
        signature: signature,
        // Additional metadata to pass to Transloadit
        params: {
          auth: {
            key: process.env.TRANSLOADIT_KEY,
            expires: new Date(Date.now() + 3600000).toISOString(), // 1 hour
          },
          template_id: process.env.TRANSLOADIT_TEMPLATE_ID || undefined,
        },
      },
    });
  } catch (error) {
    console.error("Signature generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate signature",
    });
  }
});

// @desc    Webhook endpoint for Transloadit to notify upload completion
// @route   POST /api/assignments/webhook
// @access  Public (called by Transloadit)
router.post("/webhook", express.json(), async (req, res) => {
  try {
    console.log("📥 Transloadit webhook received:", JSON.stringify(req.body, null, 2));

    // Transloadit sends the upload result here
    const { transloadit, fields } = req.body;

    // Extract uploaded files from Transloadit response
    const uploadedFiles = [];
    
    if (transloadit && transloadit.results) {
      // Transloadit results contain the uploaded files
      Object.keys(transloadit.results).forEach((stepName) => {
        const stepResults = transloadit.results[stepName];
        if (Array.isArray(stepResults)) {
          stepResults.forEach((file) => {
            uploadedFiles.push({
              name: file.name,
              url: file.ssl_url || file.url,
              size: file.size,
              type: file.mime,
            });
          });
        }
      });
    }

    console.log("📦 Uploaded files:", uploadedFiles);
    console.log("📝 Fields:", fields);

    // Extract metadata from fields (sent from frontend)
    const { type, title, description, course, dueDate, teacher } = fields;

    if (!type || !title || !course || !teacher) {
      console.error("❌ Missing required fields");
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create assignment in database
    const assignment = await Assignment.create({
      type,
      title,
      description: description || '',
      course,
      teacher,
      dueDate: dueDate || null,
      files: uploadedFiles,
    });

    await assignment.populate("course", "name code");
    await assignment.populate("teacher", "name email");

    console.log("✅ Assignment created:", assignment._id);

    // Create notifications for students in the course
    try {
      const Student = require("../models/Student");
      const Notification = require("../models/Notification");
      
      // Find the course details
      const courseDoc = await Course.findById(course);
      
      if (courseDoc) {
        // Find ALL students in the same department, grade, and semester
        // Regardless of whether they have grades or not
        const students = await Student.find({
          department: courseDoc.department,
          grade: courseDoc.year,
          semester: courseDoc.semester,
        }).populate("user");

        console.log(`📢 Found ${students.length} students to notify`);

        // Create notification for each student
        const notificationPromises = students.map((student) => {
          if (student.user) {
            return Notification.create({
              user: student.user._id,
              type: type === 'assignment' ? 'assignment_posted' : 'handout_posted',
              title: `New ${type === 'assignment' ? 'Assignment' : 'Handout'}: ${title}`,
              message: `${assignment.teacher.name} posted a new ${type} in ${courseDoc.name}${dueDate ? ` - Due: ${new Date(dueDate).toLocaleDateString()}` : ''}`,
              data: {
                assignmentId: assignment._id,
                courseId: course,
                teacherId: teacher,
              },
            });
          }
        });

        await Promise.all(notificationPromises.filter(Boolean));
        console.log(`✅ Successfully notified ${students.length} students`);
      } else {
        console.log("⚠️ Course not found, skipping notifications");
      }
    } catch (notificationError) {
      console.error("⚠️ Notification error (non-fatal):", notificationError);
    }

    res.json({ ok: true, assignment_id: assignment._id });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    res.status(500).json({ error: error.message });
  }
});

// @desc    Create assignment (metadata only, files handled by webhook)
// @route   POST /api/assignments
// @access  Private (Teacher)
router.post("/", auth, authorize("teacher"), async (req, res) => {
  try {
    const { type, title, description, course, dueDate, files } = req.body;

    // Validate required fields
    if (!type || !title || !course) {
      return res.status(400).json({
        success: false,
        message: "Type, title, and course are required",
      });
    }

    if (type === "assignment" && !dueDate) {
      return res.status(400).json({
        success: false,
        message: "Due date is required for assignments",
      });
    }

    // Create assignment
    const assignment = await Assignment.create({
      type,
      title,
      description,
      course,
      teacher: req.user._id,
      dueDate,
      files: files || [],
    });

    await assignment.populate("course", "name code");
    await assignment.populate("teacher", "name email");

    // Create notifications for students
    try {
      const Student = require("../models/Student");
      const Notification = require("../models/Notification");
      
      console.log(`🔍 Looking up course: ${course}`);
      const courseDoc = await Course.findById(course);
      
      if (!courseDoc) {
        console.error(`❌ Course not found: ${course}`);
        return res.status(201).json({
          success: true,
          data: assignment,
          warning: "Assignment created but course not found for notifications"
        });
      }

      console.log(`📚 Course found: ${courseDoc.name}`);
      
      // Find ALL students under this teacher (all courses in the same department)
      // Get all courses taught by this teacher in the same department
      const teacherCourses = await Course.find({
        teacher: req.user._id,
        department: courseDoc.department,
      });

      console.log(`👨‍🏫 Teacher has ${teacherCourses.length} courses in this department`);

      // Collect all unique grade/semester combinations from teacher's courses
      const studentsSet = new Set();
      
      for (const teacherCourse of teacherCourses) {
        const students = await Student.find({
          department: teacherCourse.department,
          grade: teacherCourse.year,
          semester: teacherCourse.semester,
        }).populate("user");

        students.forEach(student => {
          if (student.user) {
            studentsSet.add(JSON.stringify({
              userId: student.user._id.toString(),
              name: student.name
            }));
          }
        });
      }

      // Convert back to array of unique students
      const uniqueStudents = Array.from(studentsSet).map(s => JSON.parse(s));
      
      console.log(`📢 Found ${uniqueStudents.length} unique students to notify across all teacher's courses`);

      if (uniqueStudents.length === 0) {
        console.log("⚠️ No students found under this teacher");
      }

      const notificationPromises = uniqueStudents.map((student) => {
        console.log(`📬 Creating notification for student: ${student.name} (${student.userId})`);
        return Notification.create({
          user: student.userId,
          type: type === 'assignment' ? 'assignment_posted' : 'handout_posted',
          title: `New ${type === 'assignment' ? 'Assignment' : 'Handout'}: ${title}`,
          message: `Instructor ${req.user.name} posted a new ${type} in ${courseDoc.name}${dueDate ? ` - Due: ${new Date(dueDate).toLocaleDateString()}` : ''}`,
          data: {
            assignmentId: assignment._id,
            courseId: course,
            teacherId: req.user._id,
          },
        });
      });

      const results = await Promise.all(notificationPromises);
      console.log(`✅ Successfully created ${results.length} notifications for all students under teacher`);
    } catch (notificationError) {
      console.error("❌ Notification error:", notificationError);
      console.error("Stack trace:", notificationError.stack);
    }

    res.status(201).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    console.error("Create assignment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create assignment",
      error: error.message,
    });
  }
});

// @desc    Get all assignments
// @route   GET /api/assignments
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const { course, type, page = 1, limit = 20 } = req.query;

    let query = { isActive: true };

    // Filter by course if specified
    if (course) {
      query.course = course;
    }

    // Filter by type if specified
    if (type) {
      query.type = type;
    }

    // Role-based filtering
    if (req.user.role === "teacher") {
      query.teacher = req.user._id;
    } else if (req.user.role === "student") {
      // Students can only see assignments from their enrolled courses
      // Get student's courses first
      const Student = require("../models/Student");
      const student = await Student.findOne({ user: req.user._id });
      
      if (student && student.department) {
        const courses = await Course.find({
          department: student.department,
          year: student.grade,
          semester: student.semester,
        }).select("_id");
        
        query.course = { $in: courses.map((c) => c._id) };
      }
    }

    const skip = (page - 1) * limit;

    const assignments = await Assignment.find(query)
      .populate("course", "name code")
      .populate("teacher", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Assignment.countDocuments(query);

    res.json({
      success: true,
      data: assignments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get assignments error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch assignments",
      error: error.message,
    });
  }
});

// @desc    Get single assignment
// @route   GET /api/assignments/:id
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate("course", "name code")
      .populate("teacher", "name email");

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    res.json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    console.error("Get assignment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch assignment",
      error: error.message,
    });
  }
});

// @desc    Update assignment
// @route   PUT /api/assignments/:id
// @access  Private (Teacher - own assignments only)
router.put("/:id", auth, authorize("teacher"), async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    // Check if teacher owns this assignment
    if (assignment.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this assignment",
      });
    }

    const { type, title, description, dueDate } = req.body;

    if (title) assignment.title = title;
    if (description !== undefined) assignment.description = description;
    if (type) assignment.type = type;
    if (dueDate !== undefined) assignment.dueDate = dueDate;

    await assignment.save();
    await assignment.populate("course", "name code");
    await assignment.populate("teacher", "name email");

    res.json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    console.error("Update assignment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update assignment",
      error: error.message,
    });
  }
});

// Helper function to delete files from Backblaze B2
const deleteFilesFromB2 = async (files) => {
  if (!files || files.length === 0) return;
  const https = require('https');
  const { URL } = require('url');

  try {
    const bucketId = process.env.B2_BUCKET_ID;
    if (!bucketId) {
      console.warn("B2_BUCKET_ID not configured, skipping B2 deletion");
      return;
    }

    const authString = `${process.env.B2_APPLICATION_KEY_ID}:${process.env.B2_APPLICATION_KEY}`;
    const authHeader = 'Basic ' + Buffer.from(authString).toString('base64');
    
    const authData = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.backblazeb2.com',
        path: '/b2api/v2/b2_authorize_account',
        method: 'GET',
        headers: { 'Authorization': authHeader }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) resolve(JSON.parse(body));
          else reject(new Error(`B2 Auth failed: ${res.statusCode}`));
        });
      });
      req.on('error', reject);
      req.end();
    });

    const { authorizationToken, apiUrl } = authData;

    for (const file of files) {
      if (!file.url) continue;
      try {
        const urlObj = new URL(file.url);
        const parts = urlObj.pathname.split('/');
        if (parts[1] !== 'file' || parts.length <= 3) continue;
        
        const fileName = parts.slice(3).join('/');
        console.log(`Attempting to delete B2 file: ${fileName}`);

        const listData = JSON.stringify({ bucketId, prefix: fileName, maxFileCount: 1 });
        const listUrl = new URL(`${apiUrl}/b2api/v2/b2_list_file_names`);
        
        const fileId = await new Promise((resolve) => {
          const req = https.request({
            hostname: listUrl.hostname,
            path: listUrl.pathname,
            method: 'POST',
            headers: {
              'Authorization': authorizationToken,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(listData)
            }
          }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
              if (res.statusCode === 200) {
                const result = JSON.parse(body);
                if (result.files && result.files.length > 0 && result.files[0].fileName === fileName) {
                  resolve(result.files[0].fileId);
                } else resolve(null);
              } else resolve(null);
            });
          });
          req.on('error', () => resolve(null));
          req.write(listData);
          req.end();
        });

        if (!fileId) continue;

        const delData = JSON.stringify({ fileName, fileId });
        const delUrl = new URL(`${apiUrl}/b2api/v2/b2_delete_file_version`);
        
        await new Promise((resolve) => {
          const req = https.request({
            hostname: delUrl.hostname,
            path: delUrl.pathname,
            method: 'POST',
            headers: {
              'Authorization': authorizationToken,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(delData)
            }
          }, (res) => {
            res.on('data', () => {});
            res.on('end', resolve);
          });
          req.on('error', resolve);
          req.write(delData);
          req.end();
        });
        console.log(`Successfully deleted B2 file: ${fileName}`);
      } catch (e) {
        console.error(`Error deleting individual file ${file.url}:`, e);
      }
    }
  } catch (error) {
    console.error("Error in B2 deletion process:", error);
  }
};

// @desc    Delete assignment
// @route   DELETE /api/assignments/:id
// @access  Private (Teacher - own assignments only)
router.delete("/:id", auth, authorize("teacher"), async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    // Check if teacher owns this assignment
    if (assignment.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this assignment",
      });
    }

    // Soft delete
    assignment.isActive = false;
    
    // Delete files from Backblaze B2 (fire and forget)
    if (assignment.files && assignment.files.length > 0) {
      deleteFilesFromB2(assignment.files).catch(console.error);
      assignment.files = []; // Remove references
    }

    await assignment.save();

    res.json({
      success: true,
      message: "Assignment deleted successfully",
    });
  } catch (error) {
    console.error("Delete assignment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete assignment",
      error: error.message,
    });
  }
});

// @desc    Track download (increment counter)
// @route   POST /api/assignments/:id/download
// @access  Private (Student)
router.post("/:id/download", auth, async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloads: 1 } },
      { new: true }
    );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    res.json({
      success: true,
      message: "Download tracked",
    });
  } catch (error) {
    console.error("Track download error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to track download",
    });
  }
});

// @desc    Download file proxy (for private Backblaze bucket)
// @route   GET /api/assignments/download/:assignmentId/:fileIndex
// @access  Private
router.get("/download/:assignmentId/:fileIndex", auth, async (req, res) => {
  try {
    const { assignmentId, fileIndex } = req.params;
    
    console.log(`\n📥 Download request received`);
    console.log(`📄 Assignment ID: ${assignmentId}`);
    console.log(`📄 File Index: ${fileIndex}`);
    
    // Get assignment
    const assignment = await Assignment.findById(assignmentId);
    
    if (!assignment) {
      console.error(`❌ Assignment not found: ${assignmentId}`);
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }
    
    // Get file
    const file = assignment.files[parseInt(fileIndex)];
    
    if (!file) {
      console.error(`❌ File not found at index: ${fileIndex}`);
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }
    
    console.log(`📁 File name: ${file.name}`);
    console.log(`🔗 Original URL: ${file.url}`);
    
    const https = require('https');
    const { URL } = require('url');
    
    // Step 1: Authorize with B2 to get download authorization token
    const authString = `${process.env.B2_APPLICATION_KEY_ID}:${process.env.B2_APPLICATION_KEY}`;
    const authHeader = 'Basic ' + Buffer.from(authString).toString('base64');
    
    console.log(`🔐 Step 1: Authorizing with Backblaze B2 API...`);
    
    const authOptions = {
      hostname: 'api.backblazeb2.com',
      path: '/b2api/v2/b2_authorize_account',
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    };
    
    const authRequest = https.request(authOptions, (authResponse) => {
      let authData = '';
      
      authResponse.on('data', (chunk) => {
        authData += chunk;
      });
      
      authResponse.on('end', () => {
        if (authResponse.statusCode !== 200) {
          console.error(`❌ B2 Authorization failed with status: ${authResponse.statusCode}`);
          console.error(`❌ Response:`, authData);
          return res.status(500).json({
            success: false,
            message: 'Failed to authorize with storage',
            error: authData,
          });
        }
        
        const authResult = JSON.parse(authData);
        console.log(`✅ B2 Authorization successful`);
        console.log(`🔑 Got authorization token`);
        
        // Step 2: Download the file using the authorization token
        const fileUrl = new URL(file.url);
        
        console.log(`📡 Step 2: Downloading file with authorization token...`);
        console.log(`🌐 Host: ${fileUrl.hostname}`);
        console.log(`📍 Path: ${fileUrl.pathname}`);
        
        const downloadOptions = {
          hostname: fileUrl.hostname,
          path: fileUrl.pathname,
          method: 'GET',
          headers: {
            'Authorization': authResult.authorizationToken,
          },
        };
        
        const downloadRequest = https.request(downloadOptions, (downloadResponse) => {
          console.log(`\n📊 Download response received`);
          console.log(`📊 Status: ${downloadResponse.statusCode}`);
          console.log(`📊 Status message: ${downloadResponse.statusMessage}`);
          
          if (downloadResponse.statusCode !== 200) {
            console.error(`\n❌ ERROR: Download failed with status ${downloadResponse.statusCode}`);
            
            let errorBody = '';
            downloadResponse.setEncoding('utf8');
            
            downloadResponse.on('data', (chunk) => {
              errorBody += chunk;
            });
            
            downloadResponse.on('end', () => {
              console.error(`❌ Error response:`, errorBody);
              if (!res.headersSent) {
                res.status(500).json({
                  success: false,
                  message: 'Failed to download file',
                  status: downloadResponse.statusCode,
                  error: errorBody,
                });
              }
            });
            return;
          }
          
          // Success!
          console.log(`\n✅ Download successful! Streaming file...`);
          
          const contentType = file.type || downloadResponse.headers['content-type'] || 'application/octet-stream';
          const fileName = encodeURIComponent(file.name);
          
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fileName}`);
          
          if (downloadResponse.headers['content-length']) {
            res.setHeader('Content-Length', downloadResponse.headers['content-length']);
            console.log(`📦 File size: ${downloadResponse.headers['content-length']} bytes`);
          }
          
          // Pipe the file stream directly to response
          downloadResponse.pipe(res);
          
          downloadResponse.on('end', () => {
            console.log(`✅ Download completed successfully: ${file.name}\n`);
          });
          
          downloadResponse.on('error', (streamError) => {
            console.error(`❌ Stream error:`, streamError);
          });
        });
        
        downloadRequest.on('error', (error) => {
          console.error(`\n❌ Download request error:`, error);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Failed to connect to storage',
              error: error.message,
            });
          }
        });
        
        downloadRequest.end();
      });
    });
    
    authRequest.on('error', (error) => {
      console.error(`\n❌ Authorization request error:`, error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to authorize with storage',
          error: error.message,
        });
      }
    });
    
    authRequest.end();
    
  } catch (error) {
    console.error(`\n❌ Download proxy error:`, error);
    console.error(`❌ Stack trace:`, error.stack);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to process download",
        error: error.message,
      });
    }
  }
});

module.exports = router;
