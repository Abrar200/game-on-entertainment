import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface PayWaveTerminal {
  id: string;
  name: string;
  terminal_number: string;
}

interface PayWaveDisplayProps {
  machineId: string;
  machineName: string;
  showInline?: boolean;
  className?: string;
}

const PayWaveDisplay: React.FC<PayWaveDisplayProps> = ({ 
  machineId, 
  machineName, 
  showInline = false,
  className = ""
}) => {
  const [terminals, setTerminals] = useState<PayWaveTerminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchPayWaveTerminals();
  }, [machineId]);

  const fetchPayWaveTerminals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('machine_paywave_terminals')
        .select('*')
        .eq('machine_id', machineId)
        .order('created_at', { ascending: true });

      if (error) {
        // If table doesn't exist or other error, just show no terminals
        console.warn('PayWave terminals table may not exist:', error);
        setTerminals([]);
        return;
      }

      setTerminals(data || []);
    } catch (error) {
      console.error('Error fetching PayWave terminals:', error);
      setTerminals([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <CreditCard className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-500">Loading PayWave info...</span>
      </div>
    );
  }

  if (terminals.length === 0) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <CreditCard className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-500">No PayWave terminals</span>
      </div>
    );
  }

  // Inline display for machine cards/lists
  if (showInline) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <CreditCard className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium">
          {terminals.length} PayWave Terminal{terminals.length > 1 ? 's' : ''}
        </span>
        <Badge variant="outline" className="text-xs">
          {terminals.length === 1 ? terminals[0].name : `${terminals.length} terminals`}
        </Badge>
        {terminals.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="h-6 w-6 p-0"
          >
            {showDetails ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
        )}
        
        {showDetails && terminals.length > 1 && (
          <div className="absolute z-10 mt-2 p-3 bg-white border rounded-lg shadow-lg min-w-[200px]">
            <h4 className="font-semibold text-sm mb-2">PayWave Terminals</h4>
            <div className="space-y-1">
              {terminals.map((terminal, index) => (
                <div key={terminal.id} className="text-xs">
                  <span className="font-medium">{terminal.name}:</span>
                  <span className="ml-1 text-gray-600">{terminal.terminal_number}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full card display for detailed views
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="h-5 w-5 text-blue-600" />
          PayWave Terminals
          <Badge variant="secondary">{terminals.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {terminals.map((terminal, index) => (
            <div key={terminal.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-900">
                  {terminal.name}
                </div>
                <div className="text-sm text-gray-600 font-mono">
                  Terminal: {terminal.terminal_number}
                </div>
              </div>
              <Badge variant="outline" className="bg-white">
                Active
              </Badge>
            </div>
          ))}
          
          {terminals.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No PayWave terminals configured</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PayWaveDisplay;