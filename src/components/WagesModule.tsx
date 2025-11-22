import { useState, useEffect } from 'react';
import { Calculator, DollarSign, TrendingUp, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Employee = Database['public']['Tables']['employees']['Row'];
type Attendance = Database['public']['Tables']['attendance']['Row'];
type WageCalculation = Database['public']['Tables']['wage_calculations']['Row'];
type WageCalculationInsert = Database['public']['Tables']['wage_calculations']['Insert'];

interface CalculationBreakdown {
  presentDays: number;
  halfDays: number;
  absentDays: number;
  totalOvertimeHours: number;
  baseWage: number;
  overtimeAmount: number;
  halfDayAmount: number;
  totalAdvances: number;
  grossAmount: number;
  netAmount: number;
}

export default function WagesModule() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [periodType, setPeriodType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [breakdown, setBreakdown] = useState<CalculationBreakdown | null>(null);
  const [calculations, setCalculations] = useState<WageCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchCalculations();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      fetchCalculations();
    }
  }, [selectedEmployee]);

  useEffect(() => {
    if (periodType) {
      setDefaultDates();
    }
  }, [periodType]);

  const setDefaultDates = () => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (periodType === 'daily') {
      start = today;
      end = today;
    } else if (periodType === 'weekly') {
      const day = today.getDay();
      start = new Date(today);
      start.setDate(today.getDate() - day);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
    } else if (periodType === 'monthly') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalculations = async () => {
    try {
      let query = supabase
        .from('wage_calculations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (selectedEmployee) {
        query = query.eq('employee_id', selectedEmployee);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCalculations(data || []);
    } catch (error) {
      console.error('Error fetching calculations:', error);
    }
  };

  const calculateWages = async () => {
    if (!selectedEmployee || !startDate || !endDate) {
      alert('Please select an employee and date range');
      return;
    }

    setCalculating(true);
    try {
      const { data: employee } = await supabase
        .from('employees')
        .select('*')
        .eq('id', selectedEmployee)
        .single();

      if (!employee) {
        alert('Employee not found');
        return;
      }

      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', selectedEmployee)
        .gte('date', startDate)
        .lte('date', endDate);

      if (attendanceError) throw attendanceError;

      let presentDays = 0;
      let halfDays = 0;
      let absentDays = 0;
      let totalOvertimeHours = 0;
      let totalAdvances = 0;

      attendanceRecords?.forEach((record: Attendance) => {
        if (record.status === 'present') presentDays++;
        else if (record.status === 'half-day') halfDays++;
        else if (record.status === 'absent') absentDays++;
        totalOvertimeHours += record.overtime_hours;
        totalAdvances += record.advance_taken;
      });

      const baseWage = presentDays * employee.daily_wage;
      const halfDayAmount = halfDays * employee.half_day_rate;
      const overtimeAmount = totalOvertimeHours * employee.overtime_rate;
      const grossAmount = baseWage + halfDayAmount + overtimeAmount;
      const netAmount = grossAmount - totalAdvances;

      const calculationBreakdown: CalculationBreakdown = {
        presentDays,
        halfDays,
        absentDays,
        totalOvertimeHours,
        baseWage,
        overtimeAmount,
        halfDayAmount,
        totalAdvances,
        grossAmount,
        netAmount,
      };

      setBreakdown(calculationBreakdown);

      const wageCalculation: WageCalculationInsert = {
        employee_id: selectedEmployee,
        period_start: startDate,
        period_end: endDate,
        period_type: periodType,
        present_days: presentDays,
        half_days: halfDays,
        absent_days: absentDays,
        total_overtime_hours: totalOvertimeHours,
        base_wage: baseWage,
        overtime_amount: overtimeAmount,
        half_day_amount: halfDayAmount,
        total_advances: totalAdvances,
        gross_amount: grossAmount,
        net_amount: netAmount,
        is_paid: false,
      };

      const { error: insertError } = await supabase
        .from('wage_calculations')
        .insert([wageCalculation]);

      if (insertError) throw insertError;

      alert('Wage calculation completed successfully!');
      fetchCalculations();
    } catch (error) {
      console.error('Error calculating wages:', error);
      alert('Error calculating wages');
    } finally {
      setCalculating(false);
    }
  };

  const markAsPaid = async (calculationId: string) => {
    if (!confirm('Mark this wage calculation as paid?')) return;

    try {
      const { error } = await supabase
        .from('wage_calculations')
        .update({ is_paid: true, updated_at: new Date().toISOString() })
        .eq('id', calculationId);

      if (error) throw error;

      const calculation = calculations.find((c) => c.id === calculationId);
      if (calculation) {
        const { error: paymentError } = await supabase.from('payments').insert([
          {
            wage_calculation_id: calculationId,
            employee_id: calculation.employee_id,
            amount: calculation.net_amount,
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: 'cash',
            notes: `Payment for ${calculation.period_type} period: ${calculation.period_start} to ${calculation.period_end}`,
          },
        ]);

        if (paymentError) throw paymentError;
      }

      alert('Marked as paid successfully!');
      fetchCalculations();
    } catch (error) {
      console.error('Error marking as paid:', error);
      alert('Error marking as paid');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getEmployeeName = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    return emp?.name || 'Unknown';
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Wage Calculation</h2>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Calculator size={20} />
          Calculate Wages
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Employee *
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose an employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Period Type *
              </label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as 'daily' | 'weekly' | 'monthly')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={calculateWages}
            disabled={calculating}
            className="w-full md:w-auto px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Calculator size={18} />
            {calculating ? 'Calculating...' : 'Calculate Wages'}
          </button>
        </div>

        {breakdown && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <TrendingUp size={18} />
              Calculation Breakdown
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Present Days</p>
                <p className="font-semibold text-gray-900">{breakdown.presentDays}</p>
              </div>
              <div>
                <p className="text-gray-600">Half Days</p>
                <p className="font-semibold text-gray-900">{breakdown.halfDays}</p>
              </div>
              <div>
                <p className="text-gray-600">Absent Days</p>
                <p className="font-semibold text-gray-900">{breakdown.absentDays}</p>
              </div>
              <div>
                <p className="text-gray-600">Overtime Hours</p>
                <p className="font-semibold text-gray-900">{breakdown.totalOvertimeHours} hrs</p>
              </div>
              <div>
                <p className="text-gray-600">Base Wage</p>
                <p className="font-semibold text-green-600">${breakdown.baseWage.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Half-Day Amount</p>
                <p className="font-semibold text-green-600">${breakdown.halfDayAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Overtime Amount</p>
                <p className="font-semibold text-green-600">${breakdown.overtimeAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Advances Taken</p>
                <p className="font-semibold text-red-600">-${breakdown.totalAdvances.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Gross Amount</p>
                <p className="font-semibold text-blue-600">${breakdown.grossAmount.toFixed(2)}</p>
              </div>
              <div className="col-span-2 md:col-span-3 pt-2 border-t border-blue-300">
                <p className="text-gray-600">Net Payable Amount</p>
                <p className="font-bold text-2xl text-gray-900">${breakdown.netAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FileText size={20} />
            Recent Wage Calculations
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days (P/H/A)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gross Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {calculations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    No wage calculations found. Calculate wages to get started.
                  </td>
                </tr>
              ) : (
                calculations.map((calc) => (
                  <tr key={calc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {getEmployeeName(calc.employee_id)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {formatDate(calc.period_start)} - {formatDate(calc.period_end)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {calc.period_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {calc.present_days} / {calc.half_days} / {calc.absent_days}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-900">
                        <DollarSign size={16} />
                        {calc.gross_amount.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                        <DollarSign size={16} />
                        {calc.net_amount.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          calc.is_paid
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {calc.is_paid ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {!calc.is_paid && (
                        <button
                          onClick={() => markAsPaid(calc.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Mark as Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
