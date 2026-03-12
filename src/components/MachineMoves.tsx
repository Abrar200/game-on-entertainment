import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Plus, Truck, ArrowRight, Package, CalendarIcon, X, Edit, CheckCircle,
  Clock, Search, Filter, XCircle, RotateCcw
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MachineMove {
  id: string;
  type: 'request' | 'relocation';
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  requested_venue_id?: string;
  machine_type?: string;
  quantity?: number;
  machine_id?: string;
  from_venue_id?: string;
  to_venue_id?: string;
  reason?: string;
  notes?: string;
  scheduled_date?: string;
  completed_at?: string;
  created_at: string;
  // joined
  machine_name?: string;
  from_venue_name?: string;
  to_venue_name?: string;
  requested_venue_name?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Pending',     color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  approved:    { label: 'Approved',    color: 'bg-blue-100 text-blue-800 border-blue-200' },
  in_progress: { label: 'In Progress', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  completed:   { label: 'Completed',   color: 'bg-green-100 text-green-800 border-green-200' },
  cancelled:   { label: 'Cancelled',   color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const BLANK_REQUEST = {
  requested_venue_id: '',
  machine_type: '',
  quantity: '1',
  reason: '',
  notes: '',
  scheduled_date: null as string | null,
};

const BLANK_RELOCATION = {
  machine_id: '',
  from_venue_id: '',
  to_venue_id: '',
  reason: '',
  notes: '',
  scheduled_date: null as string | null,
};

const MachineMoves: React.FC = () => {
  const { venues, machines } = useAppContext();
  const { toast } = useToast();

  const [moves, setMoves] = useState<MachineMove[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'request' | 'relocation'>('request');
  const [submitting, setSubmitting] = useState(false);
  const [editingMove, setEditingMove] = useState<MachineMove | null>(null);
  const [activeTab, setActiveTab] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [requestForm, setRequestForm] = useState({ ...BLANK_REQUEST });
  const [relocationForm, setRelocationForm] = useState({ ...BLANK_RELOCATION });

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchMoves = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('machine_moves')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const venueMap = Object.fromEntries(venues.map(v => [v.id, v.name]));
      const machineMap = Object.fromEntries(machines.map(m => [m.id, m.name]));

      const enriched: MachineMove[] = (data || []).map(row => ({
        ...row,
        machine_name: row.machine_id ? machineMap[row.machine_id] : undefined,
        from_venue_name: row.from_venue_id ? venueMap[row.from_venue_id] : undefined,
        to_venue_name: row.to_venue_id ? venueMap[row.to_venue_id] : undefined,
        requested_venue_name: row.requested_venue_id ? venueMap[row.requested_venue_id] : undefined,
      }));

      setMoves(enriched);
    } catch (err: any) {
      console.error('Error fetching machine moves:', err);
      toast({ title: 'Error', description: 'Failed to load machine moves', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMoves(); }, [venues, machines]);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (formType === 'request') {
        if (!requestForm.machine_type.trim()) {
          toast({ title: 'Validation', description: 'Machine type is required', variant: 'destructive' });
          return;
        }
        await supabase.from('machine_moves').insert([{
          type: 'request',
          status: 'pending',
          requested_venue_id: requestForm.requested_venue_id || null,
          machine_type: requestForm.machine_type.trim(),
          quantity: parseInt(requestForm.quantity) || 1,
          reason: requestForm.reason.trim() || null,
          notes: requestForm.notes.trim() || null,
          scheduled_date: requestForm.scheduled_date || null,
        }]);
      } else {
        if (!relocationForm.machine_id || !relocationForm.to_venue_id) {
          toast({ title: 'Validation', description: 'Machine and destination venue are required', variant: 'destructive' });
          return;
        }
        const machine = machines.find(m => m.id === relocationForm.machine_id);
        await supabase.from('machine_moves').insert([{
          type: 'relocation',
          status: 'pending',
          machine_id: relocationForm.machine_id,
          from_venue_id: relocationForm.from_venue_id || machine?.venue_id || null,
          to_venue_id: relocationForm.to_venue_id,
          reason: relocationForm.reason.trim() || null,
          notes: relocationForm.notes.trim() || null,
          scheduled_date: relocationForm.scheduled_date || null,
        }]);
      }

      toast({ title: 'Success', description: `${formType === 'request' ? 'Request' : 'Relocation'} created!` });
      setShowForm(false);
      setRequestForm({ ...BLANK_REQUEST });
      setRelocationForm({ ...BLANK_RELOCATION });
      await fetchMoves();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Update status ────────────────────────────────────────────────────────────
  const updateStatus = async (id: string, status: string) => {
    try {
      const updates: any = { status };
      if (status === 'completed') updates.completed_at = new Date().toISOString();
      await supabase.from('machine_moves').update(updates).eq('id', id);
      toast({ title: 'Updated', description: `Status changed to ${STATUS_CONFIG[status]?.label}` });
      await fetchMoves();
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  // ── Edit save ────────────────────────────────────────────────────────────────
  const handleEditSave = async () => {
    if (!editingMove) return;
    try {
      await supabase.from('machine_moves')
        .update({
          reason: editingMove.reason,
          notes: editingMove.notes,
          scheduled_date: editingMove.scheduled_date || null,
          status: editingMove.status,
        })
        .eq('id', editingMove.id);
      toast({ title: 'Saved' });
      setEditingMove(null);
      await fetchMoves();
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
    }
  };

  // ── Filtering ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return moves.filter(m => {
      const isActive = m.status !== 'completed' && m.status !== 'cancelled';
      const tabMatch = activeTab === 'active' ? isActive : !isActive;
      const typeMatch = activeTab === 'requests'
        ? m.type === 'request'
        : activeTab === 'relocations'
        ? m.type === 'relocation'
        : tabMatch;
      const statusMatch = statusFilter === 'all' || m.status === statusFilter;
      const searchMatch = !q || [
        m.machine_name, m.from_venue_name, m.to_venue_name,
        m.requested_venue_name, m.machine_type, m.reason, m.notes,
      ].some(v => v?.toLowerCase().includes(q));
      return typeMatch && statusMatch && searchMatch;
    });
  }, [moves, activeTab, statusFilter, searchTerm]);

  // ── Machine auto-fill from_venue when selecting machine ──────────────────────
  const handleMachineSelect = (machineId: string) => {
    const m = machines.find(x => x.id === machineId);
    setRelocationForm(f => ({
      ...f,
      machine_id: machineId,
      from_venue_id: m?.venue_id || '',
    }));
  };

  // ── Card render ──────────────────────────────────────────────────────────────
  const renderCard = (move: MachineMove) => {
    const statusCfg = STATUS_CONFIG[move.status] || STATUS_CONFIG.pending;
    const isRequest = move.type === 'request';

    return (
      <Card key={move.id} className={`border-l-4 ${isRequest ? 'border-l-purple-400' : 'border-l-blue-400'}`}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Type + status row */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Badge variant="outline" className={isRequest ? 'border-purple-300 text-purple-700' : 'border-blue-300 text-blue-700'}>
                  {isRequest ? <><Package className="h-3 w-3 mr-1" />New Machine Request</> : <><Truck className="h-3 w-3 mr-1" />Relocation</>}
                </Badge>
                <Badge className={`text-xs border ${statusCfg.color}`}>{statusCfg.label}</Badge>
                {move.scheduled_date && (
                  <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {format(parseISO(move.scheduled_date), 'd MMM yyyy')}
                  </Badge>
                )}
              </div>

              {/* Main info */}
              {isRequest ? (
                <div className="text-sm space-y-0.5">
                  <p><span className="text-gray-500">Type:</span> <strong>{move.machine_type}</strong>{move.quantity && move.quantity > 1 ? ` × ${move.quantity}` : ''}</p>
                  {move.requested_venue_name && (
                    <p><span className="text-gray-500">For venue:</span> <strong>{move.requested_venue_name}</strong></p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <strong className="text-gray-800">{move.machine_name || 'Unknown machine'}</strong>
                  {move.from_venue_name && (
                    <>
                      <span className="text-gray-400">from</span>
                      <span className="font-medium">{move.from_venue_name}</span>
                    </>
                  )}
                  <ArrowRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="font-medium text-blue-700">{move.to_venue_name || '—'}</span>
                </div>
              )}

              {move.reason && <p className="text-xs text-gray-500 mt-1">Reason: {move.reason}</p>}
              {move.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{move.notes}</p>}

              <p className="text-xs text-gray-400 mt-2">
                Created {format(new Date(move.created_at), 'd MMM yyyy')}
                {move.completed_at && ` · Completed ${format(new Date(move.completed_at), 'd MMM yyyy')}`}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1.5 shrink-0">
              {move.status !== 'completed' && move.status !== 'cancelled' && (
                <>
                  {move.status === 'pending' && (
                    <Button size="sm" variant="outline" className="text-xs text-blue-600 border-blue-300"
                      onClick={() => updateStatus(move.id, 'approved')}>
                      Approve
                    </Button>
                  )}
                  {move.status === 'approved' && (
                    <Button size="sm" variant="outline" className="text-xs text-orange-600 border-orange-300"
                      onClick={() => updateStatus(move.id, 'in_progress')}>
                      Start
                    </Button>
                  )}
                  {(move.status === 'approved' || move.status === 'in_progress') && (
                    <Button size="sm" className="text-xs bg-green-600 hover:bg-green-700"
                      onClick={() => updateStatus(move.id, 'completed')}>
                      <CheckCircle className="h-3 w-3 mr-1" />Complete
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="text-xs"
                    onClick={() => setEditingMove(move)}>
                    <Edit className="h-3 w-3 mr-1" />Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs text-red-500"
                    onClick={() => updateStatus(move.id, 'cancelled')}>
                    <XCircle className="h-3 w-3 mr-1" />Cancel
                  </Button>
                </>
              )}
              {(move.status === 'completed' || move.status === 'cancelled') && (
                <Button size="sm" variant="ghost" className="text-xs text-gray-500"
                  onClick={() => updateStatus(move.id, 'pending')}>
                  <RotateCcw className="h-3 w-3 mr-1" />Reopen
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="h-6 w-6 text-blue-600" />
            Machine Moves & Requests
          </h2>
          <p className="text-sm text-gray-500 mt-1">Track machine orders and relocations between venues</p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={showForm} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />New
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="border-2 border-blue-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-blue-800">Create New Entry</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setRequestForm({ ...BLANK_REQUEST }); setRelocationForm({ ...BLANK_RELOCATION }); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* Type toggle */}
            <div className="flex gap-2 mt-2">
              {(['request', 'relocation'] as const).map(t => (
                <Button
                  key={t}
                  type="button"
                  size="sm"
                  variant={formType === t ? 'default' : 'outline'}
                  onClick={() => setFormType(t)}
                >
                  {t === 'request' ? <><Package className="h-4 w-4 mr-1.5" />New Machine Request</> : <><Truck className="h-4 w-4 mr-1.5" />Relocation</>}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formType === 'request' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Machine Type *</Label>
                      <Input
                        value={requestForm.machine_type}
                        onChange={e => setRequestForm(f => ({ ...f, machine_type: e.target.value }))}
                        placeholder="e.g. Claw Machine, Crane, Prize Vending"
                        required
                      />
                    </div>
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number" min="1"
                        value={requestForm.quantity}
                        onChange={e => setRequestForm(f => ({ ...f, quantity: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Venue (optional)</Label>
                    <Select value={requestForm.requested_venue_id || 'none'} onValueChange={v => setRequestForm(f => ({ ...f, requested_venue_id: v === 'none' ? '' : v }))}>
                      <SelectTrigger><SelectValue placeholder="Select venue" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        {venues.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label>Machine *</Label>
                    <Select value={relocationForm.machine_id || 'none'} onValueChange={v => v !== 'none' && handleMachineSelect(v)}>
                      <SelectTrigger><SelectValue placeholder="Select machine" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select a machine</SelectItem>
                        {machines.map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}{m.venue?.name ? ` — ${m.venue.name}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>From Venue</Label>
                      <Select value={relocationForm.from_venue_id || 'none'} onValueChange={v => setRelocationForm(f => ({ ...f, from_venue_id: v === 'none' ? '' : v }))}>
                        <SelectTrigger><SelectValue placeholder="Current venue" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None / Warehouse</SelectItem>
                          {venues.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>To Venue *</Label>
                      <Select value={relocationForm.to_venue_id || 'none'} onValueChange={v => setRelocationForm(f => ({ ...f, to_venue_id: v === 'none' ? '' : v }))}>
                        <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select destination</SelectItem>
                          {venues.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              {/* Common fields */}
              <div>
                <Label>Reason</Label>
                <Input
                  value={formType === 'request' ? requestForm.reason : relocationForm.reason}
                  onChange={e => formType === 'request'
                    ? setRequestForm(f => ({ ...f, reason: e.target.value }))
                    : setRelocationForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Why is this needed?"
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formType === 'request' ? requestForm.notes : relocationForm.notes}
                  onChange={e => formType === 'request'
                    ? setRequestForm(f => ({ ...f, notes: e.target.value }))
                    : setRelocationForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Additional information..."
                  rows={2}
                />
              </div>
              <div>
                <Label>Scheduled Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !(formType === 'request' ? requestForm.scheduled_date : relocationForm.scheduled_date) && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {(formType === 'request' ? requestForm.scheduled_date : relocationForm.scheduled_date)
                        ? format(parseISO((formType === 'request' ? requestForm.scheduled_date : relocationForm.scheduled_date)!), 'PPP')
                        : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={(formType === 'request' ? requestForm.scheduled_date : relocationForm.scheduled_date)
                        ? parseISO((formType === 'request' ? requestForm.scheduled_date : relocationForm.scheduled_date)!)
                        : undefined}
                      onSelect={d => {
                        const val = d ? d.toISOString().split('T')[0] : null;
                        formType === 'request'
                          ? setRequestForm(f => ({ ...f, scheduled_date: val }))
                          : setRelocationForm(f => ({ ...f, scheduled_date: val }));
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={submitting} className="bg-green-600 hover:bg-green-700">
                  {submitting ? 'Creating...' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setRequestForm({ ...BLANK_REQUEST }); setRelocationForm({ ...BLANK_RELOCATION }); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input className="pl-9" placeholder="Search machine, venue, reason…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-1.5 text-gray-400" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(searchTerm || statusFilter !== 'all') && (
          <Button variant="ghost" size="sm" className="text-xs text-gray-500" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">
            <Clock className="h-4 w-4 mr-1.5" />
            Active ({moves.filter(m => m.status !== 'completed' && m.status !== 'cancelled').length})
          </TabsTrigger>
          <TabsTrigger value="requests">
            <Package className="h-4 w-4 mr-1.5" />
            Requests ({moves.filter(m => m.type === 'request').length})
          </TabsTrigger>
          <TabsTrigger value="relocations">
            <Truck className="h-4 w-4 mr-1.5" />
            Relocations ({moves.filter(m => m.type === 'relocation').length})
          </TabsTrigger>
          <TabsTrigger value="done">
            <CheckCircle className="h-4 w-4 mr-1.5" />
            Done ({moves.filter(m => m.status === 'completed' || m.status === 'cancelled').length})
          </TabsTrigger>
        </TabsList>

        {['active', 'requests', 'relocations', 'done'].map(tab => (
          <TabsContent key={tab} value={tab} className="space-y-3 mt-4">
            {loading ? (
              <div className="py-12 text-center text-gray-400 text-sm">Loading...</div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Truck className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-400 text-sm">
                    {searchTerm || statusFilter !== 'all' ? 'No entries match your filters.' : 'Nothing here yet.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filtered.map(renderCard)
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit dialog */}
      <Dialog open={!!editingMove} onOpenChange={() => setEditingMove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Entry</DialogTitle>
          </DialogHeader>
          {editingMove && (
            <div className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select value={editingMove.status} onValueChange={v => setEditingMove(m => m ? { ...m, status: v as any } : m)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason</Label>
                <Input value={editingMove.reason || ''} onChange={e => setEditingMove(m => m ? { ...m, reason: e.target.value } : m)} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={editingMove.notes || ''} onChange={e => setEditingMove(m => m ? { ...m, notes: e.target.value } : m)} rows={3} />
              </div>
              <div>
                <Label>Scheduled Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editingMove.scheduled_date ? format(parseISO(editingMove.scheduled_date), 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editingMove.scheduled_date ? parseISO(editingMove.scheduled_date) : undefined}
                      onSelect={d => setEditingMove(m => m ? { ...m, scheduled_date: d ? d.toISOString().split('T')[0] : undefined } : m)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleEditSave}>Save</Button>
                <Button variant="outline" onClick={() => setEditingMove(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MachineMoves;