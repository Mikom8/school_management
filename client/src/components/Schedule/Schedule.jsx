import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, Plus, Loader } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import SkeletonLoading from '../Common/SkeletonLoading';

const Schedule = () => {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('week');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/schedule');
      setSchedule(response.data.data || []);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      alert('Error loading schedule: ' + (error.response?.data?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  const getEventsForDay = (day) => {
    return schedule.filter(event => 
      event.schedule?.days?.includes(day)
    );
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
    return timeString; // You might want to format this better
  };

  if (loading) {
    return <SkeletonLoading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Schedule</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Your real-time class and meeting schedule
          </p>
        </div>
        
        <div className="flex space-x-2 mt-4 lg:mt-0">
          <select
            value={view}
            onChange={(e) => setView(e.target.value)}
            className="input"
          >
            <option value="week">Week View</option>
            <option value="day">Day View</option>
          </select>
          
          {(user?.role === 'admin' || user?.role === 'teacher') && (
            <button 
              onClick={() => setShowAddForm(true)}
              className="btn btn-primary flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>Add Event</span>
            </button>
          )}
        </div>
      </div>

      {/* Schedule View */}
      <div className="card">
        <div className="overflow-x-auto">
          {/* Days Header */}
          <div className="grid grid-cols-6 min-w-[800px] border-b border-gray-200 dark:border-gray-600">
            <div className="p-4 font-medium text-gray-900 dark:text-white">Time</div>
            {days.map(day => (
              <div key={day} className="p-4 font-medium text-gray-900 dark:text-white text-center">
                {day}
              </div>
            ))}
          </div>

          {/* Time Slots */}
          <div className="min-w-[800px]">
            {timeSlots.map((time) => (
              <div key={time} className="grid grid-cols-6 border-b border-gray-100 dark:border-gray-700">
                <div className="p-4 text-sm text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-600">
                  {time}
                </div>
                {days.map(day => {
                  const events = getEventsForDay(day).filter(event => {
                    const eventTime = event.schedule?.startTime;
                    return eventTime && eventTime.startsWith(time.substring(0, 2));
                  });
                  
                  return (
                    <div key={day} className="p-1 border-r border-gray-200 dark:border-gray-600 min-h-[80px]">
                      {events.map(event => (
                        <div
                          key={event.id}
                          className={`p-2 rounded-lg text-xs mb-1 border ${getEventTypeColor(event.type)}`}
                        >
                          <div className="font-medium truncate">{event.title}</div>
                          <div className="flex items-center space-x-1 mt-1">
                            <Clock size={10} />
                            <span>{formatTime(event.schedule?.startTime)}-{formatTime(event.schedule?.endTime)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin size={10} />
                            <span className="truncate">{event.room}</span>
                          </div>
                          {event.instructor && (
                            <div className="flex items-center space-x-1">
                              <Users size={10} />
                              <span className="truncate">{event.instructor}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Today's Classes & Events
        </h2>
        {schedule.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Calendar size={48} className="mx-auto mb-4 opacity-50" />
            <p>No schedule events found</p>
            <p className="text-sm mt-2">
              {user?.role === 'admin' || user?.role === 'teacher' 
                ? 'Add courses or events to see them here' 
                : 'You are not enrolled in any courses yet'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedule.slice(0, 5).map(event => (
              <div key={event.id} className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className={`w-3 h-3 rounded-full ${
                  event.type === 'lecture' ? 'bg-blue-500' :
                  event.type === 'lab' ? 'bg-green-500' :
                  event.type === 'meeting' ? 'bg-purple-500' : 'bg-orange-500'
                }`}></div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">{event.title}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {event.schedule?.days?.join(', ')} • {formatTime(event.schedule?.startTime)}-{formatTime(event.schedule?.endTime)} • {event.room}
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
    </div>
  );
};

export default Schedule;