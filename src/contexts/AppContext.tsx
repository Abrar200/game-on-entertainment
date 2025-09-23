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

interface PayWaveTerminal {
  id: string;
  name: string;
  terminal_number: string;
}

interface Machine {
  _justUpdated: any;
  id: string;
  name: string;
  type: string;
  venue_id?: string | null;
  status: string;
  image_url?: string;
  earnings?: number;
  venue?: any;
  current_prize_id?: string | null;
  current_prize?: any;
  serial_number?: string;
  barcode?: string;
  paywave_terminals?: PayWaveTerminal[];
}


interface Equipment {
  id: string;
  name: string;
  description?: string;
  category: string;
  serial_number?: string;
  asset_tag?: string;
  brand?: string;
  model?: string;
  purchase_date?: string;
  purchase_cost?: number;
  current_value?: number;
  condition: string;
  status: string;
  venue_id?: string;
  hired_date?: string;
  expected_return_date?: string;
  notes?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  venue?: {
    id: string;
    name: string;
    address?: string;
  };
}

export const findMachineByBarcode = async (barcode: string): Promise<Machine> => {
  try {
    console.log('🔍 Searching for machine with barcode:', barcode);

    // Search for machine by barcode
    const { data: machines, error } = await supabase
      .from('machines')
      .select(`
        *,
        venues(*),
        prizes(*)
      `)
      .eq('barcode', barcode)
      .limit(1);

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!machines || machines.length === 0) {
      // For testing, try to find a machine that contains part of the barcode
      console.log('🔍 Exact match not found, trying partial match...');

      const { data: partialMachines, error: partialError } = await supabase
        .from('machines')
        .select(`
          *,
          venues(*),
          prizes(*)
        `)
        .ilike('barcode', `%${barcode}%`)
        .limit(1);

      if (partialError) {
        throw new Error(`Database error: ${partialError.message}`);
      }

      if (!partialMachines || partialMachines.length === 0) {
        throw new Error(`No machine found with barcode: ${barcode}`);
      }

      const machine = partialMachines[0];
      console.log('✅ Partial match found:', machine.name);

      return {
        ...machine,
        venue: Array.isArray(machine.venues) ? machine.venues[0] : machine.venues,
        current_prize: Array.isArray(machine.prizes) ? machine.prizes[0] : machine.prizes
      };
    }

    const machine = machines[0];

    // Format the machine data consistently
    const formattedMachine: Machine = {
      ...machine,
      venue: Array.isArray(machine.venues) ? machine.venues[0] : machine.venues,
      current_prize: Array.isArray(machine.prizes) ? machine.prizes[0] : machine.prizes
    };

    console.log('✅ Machine found:', formattedMachine.name);
    return formattedMachine;

  } catch (error) {
    console.error('❌ Error finding machine by barcode:', error);
    throw error;
  }
};

interface Prize {
  id: string;
  name: string;
  cost: number;
  stock_quantity: number;
  image_url?: string;
  barcode?: string;
}

