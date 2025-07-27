import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { findMachineByBarcode as findMachineByBarcodeMethod } from './AppContextMethods';

interface Venue {
  id: string;
  name: string;
  address?: string;
  contact_person?: string;
  phone?: string;
  image_url?: string;
  commission_percentage: number;
}

interface Machine {
  id: string;
  name: string;
  type: string;
  venue_id?: string | null;
  status: string;
  image_url?: string;
  earnings?: number;
  venue?: Venue;
  current_prize_id?: string | null;
  current_prize?: Prize;
  serial_number?: string;
  barcode?: string;
}

interface Prize {
  id: string;
  name: string;
  cost: number;
  stock_quantity: number;
  image_url?: string;
}

interface MachineStock {
  machine_id: string;
  prize_id: string;
  quantity: number;
}

interface MachineReport {
  id: string;
  machine_id: string;
  money_collected: number;
  prize_value: number;
  toys_dispensed: number;
  current_toy_count: number;
  previous_toy_count: number;
  created_at: string;
  report_date?: string;
}

interface AppContextType {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  venues: Venue[];
  machines: Machine[];
  prizes: Prize[];
  machineStock: MachineStock[];
  currentView: string;
  setCurrentView: (view: string) => void;
  addVenue: (venue: Omit<Venue, 'id'>) => Promise<void>;
  deleteVenue: (id: string) => Promise<void>;
  updateVenue: (id: string, venue: Partial<Venue>) => Promise<void>;
  addMachine: (machine: Omit<Machine, 'id'>) => Promise<void>;
  deleteMachine: (id: string) => Promise<void>;
  addPrize: (prize: Omit<Prize, 'id'>) => Promise<void>;
  deletePrize: (id: string) => Promise<void>;
  updatePrize: (id: string, prize: Partial<Prize>) => Promise<void>;
  updatePrizeStock: (id: string, quantity: number) => Promise<void>;
  addMachineStock: (stock: MachineStock) => Promise<void>;
  refreshData: () => Promise<void>;
  companyLogo: string;
  setCompanyLogo: (logo: string) => void;
  getLatestReport: (machineId: string) => MachineReport | null;
  calculatePayoutPercentage: (machineId: string) => number | null;
  findMachineByBarcode: (barcode: string) => Promise<Machine>;
  selectedMachineForHistory: Machine | null;
  setSelectedMachineForHistory: (machine: Machine | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

const generateBarcode = (name: string, serialNumber: string): string => {
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
  const cleanSerial = serialNumber?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || '';
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${cleanName}_${cleanSerial}_${timestamp}_${random}`;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [machineStock, setMachineStock] = useState<MachineStock[]>([]);
  const [reports, setReports] = useState<MachineReport[]>([]);
  const [companyLogo, setCompanyLogo] = useState('');
  const [selectedMachineForHistory, setSelectedMachineForHistory] = useState<Machine | null>(null);
  const { toast } = useToast();

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  useEffect(() => {
    const savedLogo = localStorage.getItem('companyLogo');
    if (savedLogo) {
      setCompanyLogo(savedLogo);
    }
  }, []);

  const handleSetCompanyLogo = (logo: string) => {
    setCompanyLogo(logo);
    if (logo) {
      localStorage.setItem('companyLogo', logo);
    } else {
      localStorage.removeItem('companyLogo');
    }
  };

  const refreshData = async () => {
    try {
      const [venuesRes, machinesRes, prizesRes, reportsRes, stockRes] = await Promise.all([
        supabase.from('venues').select('*'),
        supabase.from('machines').select('*, venues(*), prizes(*)'),
        supabase.from('prizes').select('*'),
        supabase.from('machine_reports').select('*').order('report_date', { ascending: false }),
        supabase.from('machine_stock').select('*')
      ]);
      
      if (venuesRes.data) setVenues(venuesRes.data);
      if (machinesRes.data) {
        setMachines(machinesRes.data.map(m => ({ 
          ...m, 
          venue: Array.isArray(m.venues) ? m.venues[0] : m.venues,
          current_prize: Array.isArray(m.prizes) ? m.prizes[0] : m.prizes
        })));
      }
      if (prizesRes.data) setPrizes(prizesRes.data);
      if (reportsRes.data) setReports(reportsRes.data);
      if (stockRes.data) setMachineStock(stockRes.data);
    } catch (error) {
      console.error('Data refresh error:', error);
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    }
  };

  const addMachine = async (machine: any) => {
    const barcode = generateBarcode(machine.name, machine.serial_number || '');
    const machineWithBarcode = { ...machine, barcode };
    
    const { error } = await supabase.from('machines').insert([machineWithBarcode]);
    if (error) throw error;
    await refreshData();
  };

  const deleteMachine = async (id: string) => {
    const { error } = await supabase.from('machines').delete().eq('id', id);
    if (error) throw error;
    await refreshData();
  };

  const addVenue = async (venue: any) => {
    const { error } = await supabase.from('venues').insert([venue]);
    if (error) throw error;
    await refreshData();
  };

  const deleteVenue = async (id: string) => {
    const { error } = await supabase.from('venues').delete().eq('id', id);
    if (error) throw error;
    await refreshData();
  };

  const updateVenue = async (id: string, venue: Partial<Venue>) => {
    const { error } = await supabase.from('venues').update(venue).eq('id', id);
    if (error) throw error;
    await refreshData();
    toast({ title: 'Success', description: 'Venue updated successfully' });
  };

  const addPrize = async (prize: any) => {
    const { error } = await supabase.from('prizes').insert([prize]);
    if (error) throw error;
    await refreshData();
  };

  const deletePrize = async (id: string) => {
    const { error } = await supabase.from('prizes').delete().eq('id', id);
    if (error) throw error;
    await refreshData();
  };

  const updatePrize = async (id: string, prize: Partial<Prize>) => {
    const { error } = await supabase.from('prizes').update(prize).eq('id', id);
    if (error) throw error;
    await refreshData();
    toast({ title: 'Success', description: 'Prize updated successfully' });
  };

  const updatePrizeStock = async (id: string, quantity: number) => {
    const { error } = await supabase.from('prizes').update({ stock_quantity: quantity }).eq('id', id);
    if (error) throw error;
    await refreshData();
  };

  const addMachineStock = async (stock: any) => {
    const { error } = await supabase.from('machine_stock').insert([stock]);
    if (error) throw error;
    await refreshData();
  };

  const getLatestReport = (machineId: string): MachineReport | null => {
    const machineReports = reports
      .filter(r => r.machine_id === machineId)
      .sort((a, b) => {
        const dateA = new Date(a.report_date || a.created_at).getTime();
        const dateB = new Date(b.report_date || b.created_at).getTime();
        return dateB - dateA;
      });
    return machineReports.length > 0 ? machineReports[0] : null;
  };

  const calculatePayoutPercentage = (machineId: string): number | null => {
    const latestReport = getLatestReport(machineId);
    if (!latestReport || !latestReport.money_collected) {
      return null;
    }
    
    let prizeValue = latestReport.prize_value || 0;
    let toysDispensed = latestReport.toys_dispensed || 0;
    
    if (toysDispensed === 0 && latestReport.current_toy_count !== null && latestReport.previous_toy_count !== null) {
      toysDispensed = Math.max(0, latestReport.current_toy_count - latestReport.previous_toy_count);
    }
    
    if (prizeValue === 0 && toysDispensed > 0) {
      const machine = machines.find(m => m.id === machineId);
      if (machine?.current_prize) {
        prizeValue = toysDispensed * parseFloat(machine.current_prize.cost.toString());
      }
    }
    
    if (prizeValue === 0) {
      return 0;
    }
    
    return (prizeValue / latestReport.money_collected) * 100;
  };

  useEffect(() => {
    refreshData();
  }, []);

  const contextValue: AppContextType = {
    sidebarOpen, 
    toggleSidebar, 
    venues, 
    machines, 
    prizes,
    machineStock,
    currentView, 
    setCurrentView, 
    refreshData,
    companyLogo,
    setCompanyLogo: handleSetCompanyLogo,
    getLatestReport,
    calculatePayoutPercentage,
    addVenue,
    deleteVenue,
    updateVenue,
    addMachine,
    deleteMachine,
    addPrize,
    deletePrize,
    updatePrize,
    updatePrizeStock,
    addMachineStock,
    findMachineByBarcode: findMachineByBarcodeMethod,
    selectedMachineForHistory,
    setSelectedMachineForHistory
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};