import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface RunCalendarProps {
  runs: any[];
  onRunSelect?: (run: any) => void;
}

const RunCalendar: React.FC<RunCalendarProps> = ({ runs, onRunSelect }) => {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSchedules();
  }, [currentDate, runs]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      const { data, error } = await supabase
        .from('run_schedules')
        .select('*, runs(*)')
        .gte('scheduled_date', monthStart.toISOString().split('T')[0])
        .lte('scheduled_date', monthEnd.toISOString().split('T')[0])
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load calendar schedules',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getSchedulesForDate = (date: Date) => {
    return schedules.filter(schedule => {
      try {
        const scheduleDate = parseISO(schedule.scheduled_date);
        return isSameDay(scheduleDate, date);
      } catch (error) {
        return false;
      }
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  // Pad the start to align with day of week
  const firstDayOfMonth = startOfMonth(currentDate).getDay();
  const paddingDays = Array(firstDayOfMonth).fill(null);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Run Schedule - {format(currentDate, 'MMMM yyyy')}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
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
          <>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center font-semibold text-gray-600 text-sm">
                  {day}
                </div>
              ))}
              
              {/* Padding days */}
              {paddingDays.map((_, index) => (
                <div key={`padding-${index}`} className="p-1 min-h-[100px] border border-transparent"></div>
              ))}
              
              {/* Calendar days */}
              {monthDays.map(date => {
                const daySchedules = getSchedulesForDate(date);
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                const isToday = isSameDay(date, new Date());
                
                return (
                  <div
                    key={date.toISOString()}
                    className={`p-1 min-h-[100px] border cursor-pointer hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50 border-blue-300' : 'border-gray-200'
                    } ${isToday ? 'bg-yellow-50' : ''}`}
                    onClick={() => setSelectedDate(date)}
                  >
                    <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600 font-bold' : ''}`}>
                      {format(date, 'd')}
                    </div>
                    <div className="space-y-1">
                      {daySchedules.slice(0, 3).map(schedule => (
                        <div
                          key={schedule.id}
                          className={`text-xs p-1 rounded truncate cursor-pointer ${
                            schedule.completed 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}
                          title={schedule.runs?.name}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onRunSelect && schedule.runs) {
                              onRunSelect(schedule.runs);
                            }
                          }}
                        >
                          {schedule.runs?.name}
                        </div>
                      ))}
                      {daySchedules.length > 3 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{daySchedules.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Date Details */}
            {selectedDate && (
              <div className="mt-4 p-3 border-t">
                <h3 className="font-semibold mb-2">
                  Runs for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </h3>
                <div className="space-y-2">
                  {getSchedulesForDate(selectedDate).map(schedule => (
                    <div
                      key={schedule.id}
                      className="p-3 border rounded cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        if (onRunSelect && schedule.runs) {
                          onRunSelect(schedule.runs);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{schedule.runs?.name}</div>
                          {schedule.notes && (
                            <p className="text-sm text-gray-600 mt-1">{schedule.notes}</p>
                          )}
                        </div>
                        <Badge className={schedule.completed ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                          {schedule.completed ? 'Completed' : 'Scheduled'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {getSchedulesForDate(selectedDate).length === 0 && (
                    <p className="text-gray-500 text-sm">No runs scheduled for this date</p>
                  )}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="mt-4 pt-4 border-t flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded"></div>
                <span>Scheduled</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-50 border border-yellow-200 rounded"></div>
                <span>Today</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default RunCalendar;