interface MachineStock {
  machine_id: string;
  prize_id: string;
  quantity: number;
  notes?: string | null;
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

interface Part {
  cost_price: number;
  id: string;
  name: string;
  cost: number;
  stock_quantity: number;
  image_url?: string;
  barcode?: string;
  low_stock_limit: number;
  created_at: string;
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
  addMachine: (machine: Omit<Machine, 'id'>, payWaveTerminals?: Array<{name: string, terminal_number: string}>) => Promise<any>;
  deleteMachine: (id: string) => Promise<void>;
  addPrize: (prize: Omit<Prize, 'id'>) => Promise<void>;
  deletePrize: (id: string) => Promise<void>;
  updatePrize: (id: string, prize: Partial<Prize>) => Promise<void>;
  updatePrizeStock: (id: string, quantity: number) => Promise<void>;
  addMachineStock: (stock: MachineStock) => Promise<void>;
  equipment: Equipment[];
  addEquipment: (equipment: Omit<Equipment, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateEquipment: (id: string, equipment: Partial<Equipment>) => Promise<void>;
  deleteEquipment: (id: string) => Promise<void>;
  refreshEquipment: () => Promise<void>;
  refreshData: () => Promise<void>;
  companyLogo: string;
  setCompanyLogo: (logo: string) => void;
  getLatestReport: (machineId: string) => MachineReport | null;
  calculatePayoutPercentage: (machineId: string) => number | null;
  findMachineByBarcode: (barcode: string) => Promise<Machine>;
  selectedMachineForHistory: Machine | null;
  setSelectedMachineForHistory: (machine: Machine | null) => void;
  parts: Part[];
  addPart: (part: Omit<Part, 'id' | 'created_at'>) => Promise<void>;
  deletePart: (id: string) => Promise<void>;
  updatePart: (id: string, part: Partial<Part>) => Promise<void>;
  updatePartStock: (id: string, quantity: number) => Promise<void>;
  findPartByBarcode: (barcode: string) => Promise<Part>;
  savePayWaveTerminals: (machineId: string, terminals: Array<{name: string, terminal_number: string}>) => Promise<void>;
  logStockMovement: (
    itemType: 'prize' | 'part',
    itemId: string,
    movementType: 'in' | 'out' | 'adjustment',
    quantity: number,
    referenceType: string,
    referenceId?: string,
    notes?: string
  ) => Promise<void>;
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
  const [parts, setParts] = useState<Part[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const { toast } = useToast();

  const addEquipment = async (equipmentData: Omit<Equipment, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('Adding equipment with data:', equipmentData);
  
      const { error } = await supabase
        .from('equipment_hire')
        .insert([equipmentData]);
  
      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Database error: ${error.message}`);
      }
  
      console.log('Successfully added equipment');
      await refreshData();
  
    } catch (error) {
      console.error('Error in addEquipment:', error);
      throw error;
    }
  };
  
  const updateEquipment = async (id: string, equipmentData: Partial<Equipment>) => {
    try {
      const { error } = await supabase
        .from('equipment_hire')
        .update(equipmentData)
        .eq('id', id);
  
      if (error) throw error;
      
      await refreshData();
      toast({ title: 'Success', description: 'Equipment updated successfully' });
    } catch (error) {
      console.error('Error updating equipment:', error);
      throw error;
    }
  };
  
  const deleteEquipment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('equipment_hire')
        .delete()
        .eq('id', id);
  
      if (error) throw error;
      
      await refreshData();
    } catch (error) {
      console.error('Error deleting equipment:', error);
      throw error;
    }
  };
  
  const refreshEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_hire')
        .select(`
          *,
          venue:venues(
            id,
            name,
            address
          )
        `)
        .order('created_at', { ascending: false });
  
      if (error) throw error;
      setEquipment(data || []);
    } catch (error) {
      console.error('Error refreshing equipment:', error);
      throw error;
    }
  };

  const generatePartBarcode = (name: string): string => {
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PART_${cleanName}_${timestamp}_${random}`;
  };

  const generatePrizeBarcode = (name: string): string => {
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PRIZE_${cleanName}_${timestamp}_${random}`;
  };

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
      const [venuesRes, machinesRes, prizesRes, partsRes, reportsRes, stockRes, equipmentRes] = await Promise.all([
        supabase.from('venues').select('*'),
        supabase.from('machines').select('*, venues(*), prizes(*)'),
        supabase.from('prizes').select('*'),
        supabase.from('parts').select('*'),
        supabase.from('machine_reports').select('*').order('report_date', { ascending: false }),
        supabase.from('machine_stock').select('*'),
        supabase.from('equipment_hire').select(`
          *,
          venue:venues(
            id,
            name,
            address
          )
        `)
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
      if (partsRes.data) setParts(partsRes.data);
      if (reportsRes.data) setReports(reportsRes.data);
      if (stockRes.data) setMachineStock(stockRes.data);
      if (equipmentRes.data) setEquipment(equipmentRes.data);
    } catch (error) {
      console.error('Data refresh error:', error);
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    }
  };

  const savePayWaveTerminals = async (machineId: string, terminals: Array<{name: string, terminal_number: string}>) => {
    try {
      // Filter out empty terminals
      const validTerminals = terminals.filter(terminal => 
        terminal.name.trim() && terminal.terminal_number.trim()
      );

      if (validTerminals.length === 0) {
        console.log('No valid PayWave terminals to save');
        return;
      }

      // Delete existing terminals for this machine first
      await supabase
        .from('machine_paywave_terminals')
        .delete()
        .eq('machine_id', machineId);

      // Insert new terminals
      const terminalsToInsert = validTerminals.map(terminal => ({
        machine_id: machineId,
        name: terminal.name.trim(),
        terminal_number: terminal.terminal_number.trim()
      }));

      const { error } = await supabase
        .from('machine_paywave_terminals')
        .insert(terminalsToInsert);

      if (error) {
        console.error('❌ Error saving PayWave terminals:', error);
        // Don't throw error if table doesn't exist - it's optional
        if (!error.message.includes('does not exist')) {
          throw error;
        }
      } else {
        console.log('✅ PayWave terminals saved successfully');
      }
    } catch (error) {
      console.error('❌ Error in savePayWaveTerminals:', error);
      // Don't fail the whole operation if PayWave save fails
    }
  };

  const addMachine = async (machine: any, payWaveTerminals?: Array<{name: string, terminal_number: string}>) => {
    try {
      console.log('Adding machine with data:', machine);
      console.log('PayWave terminals:', payWaveTerminals);

      // Generate barcode
      const barcode = generateBarcode(machine.name, machine.serial_number || '');
      console.log('Generated barcode:', barcode);

      const machineWithBarcode = {
        ...machine,
        barcode,
        // Ensure all required fields are present
        machine_type: machine.type, // Map type to machine_type for database
        toy_counter_current: 0
      };

      console.log('Final machine data for database:', machineWithBarcode);

      const { data, error } = await supabase
        .from('machines')
        .insert([machineWithBarcode])
        .select()
        .single(); // Get the single inserted record

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('Successfully inserted machine:', data);
      
      // Save PayWave terminals if provided
      if (payWaveTerminals && payWaveTerminals.length > 0 && data?.id) {
        await savePayWaveTerminals(data.id, payWaveTerminals);
      }

      await refreshData();
      
      // Return the machine data so we can get the ID
      return data;

    } catch (error) {
      console.error('Error in addMachine:', error);
      throw error; // Re-throw so the dialog can catch it
    }
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
    try {
      console.log('Adding prize with data:', prize);

      const barcode = prize.barcode || generatePrizeBarcode(prize.name);

      const prizeData = {
        name: prize.name,
        cost: prize.cost,
        stock_quantity: prize.stock_quantity,
        image_url: prize.image_url,
        category: prize.category || null,
        description: prize.description || null,
        barcode
      };

      console.log('Final prize data for database:', prizeData);

      const { data, error } = await supabase
        .from('prizes')
        .insert([prizeData])
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('Successfully inserted prize:', data);
      await refreshData();

    } catch (error) {
      console.error('Error in addPrize:', error);
      throw error;
    }
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
    try {
      // Get current stock level
      const { data: currentPrize } = await supabase
        .from('prizes')
        .select('stock_quantity')
        .eq('id', id)
        .single();

      const currentStock = currentPrize?.stock_quantity || 0;
      const difference = quantity - currentStock;

      // Update the stock
      const { error } = await supabase
        .from('prizes')
        .update({ stock_quantity: quantity })
        .eq('id', id);

      if (error) throw error;

      // Log the stock movement
      if (difference !== 0) {
        await logStockMovement(
          'prize',
          id,
          difference > 0 ? 'in' : 'out',
          Math.abs(difference),
          'stock_adjustment',
          undefined,
          `Stock ${difference > 0 ? 'increased' : 'decreased'} by ${Math.abs(difference)}`
        );
      }

      await refreshData();
    } catch (error) {
      console.error('Error updating prize stock:', error);
      throw error;
    }
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

  const logStockMovement = async (
    itemType: 'prize' | 'part',
    itemId: string,
    movementType: 'in' | 'out' | 'adjustment',
    quantity: number,
    referenceType: string,
    referenceId?: string,
    notes?: string
  ) => {
    try {
      const { error } = await supabase
        .from('stock_movements')
        .insert([{
          item_type: itemType,
          item_id: itemId,
          movement_type: movementType,
          quantity: quantity,
          reference_type: referenceType,
          reference_id: referenceId,
          notes: notes,
          created_by: null // You can add user ID here if available
        }]);

      if (error) {
        console.error('Error logging stock movement:', error);
      }
    } catch (error) {
      console.error('Error logging stock movement:', error);
    }
  };

  const addMachineStock = async (stock: MachineStock & { notes?: string }) => {
    try {
      // Add to machine_stock table
      const { error: stockError } = await supabase
        .from('machine_stock')
        .insert([stock]);

      if (stockError) throw stockError;

      // Log the stock movement
      await logStockMovement(
        'prize',
        stock.prize_id,
        'out',
        stock.quantity,
        'machine_stock',
        stock.machine_id,
        stock.notes || `Added ${stock.quantity} prizes to machine`
      );

      await refreshData();
    } catch (error) {
      console.error('Error adding machine stock:', error);
      throw error;
    }
  };
  
  const addPart = async (part: Omit<Part, 'id' | 'created_at'>) => {
    try {
      console.log('Adding part with data:', part);

      const barcode = part.barcode || generatePartBarcode(part.name);

      const partData = {
        ...part,
        barcode
      };

      console.log('Final part data for database:', partData);

      const { data, error } = await supabase
        .from('parts')
        .insert([partData])
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('Successfully inserted part:', data);
      await refreshData();

    } catch (error) {
      console.error('Error in addPart:', error);
      throw error;
    }
  };

  const deletePart = async (id: string) => {
    const { error } = await supabase.from('parts').delete().eq('id', id);
    if (error) throw error;
    await refreshData();
  };

  const updatePart = async (id: string, part: Partial<Part>) => {
    const { error } = await supabase.from('parts').update(part).eq('id', id);
    if (error) throw error;
    await refreshData();
    toast({ title: 'Success', description: 'Part updated successfully' });
  };

  const updatePartStock = async (id: string, quantity: number) => {
    try {
      // Get current stock level
      const { data: currentPart } = await supabase
        .from('parts')
        .select('stock_quantity')
        .eq('id', id)
        .single();

      const currentStock = currentPart?.stock_quantity || 0;
      const difference = quantity - currentStock;

      // Update the stock
      const { error } = await supabase
        .from('parts')
        .update({ stock_quantity: quantity })
        .eq('id', id);

      if (error) throw error;

      // Log the stock movement
      if (difference !== 0) {
        await logStockMovement(
          'part',
          id,
          difference > 0 ? 'in' : 'out',
          Math.abs(difference),
          'stock_adjustment',
          undefined,
          `Stock ${difference > 0 ? 'increased' : 'decreased'} by ${Math.abs(difference)}`
        );
      }

      await refreshData();
    } catch (error) {
      console.error('Error updating part stock:', error);
      throw error;
    }
  };

  const findPartByBarcode = async (barcode: string): Promise<Part> => {
    try {
      console.log('🔍 Searching for part with barcode:', barcode);

      const { data, error } = await supabase
        .from('parts')
        .select('*')
        .eq('barcode', barcode)
        .single();

      if (error || !data) {
        throw new Error(`No part found with barcode: ${barcode}`);
      }

      console.log('✅ Part found:', data.name);
      return data;

    } catch (error) {
      console.error('❌ Error finding part by barcode:', error);
      throw error;
    }
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
    equipment,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    refreshEquipment,
    toggleSidebar,
    venues,
    machines,
    prizes,
    machineStock,
    currentView,
    findMachineByBarcode,
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
    logStockMovement,
    selectedMachineForHistory,
    setSelectedMachineForHistory,
    parts,
    addPart,
    deletePart,
    updatePart,
    updatePartStock,
    findPartByBarcode,
    savePayWaveTerminals,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};