/*
  # Payroll Tracker Database Schema

  ## Overview
  This migration creates the complete database structure for a wage calculation and payroll tracking system.

  ## 1. New Tables

  ### `employees`
  Stores employee information and wage rates
  - `id` (uuid, primary key) - Unique employee identifier
  - `name` (text) - Employee full name
  - `email` (text, unique) - Employee email address
  - `phone` (text) - Contact phone number
  - `position` (text) - Job position/title
  - `daily_wage` (decimal) - Standard daily wage rate
  - `overtime_rate` (decimal) - Hourly overtime rate
  - `half_day_rate` (decimal) - Half-day wage rate
  - `is_active` (boolean) - Employment status
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `attendance`
  Tracks daily attendance records
  - `id` (uuid, primary key) - Unique attendance record identifier
  - `employee_id` (uuid, foreign key) - References employees table
  - `date` (date) - Attendance date
  - `status` (text) - Attendance status: 'present', 'absent', 'half-day'
  - `overtime_hours` (decimal) - Overtime hours worked
  - `advance_taken` (decimal) - Advance payment taken on this day
  - `notes` (text) - Additional notes
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  - Unique constraint on (employee_id, date)

  ### `wage_calculations`
  Stores calculated wage information
  - `id` (uuid, primary key) - Unique calculation identifier
  - `employee_id` (uuid, foreign key) - References employees table
  - `period_start` (date) - Calculation period start date
  - `period_end` (date) - Calculation period end date
  - `period_type` (text) - Type: 'daily', 'weekly', 'monthly'
  - `present_days` (integer) - Number of full days present
  - `half_days` (integer) - Number of half days
  - `absent_days` (integer) - Number of absent days
  - `total_overtime_hours` (decimal) - Total overtime hours
  - `base_wage` (decimal) - Base wage amount
  - `overtime_amount` (decimal) - Overtime payment amount
  - `half_day_amount` (decimal) - Half-day payment amount
  - `total_advances` (decimal) - Total advances deducted
  - `gross_amount` (decimal) - Total before deductions
  - `net_amount` (decimal) - Final payable amount
  - `is_paid` (boolean) - Payment status
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `payments`
  Records completed wage payments
  - `id` (uuid, primary key) - Unique payment identifier
  - `wage_calculation_id` (uuid, foreign key) - References wage_calculations
  - `employee_id` (uuid, foreign key) - References employees table
  - `amount` (decimal) - Payment amount
  - `payment_date` (date) - Date of payment
  - `payment_method` (text) - Payment method: 'cash', 'bank', 'cheque'
  - `notes` (text) - Payment notes
  - `created_at` (timestamptz) - Record creation timestamp

  ## 2. Security
  - Enable RLS on all tables
  - All tables are open for authenticated access (no auth in this app)
  - Policies allow full CRUD operations for simplicity
*/

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  position text,
  daily_wage decimal(10,2) NOT NULL DEFAULT 0,
  overtime_rate decimal(10,2) NOT NULL DEFAULT 0,
  half_day_rate decimal(10,2) NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'half-day')),
  overtime_hours decimal(5,2) DEFAULT 0,
  advance_taken decimal(10,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Create wage_calculations table
CREATE TABLE IF NOT EXISTS wage_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  period_type text NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  present_days integer DEFAULT 0,
  half_days integer DEFAULT 0,
  absent_days integer DEFAULT 0,
  total_overtime_hours decimal(10,2) DEFAULT 0,
  base_wage decimal(10,2) DEFAULT 0,
  overtime_amount decimal(10,2) DEFAULT 0,
  half_day_amount decimal(10,2) DEFAULT 0,
  total_advances decimal(10,2) DEFAULT 0,
  gross_amount decimal(10,2) DEFAULT 0,
  net_amount decimal(10,2) DEFAULT 0,
  is_paid boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wage_calculation_id uuid NOT NULL REFERENCES wage_calculations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  payment_date date NOT NULL,
  payment_method text CHECK (payment_method IN ('cash', 'bank', 'cheque')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_wage_calculations_employee ON wage_calculations(employee_id);
CREATE INDEX IF NOT EXISTS idx_wage_calculations_period ON wage_calculations(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_payments_employee ON payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- Enable Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE wage_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies (open access for this application)
CREATE POLICY "Allow all operations on employees"
  ON employees FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on attendance"
  ON attendance FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on wage_calculations"
  ON wage_calculations FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on payments"
  ON payments FOR ALL
  USING (true)
  WITH CHECK (true);