import { useState, useEffect } from 'react';
import { FileText, Download, User, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Employee = Database['public']['Tables']['employees']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];
type WageCalculation = Database['public']['Tables']['wage_calculations']['Row'];

interface PaymentReport extends Payment {
  employee: Employee;
  calculation: WageCalculation;
}

interface EmployeeSummary {
  employee: Employee;
  totalPayments: number;
  paymentCount: number;
  lastPaymentDate: string | null;
}

export default function ReportModule() {
  const [payments, setPayments] = useState<PaymentReport[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'all' | 'individual'>('all');
  const [employeeSummaries, setEmployeeSummaries] = useState<EmployeeSummary[]>([]);

  useEffect(() => {
    fetchEmployees();
    setDefaultDates();
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchPayments();
      fetchEmployeeSummaries();
    }
  }, [selectedEmployee, startDate, endDate]);

  const setDefaultDates = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      let query = supabase
        .from('payments')
        .select(`
          *,
          employee:employees(*),
          calculation:wage_calculations(*)
        `)
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .order('payment_date', { ascending: false });

      if (selectedEmployee !== 'all') {
        query = query.eq('employee_id', selectedEmployee);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPayments((data as unknown as PaymentReport[]) || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const fetchEmployeeSummaries = async () => {
    try {
      const { data: paymentData, error } = await supabase
        .from('payments')
        .select('employee_id, amount, payment_date')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate);

      if (error) throw error;

      const summaryMap = new Map<string, { total: number; count: number; lastDate: string }>();

      paymentData?.forEach((payment) => {
        const existing = summaryMap.get(payment.employee_id) || {
          total: 0,
          count: 0,
          lastDate: payment.payment_date,
        };
        existing.total += payment.amount;
        existing.count += 1;
        if (payment.payment_date > existing.lastDate) {
          existing.lastDate = payment.payment_date;
        }
        summaryMap.set(payment.employee_id, existing);
      });

      const summaries: EmployeeSummary[] = [];
      for (const emp of employees) {
        const summary = summaryMap.get(emp.id);
        summaries.push({
          employee: emp,
          totalPayments: summary?.total || 0,
          paymentCount: summary?.count || 0,
          lastPaymentDate: summary?.lastDate || null,
        });
      }

      setEmployeeSummaries(summaries.filter((s) => s.paymentCount > 0));
    } catch (error) {
      console.error('Error fetching employee summaries:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTotalAmount = () => {
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  };

  const exportReport = () => {
    let csvContent = 'Payment Report\n\n';
    csvContent += `Period: ${formatDate(startDate)} to ${formatDate(endDate)}\n`;
    csvContent += `Total Payments: ${payments.length}\n`;
    csvContent += `Total Amount: $${getTotalAmount().toFixed(2)}\n\n`;

    csvContent += 'Date,Employee,Amount,Payment Method,Period Type,Period Start,Period End,';
    csvContent += 'Present Days,Half Days,Absent Days,Overtime Hours,Base Wage,Overtime Amount,';
    csvContent += 'Half-Day Amount,Advances,Gross Amount,Net Amount,Notes\n';

    payments.forEach((payment) => {
      const calc = payment.calculation;
      csvContent += `${formatDate(payment.payment_date)},`;
      csvContent += `${payment.employee.name},`;
      csvContent += `$${payment.amount.toFixed(2)},`;
      csvContent += `${payment.payment_method || 'N/A'},`;
      csvContent += `${calc.period_type},`;
      csvContent += `${formatDate(calc.period_start)},`;
      csvContent += `${formatDate(calc.period_end)},`;
      csvContent += `${calc.present_days},`;
      csvContent += `${calc.half_days},`;
      csvContent += `${calc.absent_days},`;
      csvContent += `${calc.total_overtime_hours},`;
      csvContent += `$${calc.base_wage.toFixed(2)},`;
      csvContent += `$${calc.overtime_amount.toFixed(2)},`;
      csvContent += `$${calc.half_day_amount.toFixed(2)},`;
      csvContent += `$${calc.total_advances.toFixed(2)},`;
      csvContent += `$${calc.gross_amount.toFixed(2)},`;
      csvContent += `$${calc.net_amount.toFixed(2)},`;
      csvContent += `"${payment.notes || ''}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-report-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Payment Reports</h2>
        <button
          onClick={exportReport}
          disabled={payments.length === 0}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Download size={20} />
          Export Report
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              View Mode
            </label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as 'all' | 'individual')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Payments</option>
              <option value="individual">Employee Summary</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
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
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Payments</p>
                <p className="text-2xl font-bold text-gray-900">{payments.length}</p>
              </div>
              <FileText className="text-blue-600" size={32} />
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Amount Paid</p>
                <p className="text-2xl font-bold text-gray-900">${getTotalAmount().toFixed(2)}</p>
              </div>
              <DollarSign className="text-green-600" size={32} />
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Employees</p>
                <p className="text-2xl font-bold text-gray-900">{employees.filter((e) => e.is_active).length}</p>
              </div>
              <User className="text-yellow-600" size={32} />
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'all' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Payment Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attendance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Breakdown
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      No payment records found for the selected period.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-900">
                          <Calendar size={16} />
                          {formatDate(payment.payment_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {payment.employee.name}
                        </div>
                        <div className="text-sm text-gray-500">{payment.employee.position || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(payment.calculation.period_start)} -
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(payment.calculation.period_end)}
                        </div>
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          {payment.calculation.period_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-600">
                          <div>Present: {payment.calculation.present_days} days</div>
                          <div>Half-day: {payment.calculation.half_days} days</div>
                          <div>Absent: {payment.calculation.absent_days} days</div>
                          <div>OT: {payment.calculation.total_overtime_hours} hrs</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-600">
                          <div className="text-green-600">Base: ${payment.calculation.base_wage.toFixed(2)}</div>
                          <div className="text-green-600">Half-day: ${payment.calculation.half_day_amount.toFixed(2)}</div>
                          <div className="text-green-600">OT: ${payment.calculation.overtime_amount.toFixed(2)}</div>
                          <div className="text-red-600">Advance: -${payment.calculation.total_advances.toFixed(2)}</div>
                          <div className="font-semibold text-blue-600 mt-1">
                            Gross: ${payment.calculation.gross_amount.toFixed(2)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-lg font-bold text-gray-900">
                          <DollarSign size={18} />
                          {payment.amount.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {payment.payment_method || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Employee Payment Summary</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Payment
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employeeSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No payment summaries found for the selected period.
                    </td>
                  </tr>
                ) : (
                  employeeSummaries.map((summary) => (
                    <tr key={summary.employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-gray-400" />
                          <div className="text-sm font-medium text-gray-900">
                            {summary.employee.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {summary.employee.position || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-900">
                          <FileText size={16} />
                          {summary.paymentCount}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-lg font-semibold text-green-600">
                          <DollarSign size={18} />
                          {summary.totalPayments.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar size={16} />
                          {summary.lastPaymentDate ? formatDate(summary.lastPaymentDate) : 'N/A'}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
