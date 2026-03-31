import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ChevronLeft, ChevronRight, CalendarDays, Clock, AlertTriangle,
  CheckCircle, Truck, Wrench, Route, Plus, CalendarIcon, X
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, parseISO, addMonths, subMonths, isToday, getDay, startOfWeek, addDays
} from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';

// ── Types ────────────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  type: 'job' | 'run' | 'move';
  title: string;
  date: string;
  color: string;
  meta?: Record<string, any>;
}

// ── Colour palette for runs (consistent per run name/id) ─────────────────────
const RUN_COLOURS = [
  '#2563eb', '#16a34a', '#9333ea', '#ea580c', '#0891b2',
  '#be185d', '#854d0e', '#065f46', '#1e40af', '#7c3aed',
];

const hashColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return RUN_COLOURS[Math.abs(hash) % RUN_COLOURS.length];
};

const JOB_PRIORITY_COLORS: Record<string, string> = {
  urgent: '#dc2626',
  high:   '#ea580c',
  medium: '#ca8a04',
  low:    '#16a34a',
};

const MOVE_COLOR = '#7c3aed';

// ── Main Component ────────────────────────────────────────────────────────────

const UnifiedCalendar: React.FC = () => {
  const { venues, machines } = useAppContext();
  const { toast } = useToast();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'job' | 'run' | 'move'>('all');

  // New event form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormDate, setAddFormDate] = useState<Date | null>(null);
  const [addFormType, setAddFormType] = useState<'job' | 'move'>('job');
  const [addFormTitle, setAddFormTitle] = useState('');
  const [addFormNotes, setAddFormNotes] = useState('');
  const [addFormMachineId, setAddFormMachineId] = useState('');
  const [addFormPriority, setAddFormPriority] = useState<'low' | 'medium' | 'urgent'>('medium');
  const [addFormVenueId, setAddFormVenueId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchEvents(); }, [currentDate, machines, venues]);

  const fetchEvents = async () => {
    setLoading(true);
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startStr = monthStart.toISOString().split('T')[0];
    const endStr = monthEnd.toISOString().split('T')[0];

    try {
      // Jobs — fetch all jobs with a scheduled_date, filter client-side by month
      // (avoids timestamp vs date string comparison issues in PostgREST)
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, title, priority, scheduled_date, status, machine:machines(name, venue:venues(name))')
        .not('scheduled_date', 'is', null)
        .neq('archived', true);

      if (jobsError) console.warn('Calendar jobs error:', jobsError.message);

      // Run schedules — use same query pattern as the working RunCalendar
      const { data: runSchedules, error: runsError } = await supabase
        .from('run_schedules')
        .select('*, runs(*)')
        .gte('scheduled_date', startStr)
        .lte('scheduled_date', endStr)
        .order('scheduled_date', { ascending: true });

      if (runsError) console.warn('Calendar runs error:', runsError.message);

      // Machine moves — use simple wildcard select, resolve names from context
      let moves: any[] = [];
      try {
        const { data: movesData, error: movesError } = await supabase
          .from('machine_moves')
          .select('*')
          .not('scheduled_date', 'is', null)
          .gte('scheduled_date', startStr)
          .lte('scheduled_date', endStr)
          .neq('status', 'cancelled');
        if (!movesError) moves = movesData || [];
        else console.warn('Calendar moves error:', movesError.message);
      } catch (e) {
        console.warn('machine_moves table not available yet');
      }

      const newEvents: CalendarEvent[] = [];

      // Process jobs — filter by month client-side to handle timestamp vs date comparison
      (jobs || []).forEach(job => {
        if (!job.scheduled_date) return;
        const jobDateStr = job.scheduled_date.split('T')[0];
        // Only include jobs in the current month
        if (jobDateStr < startStr || jobDateStr > endStr) return;
        const color = JOB_PRIORITY_COLORS[job.priority] || '#ca8a04';
        newEvents.push({
          id: job.id,
          type: 'job',
          title: job.title,
          date: jobDateStr,
          color,
          meta: {
            priority: job.priority,
            status: job.status,
            machine: (job.machine as any)?.name,
            venue: (job.machine as any)?.venue?.name,
          },
        });
      });

      // Process run schedules — each run gets a consistent colour
      (runSchedules || []).forEach(schedule => {
        const run = schedule.runs as any;
        if (!run || !schedule.scheduled_date) return;
        const runName = run.name || 'Run';
        const color = hashColor(run.id || runName);
        newEvents.push({
          id: schedule.id,
          type: 'run',
          title: runName,
          date: schedule.scheduled_date,
          color,
          meta: {
            runId: run.id,
            completed: schedule.completed,
            repeat: run.repeat_type || run.schedule_type || null,
          },
        });
      });

      // Process machine moves — resolve names from context
      const machineMap = Object.fromEntries(machines.map(m => [m.id, m.name]));
      const venueMap = Object.fromEntries(venues.map(v => [v.id, v.name]));

      moves.forEach(move => {
        const machineName = move.machine_id ? machineMap[move.machine_id] : null;
        const toVenueName = move.to_venue_id ? venueMap[move.to_venue_id] : null;
        const title = move.type === 'request'
          ? `Request: ${move.machine_type || 'New Machine'}`
          : `Move: ${machineName || 'Machine'}${toVenueName ? ` → ${toVenueName}` : ''}`;
        newEvents.push({
          id: move.id,
          type: 'move',
          title,
          date: move.scheduled_date,
          color: MOVE_COLOR,
          meta: { status: move.status, moveType: move.type, machineName, toVenueName },
        });
      });

      console.log(`Calendar: loaded ${newEvents.length} events (${newEvents.filter(e=>e.type==='job').length} jobs, ${newEvents.filter(e=>e.type==='run').length} runs, ${newEvents.filter(e=>e.type==='move').length} moves)`);
      setEvents(newEvents);
    } catch (err) {
      console.error('Calendar fetch error:', err);
      toast({ title: 'Error', description: 'Failed to load calendar', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ── Calendar grid ───────────────────────────────────────────────────────────

  const monthDays = useMemo(() => {
    const days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
    return days;
  }, [currentDate]);

  const paddingDays = useMemo(() => {
    const firstDow = getDay(startOfMonth(currentDate));
    return Array(firstDow).fill(null);
  }, [currentDate]);

  const getEventsForDay = (date: Date): CalendarEvent[] => {
    const str = format(date, 'yyyy-MM-dd');
    return events.filter(e => {
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      return e.date === str;
    });
  };

  // ── Add event ───────────────────────────────────────────────────────────────

  const openAddForm = (date: Date) => {
    setAddFormDate(date);
    setAddFormTitle('');
    setAddFormNotes('');
    setAddFormMachineId('');
    setAddFormPriority('medium');
    setAddFormVenueId('');
    setShowAddForm(true);
  };

  const handleAddSubmit = async () => {
    if (!addFormDate || !addFormTitle.trim()) return;
    setSubmitting(true);
    try {
      const dateStr = format(addFormDate, 'yyyy-MM-dd');
      if (addFormType === 'job') {
        if (!addFormMachineId) {
          toast({ title: 'Validation', description: 'Please select a machine', variant: 'destructive' });
          return;
        }
        await supabase.from('jobs').insert([{
          title: addFormTitle.trim(),
          description: addFormNotes.trim() || null,
          machine_id: addFormMachineId,
          priority: addFormPriority,
          status: 'pending',
          scheduled_date: new Date(dateStr).toISOString(),
        }]);
        toast({ title: 'Job created!' });
      } else {
        await supabase.from('machine_moves').insert([{
          type: 'relocation',
          status: 'pending',
          to_venue_id: addFormVenueId || null,
          notes: addFormNotes.trim() || null,
          scheduled_date: dateStr,
        }]);
        toast({ title: 'Move scheduled!' });
      }
      setShowAddForm(false);
      fetchEvents();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Event detail update ──────────────────────────────────────────────────────

  const handleReschedule = async (event: CalendarEvent, newDate: Date) => {
    try {
      const dateStr = format(newDate, 'yyyy-MM-dd');
      if (event.type === 'job') {
        await supabase.from('jobs').update({ scheduled_date: new Date(dateStr).toISOString() }).eq('id', event.id);
      } else if (event.type === 'run') {
        await supabase.from('run_schedules').update({ scheduled_date: dateStr }).eq('id', event.id);
      } else if (event.type === 'move') {
        await supabase.from('machine_moves').update({ scheduled_date: dateStr }).eq('id', event.id);
      }
      toast({ title: 'Rescheduled', description: `Moved to ${format(newDate, 'd MMM yyyy')}` });
      setSelectedEvent(null);
      fetchEvents();
    } catch (err: any) {
      toast({ title: 'Error', description: 'Could not reschedule', variant: 'destructive' });
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  const typeIcon = (type: string) => {
    if (type === 'job') return <Wrench className="h-3 w-3" />;
    if (type === 'run') return <Route className="h-3 w-3" />;
    return <Truck className="h-3 w-3" />;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-blue-600" />
            Calendar
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Jobs, runs and machine moves in one view</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type filter */}
          <div className="flex rounded-lg border overflow-hidden text-xs">
            {(['all', 'job', 'run', 'move'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 capitalize font-medium transition-colors ${
                  typeFilter === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t === 'all' ? 'All' : t === 'job' ? 'Jobs' : t === 'run' ? 'Runs' : 'Moves'}
              </button>
            ))}
          </div>
          {/* Month nav */}
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => openAddForm(selectedDate || new Date())}>
            <Plus className="h-4 w-4 mr-1.5" />Add
          </Button>
        </div>
      </div>

      {/* Month label + event count */}
      <div className="flex items-center gap-3">
        <p className="text-lg font-semibold text-gray-700">{format(currentDate, 'MMMM yyyy')}</p>
        {!loading && (
          <span className="text-sm text-gray-400">
            {events.length === 0
              ? 'No scheduled events this month'
              : `${events.length} event${events.length !== 1 ? 's' : ''} this month`}
          </span>
        )}
        {!loading && events.length === 0 && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
            Jobs only appear if they have a scheduled date set
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-600">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-red-600" />Urgent job</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-yellow-500" />Medium job</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-green-600" />Low job</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-blue-600" />Run (colour per run)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-purple-600" />Machine move</span>
      </div>

      {/* Calendar grid */}
      <Card>
        <CardContent className="p-2 pt-3">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded overflow-hidden">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="bg-gray-50 px-1 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {d}
                </div>
              ))}

              {/* Padding */}
              {paddingDays.map((_, i) => (
                <div key={`pad-${i}`} className="bg-white min-h-[90px]" />
              ))}

              {/* Days */}
              {monthDays.map(date => {
                const dayEvents = getEventsForDay(date);
                const today = isToday(date);
                const selected = selectedDate && isSameDay(date, selectedDate);

                return (
                  <div
                    key={date.toISOString()}
                    className={`bg-white min-h-[90px] p-1 cursor-pointer hover:bg-blue-50 transition-colors ${
                      selected ? 'ring-2 ring-inset ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedDate(isSameDay(date, selectedDate || new Date(-1)) ? null : date)}
                  >
                    <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                      today ? 'bg-blue-600 text-white' : 'text-gray-700'
                    }`}>
                      {format(date, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map(ev => (
                        <div
                          key={ev.id}
                          className="text-xs px-1 py-0.5 rounded truncate text-white font-medium flex items-center gap-0.5"
                          style={{ backgroundColor: ev.color }}
                          title={ev.title}
                          onClick={e => { e.stopPropagation(); setSelectedEvent(ev); }}
                        >
                          {typeIcon(ev.type)}
                          <span className="truncate">{ev.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <button
                          className="text-xs text-blue-500 hover:text-blue-700 font-medium pl-1 w-full text-left"
                          onClick={e => { e.stopPropagation(); setSelectedDate(date); }}
                        >
                          +{dayEvents.length - 3} more
                        </button>
                      )}
                    </div>
                    {/* Quick add button on hover */}
                    <button
                      className="mt-1 w-full text-xs text-gray-300 hover:text-blue-400 transition-colors text-left pl-0.5 opacity-0 hover:opacity-100 group-hover:opacity-100"
                      onClick={e => { e.stopPropagation(); openAddForm(date); }}
                    >
                      <Plus className="h-3 w-3 inline" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Day detail dialog — opens when clicking a date or +more */}
      <Dialog open={!!selectedDate} onOpenChange={open => { if (!open) setSelectedDate(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>
                {selectedDate && format(selectedDate, 'EEEE, d MMMM yyyy')}
                {selectedDayEvents.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{selectedDayEvents.length}</Badge>
                )}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-1">
            <Button size="sm" variant="outline" className="w-full text-xs mb-2"
              onClick={() => { if (selectedDate) { openAddForm(selectedDate); setSelectedDate(null); } }}>
              <Plus className="h-3 w-3 mr-1" />Add something on this day
            </Button>
            {selectedDayEvents.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nothing scheduled — use the button above to add something.</p>
            ) : (
              selectedDayEvents.map(ev => (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer hover:bg-gray-50"
                  onClick={() => { setSelectedEvent(ev); setSelectedDate(null); }}
                >
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{ev.title}</p>
                    {ev.meta?.machine && (
                      <p className="text-xs text-gray-500">{ev.meta.machine}{ev.meta.venue ? ` @ ${ev.meta.venue}` : ''}</p>
                    )}
                    {ev.meta?.machineName && !ev.meta?.machine && (
                      <p className="text-xs text-gray-500">{ev.meta.machineName}{ev.meta.toVenueName ? ` → ${ev.meta.toVenueName}` : ''}</p>
                    )}
                    {ev.meta?.status && (
                      <p className="text-xs text-gray-400 capitalize">{ev.meta.status}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs capitalize shrink-0"
                    style={{ borderColor: ev.color, color: ev.color }}>
                    {ev.type}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Event detail dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent && <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: selectedEvent.color }} />}
              {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="text-sm space-y-1 text-gray-600">
                <p><span className="font-medium">Type:</span> <span className="capitalize">{selectedEvent.type}</span></p>
                <p><span className="font-medium">Date:</span> {format(parseISO(selectedEvent.date), 'd MMMM yyyy')}</p>
                {selectedEvent.meta?.machine && <p><span className="font-medium">Machine:</span> {selectedEvent.meta.machine}</p>}
                {selectedEvent.meta?.venue && <p><span className="font-medium">Venue:</span> {selectedEvent.meta.venue}</p>}
                {selectedEvent.meta?.status && <p><span className="font-medium">Status:</span> <span className="capitalize">{selectedEvent.meta.status}</span></p>}
                {selectedEvent.meta?.priority && <p><span className="font-medium">Priority:</span> <span className="capitalize">{selectedEvent.meta.priority}</span></p>}
                {selectedEvent.meta?.repeat && <p><span className="font-medium">Repeats:</span> {selectedEvent.meta.repeat}</p>}
              </div>

              {/* Reschedule */}
              <div>
                <Label className="text-sm font-medium">Reschedule to</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full mt-1 justify-start font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      Pick a new date
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      onSelect={d => { if (d) handleReschedule(selectedEvent, d); }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Button variant="outline" className="w-full" onClick={() => setSelectedEvent(null)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add event dialog */}
      <Dialog open={showAddForm} onOpenChange={() => setShowAddForm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add to Calendar{addFormDate ? ` — ${format(addFormDate, 'd MMM yyyy')}` : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Type selector */}
            <div className="flex gap-2">
              {(['job', 'move'] as const).map(t => (
                <Button
                  key={t}
                  size="sm"
                  variant={addFormType === t ? 'default' : 'outline'}
                  onClick={() => setAddFormType(t)}
                >
                  {t === 'job' ? <><Wrench className="h-3.5 w-3.5 mr-1.5" />Job</> : <><Truck className="h-3.5 w-3.5 mr-1.5" />Machine Move</>}
                </Button>
              ))}
            </div>

            <div>
              <Label>Title *</Label>
              <Input value={addFormTitle} onChange={e => setAddFormTitle(e.target.value)} placeholder="Enter title..." />
            </div>

            {addFormType === 'job' && (
              <>
                <div>
                  <Label>Machine *</Label>
                  <Select value={addFormMachineId || 'none'} onValueChange={v => setAddFormMachineId(v === 'none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Select machine" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select a machine</SelectItem>
                      {machines.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={addFormPriority} onValueChange={(v: any) => setAddFormPriority(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {addFormType === 'move' && (
              <div>
                <Label>Destination Venue</Label>
                <Select value={addFormVenueId || 'none'} onValueChange={v => setAddFormVenueId(v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Select venue" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    {venues.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Notes</Label>
              <Textarea value={addFormNotes} onChange={e => setAddFormNotes(e.target.value)} rows={2} placeholder="Optional notes..." />
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={handleAddSubmit} disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                {submitting ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnifiedCalendar;