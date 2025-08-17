import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { ChevronLeft, ChevronRight, CalendarDays, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Job {
  id: string;
  title: string;
  description: string;
  machine_id: string;
  priority: 'low' | 'medium' | 'urgent';
  status: string;
  created_at: string;
  scheduled_date?: string;
  machine?: {
    name: string;
    type: string;
    venue?: { name: string };
  };
}

interface JobsCalendarProps {
  onJobSelect?: (job: Job) => void;
}

const JobsCalendar: React.FC<JobsCalendarProps> = ({ onJobSelect }) => {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  const priorityConfig = {
    low: { label: 'Low', color: 'bg-green-500 text-white', icon: CheckCircle },
    medium: { label: 'Medium', color: 'bg-yellow-500 text-white', icon: Clock },
    urgent: { label: 'Urgent', color: 'bg-red-500 text-white', icon: AlertTriangle }
  };

  const getStatusConfig = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    const statusConfigs = {
      'open': { label: 'Open', color: 'bg-blue-500 text-white' },
      'in_progress': { label: 'In Progress', color: 'bg-orange-500 text-white' },
      'completed': { label: 'Completed', color: 'bg-green-500 text-white' },
      'pending': { label: 'Pending', color: 'bg-gray-500 text-white' }
    };
    return statusConfigs[normalizedStatus] || { label: status, color: 'bg-gray-500 text-white' };
  };

  useEffect(() => {
    fetchJobs();
  }, [currentDate]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      console.log('📅 Fetching jobs for calendar...');
      
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          machine:machines(
            name,
            type,
            venue:venues(name)
          )
        `)
        .order('scheduled_date', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching jobs:', error);
        throw error;
      }

      console.log('✅ Jobs fetched for calendar:', data?.length || 0);
      setJobs(data || []);
    } catch (error) {
      console.error('❌ Error fetching jobs for calendar:', error);
      toast({
        title: 'Error',
        description: 'Failed to load jobs for calendar',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Get jobs for a specific date
  const getJobsForDate = (date: Date): Job[] => {
    return jobs.filter(job => {
      if (job.scheduled_date) {
        try {
          const jobDate = parseISO(job.scheduled_date);
          return isSameDay(jobDate, date);
        } catch (error) {
          console.error('Error parsing scheduled_date:', job.scheduled_date, error);
          return false;
        }
      }
      return false;
    });
  };

  // Get all jobs scheduled for the current month
  const getJobsForMonth = (): Job[] => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    return jobs.filter(job => {
      if (job.scheduled_date) {
        try {
          const jobDate = parseISO(job.scheduled_date);
          return jobDate >= monthStart && jobDate <= monthEnd;
        } catch (error) {
          return false;
        }
      }
      return false;
    });
  };

  // Get jobs without scheduled dates
  const getUnscheduledJobs = (): Job[] => {
    return jobs.filter(job => !job.scheduled_date);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleJobClick = (job: Job) => {
    if (onJobSelect) {
      onJobSelect(job);
    }
  };

  const renderJobCard = (job: Job) => {
    const priorityInfo = priorityConfig[job.priority];
    const statusInfo = getStatusConfig(job.status);
    const PriorityIcon = priorityInfo.icon;

    return (
      <div
        key={job.id}
        className="p-2 mb-2 bg-white border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => handleJobClick(job)}
      >
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-medium text-sm truncate flex-1">{job.title}</h4>
          <div className="flex gap-1">
            <Badge className={`${priorityInfo.color} text-xs`}>
              <PriorityIcon className="h-2 w-2 mr-1" />
              {priorityInfo.label}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-gray-600 mb-1">
          {job.machine?.name} @ {job.machine?.venue?.name}
        </p>
        <Badge className={`${statusInfo.color} text-xs`}>
          {statusInfo.label}
        </Badge>
      </div>
    );
  };

  if (viewMode === 'list') {
    const monthJobs = getJobsForMonth();
    const unscheduledJobs = getUnscheduledJobs();

    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Jobs Schedule - {format(currentDate, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('calendar')}
              >
                Calendar View
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading jobs...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {monthJobs.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Scheduled Jobs ({monthJobs.length})</h3>
                  <div className="space-y-4">
                    {eachDayOfInterval({
                      start: startOfMonth(currentDate),
                      end: endOfMonth(currentDate)
                    }).map(date => {
                      const dayJobs = getJobsForDate(date);
                      if (dayJobs.length === 0) return null;

                      return (
                        <div key={date.toISOString()}>
                          <h4 className="font-medium text-blue-600 mb-2">
                            {format(date, 'EEEE, MMMM d')}
                          </h4>
                          <div className="ml-4 space-y-2">
                            {dayJobs.map(renderJobCard)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {unscheduledJobs.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Unscheduled Jobs ({unscheduledJobs.length})</h3>
                  <div className="space-y-2">
                    {unscheduledJobs.map(renderJobCard)}
                  </div>
                </div>
              )}

              {monthJobs.length === 0 && unscheduledJobs.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No jobs found for this month</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Jobs Calendar - {format(currentDate, 'MMMM yyyy')}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('list')}
            >
              List View
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading calendar...</p>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* Calendar header */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center font-medium text-gray-600 text-sm">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {eachDayOfInterval({
              start: startOfMonth(currentDate),
              end: endOfMonth(currentDate)
            }).map(date => {
              const dayJobs = getJobsForDate(date);
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              
              return (
                <div
                  key={date.toISOString()}
                  className={`p-1 min-h-[80px] border border-gray-200 cursor-pointer hover:bg-gray-50 ${
                    isSelected ? 'bg-blue-50 border-blue-300' : ''
                  }`}
                  onClick={() => setSelectedDate(date)}
                >
                  <div className="text-sm font-medium mb-1">
                    {format(date, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayJobs.slice(0, 2).map(job => {
                      const priorityInfo = priorityConfig[job.priority];
                      return (
                        <div
                          key={job.id}
                          className={`text-xs p-1 rounded ${priorityInfo.color} truncate`}
                          title={job.title}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJobClick(job);
                          }}
                        >
                          {job.title}
                        </div>
                      );
                    })}
                    {dayJobs.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{dayJobs.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {selectedDate && (
          <div className="mt-4 p-3 border-t">
            <h3 className="font-semibold mb-2">
              Jobs for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h3>
            <div className="space-y-2">
              {getJobsForDate(selectedDate).map(renderJobCard)}
              {getJobsForDate(selectedDate).length === 0 && (
                <p className="text-gray-500 text-sm">No jobs scheduled for this date</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default JobsCalendar;