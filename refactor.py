import re
import sys

def main():
    filepath = r'client\src\components\Teachers\TeacherManagement.jsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Remove SubcourseItem component
    content = re.sub(r'// Subcourse Item Component\nconst SubcourseItem.*?\n};\n', '', content, flags=re.DOTALL)

    # 2. Update newTeacher state
    content = content.replace('    assignedCourses: [],\n    assignedSubcourses: [],', '    assignedCourses: [],')
    content = content.replace('        assignedCourses: [],\n        assignedSubcourses: [],', '        assignedCourses: [],')

    # 3. Update fetchCourses
    fetch_courses_old = r"""      // API now returns \{ success, data, pagination \} — extract the array
      const courseArray = response\.data\?\.data \|\| response\.data \|\| \[\];
      // Group courses by main course name to create subcourse structure
      const coursesByMainCourse = \{\};
      \(Array\.isArray\(courseArray\) \? courseArray : \[\]\)\.forEach\(\(course\) => \{.*?setCourses\(groupedCourses\);"""
    
    fetch_courses_new = """      // API now returns { success, data, pagination } — extract the array
      const courseArray = response.data?.data || response.data || [];
      setCourses(Array.isArray(courseArray) ? courseArray : []);"""
    content = re.sub(fetch_courses_old, fetch_courses_new, content, flags=re.DOTALL)

    # 4. Fallback data in fetchCourses (simplification)
    content = re.sub(r'// Fallback to sample data.*?setCourses\(\[.*?\]\);', r'// Fallback to sample data\n      setCourses([]);', content, flags=re.DOTALL)

    # 5. handleEditTeacher
    old_handle_edit = r"""  const handleEditTeacher = \(teacher\) => \{
    // Extract assigned subcourses from courses data
    const assignedSubcourses = \[\];

    courses\.forEach\(\(mainCourse\) => \{
      mainCourse\.subcourses\.forEach\(\(subcourse\) => \{
        if \(subcourse\.teacher === teacher\._id\) \{
          assignedSubcourses\.push\(subcourse\._id\);
        \}
      \}\);
    \}\);

    setEditingTeacher\(\{
      \.\.\.teacher,
      assignedSubcourses: assignedSubcourses,
    \}\);
  \};"""
    new_handle_edit = """  const handleEditTeacher = (teacher) => {
    const assignedCourses = [];
    courses.forEach((course) => {
      if (course.teacher === teacher._id || course.teacher?._id === teacher._id) {
        assignedCourses.push(course._id);
      }
    });

    setEditingTeacher({
      ...teacher,
      assignedCourses: assignedCourses,
    });
  };"""
    content = re.sub(old_handle_edit, new_handle_edit, content, flags=re.DOTALL)

    # 6. handleUpdateTeacher assignments loop
    old_update_loop = r"""      // Update course assignments - set teacher for selected subcourses
      for \(const mainCourse of courses\) \{
        for \(const subcourse of mainCourse\.subcourses\) \{
          const shouldBeAssigned = editingTeacher\.assignedSubcourses\.includes\(
            subcourse\._id,
          \);
          const isCurrentlyAssigned = subcourse\.teacher === editingTeacher\._id;

          if \(shouldBeAssigned && !isCurrentlyAssigned\) \{
            // Assign this subcourse to teacher
            await axios\.put\(
              getApiUrl\(`/courses/\$\{subcourse\._id\}`\),
              \{
                teacher: editingTeacher\._id,
              \},
              \{
                headers: token \? \{ Authorization: `Bearer \$\{token\}` \} : \{\},
              \},
            \);
          \} else if \(!shouldBeAssigned && isCurrentlyAssigned\) \{
            // Remove teacher from this subcourse
            await axios\.put\(
              getApiUrl\(`/courses/\$\{subcourse\._id\}`\),
              \{
                teacher: null,
              \},
              \{
                headers: token \? \{ Authorization: `Bearer \$\{token\}` \} : \{\},
              \},
            \);
          \}
        \}
      \}"""
    new_update_loop = """      // Update course assignments
      for (const course of courses) {
        const shouldBeAssigned = editingTeacher.assignedCourses.includes(course._id);
        const isCurrentlyAssigned = course.teacher === editingTeacher._id || course.teacher?._id === editingTeacher._id;

        if (shouldBeAssigned && !isCurrentlyAssigned) {
          await axios.put(
            getApiUrl(`/courses/${course._id}`),
            { teacher: editingTeacher._id },
            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
          );
        } else if (!shouldBeAssigned && isCurrentlyAssigned) {
          await axios.put(
            getApiUrl(`/courses/${course._id}`),
            { teacher: null },
            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
          );
        }
      }"""
    content = re.sub(old_update_loop, new_update_loop, content, flags=re.DOTALL)

    # 7. handleAddTeacher assignments loop
    old_add_loop = r"""      // Update subcourses to set the teacher reference
      for \(const mainCourse of courses\) \{
        for \(const subcourse of mainCourse\.subcourses\) \{
          if \(newTeacher\.assignedSubcourses\.includes\(subcourse\._id\)\) \{
            await axios\.put\(
              getApiUrl\(`/courses/\$\{subcourse\._id\}`\),
              \{
                teacher: newTeacherId,
              \},
              \{
                headers: token \? \{ Authorization: `Bearer \$\{token\}` \} : \{\},
              \},
            \);
          \}
        \}
      \}"""
    new_add_loop = """      // Update courses to set the teacher reference
      for (const course of courses) {
        if (newTeacher.assignedCourses.includes(course._id)) {
          await axios.put(
            getApiUrl(`/courses/${course._id}`),
            { teacher: newTeacherId },
            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
          );
        }
      }"""
    content = re.sub(old_add_loop, new_add_loop, content, flags=re.DOTALL)

    # 8. Course assignment toggles
    old_toggles = r"""  // Course assignment functions
  const toggleCourseAssignment = \(mainCourseId, isForNewTeacher = false\) => \{.*?const toggleSubcourseAssignment = \(.*?\}\);
  \};"""
    new_toggles = """  // Course assignment functions
  const toggleCourseAssignment = (courseId, isForNewTeacher = false) => {
    if (isForNewTeacher) {
      setNewTeacher((prev) => {
        const isAssigned = prev.assignedCourses.includes(courseId);
        return {
          ...prev,
          assignedCourses: isAssigned
            ? prev.assignedCourses.filter((id) => id !== courseId)
            : [...prev.assignedCourses, courseId],
        };
      });
    } else {
      setEditingTeacher((prev) => {
        const isAssigned = prev.assignedCourses.includes(courseId);
        return {
          ...prev,
          assignedCourses: isAssigned
            ? prev.assignedCourses.filter((id) => id !== courseId)
            : [...prev.assignedCourses, courseId],
        };
      });
    }
  };"""
    content = re.sub(old_toggles, new_toggles, content, flags=re.DOTALL)

    # 9. UI for Add Modal
    old_add_ui = r"""                            \{dept\.courses\.map\(\(mainCourse\) => \{
                              const isAssigned = isCourseAssigned\(
                                mainCourse\._id,
                                newTeacher,
                              \);.*?</div>
                            \)\}
                          </div>
                        \);
                      \}\)"""
    new_add_ui = """                            {dept.courses.map((course) => {
                              const isAssigned = newTeacher.assignedCourses.includes(course._id);

                              return (
                                <div
                                  key={course._id}
                                  className="border border-gray-200 dark:border-gray-600 rounded-lg"
                                >
                                  <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={isAssigned}
                                      onChange={() => toggleCourseAssignment(course._id, true)}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {course.name}
                                      </p>
                                      <p className="text-xs text-orange-500 dark:text-orange-400 truncate">
                                        Assigned Teacher: {course.teacher?.name || "None"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })"""
    content = re.sub(old_add_ui, new_add_ui, content, flags=re.DOTALL)

    # 10. UI for Edit Modal
    old_edit_ui = r"""                            \{dept\.courses\.map\(\(mainCourse\) => \{
                              const isAssigned = isCourseAssigned\(
                                mainCourse\._id,
                                editingTeacher,
                              \);.*?</div>
                                  \)\}
                                </div>
                              \);
                            \}\)"""
    new_edit_ui = """                            {dept.courses.map((course) => {
                              const isAssigned = editingTeacher.assignedCourses.includes(course._id);

                              return (
                                <div
                                  key={course._id}
                                  className="border border-gray-200 dark:border-gray-600 rounded-lg"
                                >
                                  <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={isAssigned}
                                      onChange={() => toggleCourseAssignment(course._id, false)}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {course.name}
                                      </p>
                                      <p className="text-xs text-orange-500 dark:text-orange-400 truncate">
                                        Assigned Teacher: {course.teacher?.name || "None"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })"""
    content = re.sub(old_edit_ui, new_edit_ui, content, flags=re.DOTALL)

    # 11. Remove expandedCourses state and references
    content = re.sub(r'  const \[expandedCourses, setExpandedCourses\] = useState\(\{\}\);\n', '', content)
    content = re.sub(r'  const toggleCourseExpansion = \(.*?\}\);\n  };\n', '', content, flags=re.DOTALL)
    
    # 12. Fix "Assigned Courses & Subcourses" text
    content = content.replace("Assign Courses & Subcourses", "Assign Courses")
    content = content.replace("Assigned Courses & Subcourses", "Assigned Courses")
    content = content.replace("Select the courses and subcourses this teacher will teach", "Select the courses this teacher will teach")
    content = re.sub(r'\{getTeachingCoursesForTeacher\(editingTeacher\)\.length\}\s+subcourses assigned', '{editingTeacher.assignedCourses.length} courses assigned', content)

    # 13. Remove getTeachingCoursesForTeacher completely
    content = re.sub(r'  const getTeachingCoursesForTeacher = \(.*?\];\n  \};\n', '', content, flags=re.DOTALL)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Done")

if __name__ == '__main__':
    main()
