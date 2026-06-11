import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import SkeletonLoading from '../Common/SkeletonLoading';
import { formatTimeTo12Hour } from '../../utils/timeFormat';

const Schedule = () => {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedule();
  }, [user]);

  const fetchSchedule = async () => {
    try {
      setLoading(true);

      let scheduleData = [];

      if (user?.role === 'teacher') {
        // Fetch teacher's courses
        const coursesResponse = await axios.get('/courses/teacher-courses');
        const teacherCourses = coursesResponse.data.data || [];

        // Convert courses to schedule events
        scheduleData = teacherCourses.map(course => ({
          id: course._id,
          title: `${course.name}`,
          type: 'lecture',
          schedule: course.schedule || {},
          room: course.schedule?.room || 'TBA',
          instructor: user.name,
          course: course
        }));
      } else if (user?.role === 'student') {
        // Fetch student's enrolled courses
        try {
          const coursesResponse = await axios.get('/courses/my-courses');
          const enrolledCourses = coursesResponse.data.data || [];

          // Convert to schedule events
          scheduleData = enrolledCourses.map(course => ({
            id: course._id,
            title: `${course.name}`,
            type: 'lecture',
            schedule: course.schedule || {},
            room: course.schedule?.room || 'TBA',
            instructor: course.teacher?.name || 'TBA',
            course: course
          }));
        } catch (error) {
          console.error('Error fetching student courses:', error);
          scheduleData = [];
        }
      } else {
        // Admin: Fetch all courses
        const coursesResponse = await axios.get('/courses');
        const allCourses = coursesResponse.data.data || [];

        scheduleData = allCourses.map(course => ({
          id: course._id,
          title: `${course.name}`,
          type: 'lecture',
          schedule: course.schedule || {},
          room: course.schedule?.room || 'TBA',
          instructor: course.teacher?.name || 'TBA',
          course: course
        }));
      }

      setSchedule(scheduleData);
    } catch (error) {
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const getCurrentDay = () => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date().getDay();
    return dayNames[today];
  };

  const getTodaysEvents = () => {
    const today = getCurrentDay();
    return schedule.filter(event =>
      event.schedule?.days?.includes(today)
    ).sort((a, b) => {
      const timeA = a.schedule?.startTime || '00:00';
      const timeB = b.schedule?.startTime || '00:00';
      return timeA.localeCompare(timeB);
    });
  };

  const getEventsForDay = (day) => {
    return schedule.filter(event =>
      event.schedule?.days?.includes(day)
    ).sort((a, b) => {
      // Sort by start time
      const timeA = a.schedule?.startTime || '00:00';
      const timeB = b.schedule?.startTime || '00:00';
      return timeA.localeCompare(timeB);
    });
  };

  const getEventTypeColor = (type) => {
    const colors = {
      lecture: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200',
      lab: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200',
      meeting: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 border-purple-200',
      office: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300 border-orange-200'
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 border-gray-200';
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return formatTimeTo12Hour(timeString);
  };

  if (loading) {
    return <SkeletonLoading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Schedules</h1>
        </div>
      </div>

      {/* Schedule View */}
      <div className="card">
        <div className="overflow-x-auto">
          <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 min-w-max md:min-w-0">
            {days.map(day => {
              const events = getEventsForDay(day);
              return (
                <div key={day} className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden min-w-[280px] md:min-w-0 shrink-0">
                  {/* Day Header */}
                  <div className="bg-linear-to-r from-blue-500 to-blue-600 text-white p-3 font-semibold text-center">
                    {day}
                  </div>

                  {/* Events List */}
                  <div className="p-3 space-y-3  bg-gray-50 dark:bg-gray-800/50">
                    {events.length === 0 ? (
                      <div className="text-center text-gray-400 dark:text-gray-500 py-8">
                        <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No classes</p>
                      </div>
                    ) : (
                      events.map(event => (
                        <div
                          key={event.id}
                          className={`p-3 rounded-lg border ${getEventTypeColor(event.type)} hover:shadow-md transition-shadow`}
                        >
                          <div className="font-semibold text-sm mb-2 truncate" title={event.title}>
                            {event.title}
                          </div>

                          <div className="space-y-1 text-xs">
                            <div className="flex items-center space-x-1">
                              <Clock size={12} />
                              <span>{formatTime(event.schedule?.startTime)} - {formatTime(event.schedule?.endTime)}</span>
                            </div>

                            <div className="flex items-center space-x-1">
                              <MapPin size={12} />
                              <span className="truncate">Room: {event.room}</span>
                            </div>

                            {event.instructor && (
                              <div className="flex items-center space-x-1">
                                <Users size={12} />
                                <span className="truncate" title={event.instructor}>Instructor: {event.instructor}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Today's Schedule */}
      {user?.role !== 'admin' && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Today's Classes ({getCurrentDay()})
          </h2>
          {getTodaysEvents().length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Calendar size={48} className="mx-auto mb-4 opacity-50" />
              <p>No classes scheduled for today</p>
              <p className="text-sm mt-2">
                Enjoy your day off!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {getTodaysEvents().map(event => (
                <div key={event.id} className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className={`w-3 h-3 rounded-full ${event.type === 'lecture' ? 'bg-blue-500' :
                    event.type === 'lab' ? 'bg-green-500' :
                      event.type === 'meeting' ? 'bg-purple-500' : 'bg-orange-500'
                    }`}></div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">{event.title}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatTime(event.schedule?.startTime)} - {formatTime(event.schedule?.endTime)} • Room: {event.room}
                    </div>
                    {event.instructor && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Instructor: {event.instructor}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Schedule;
