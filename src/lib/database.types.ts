export interface Database {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          position: string | null;
          daily_wage: number;
          overtime_rate: number;
          half_day_rate: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          position?: string | null;
          daily_wage?: number;
          overtime_rate?: number;
          half_day_rate?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          position?: string | null;
          daily_wage?: number;
          overtime_rate?: number;
          half_day_rate?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      attendance: {
        Row: {
          id: string;
          employee_id: string;
          date: string;
          status: 'present' | 'absent' | 'half-day';
          overtime_hours: number;
          advance_taken: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          date: string;
          status: 'present' | 'absent' | 'half-day';
          overtime_hours?: number;
          advance_taken?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          date?: string;
          status?: 'present' | 'absent' | 'half-day';
          overtime_hours?: number;
          advance_taken?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      wage_calculations: {
        Row: {
          id: string;
          employee_id: string;
          period_start: string;
          period_end: string;
          period_type: 'daily' | 'weekly' | 'monthly';
          present_days: number;
          half_days: number;
          absent_days: number;
          total_overtime_hours: number;
          base_wage: number;
          overtime_amount: number;
          half_day_amount: number;
          total_advances: number;
          gross_amount: number;
          net_amount: number;
          is_paid: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          period_start: string;
          period_end: string;
          period_type: 'daily' | 'weekly' | 'monthly';
          present_days?: number;
          half_days?: number;
          absent_days?: number;
          total_overtime_hours?: number;
          base_wage?: number;
          overtime_amount?: number;
          half_day_amount?: number;
          total_advances?: number;
          gross_amount?: number;
          net_amount?: number;
          is_paid?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          period_start?: string;
          period_end?: string;
          period_type?: 'daily' | 'weekly' | 'monthly';
          present_days?: number;
          half_days?: number;
          absent_days?: number;
          total_overtime_hours?: number;
          base_wage?: number;
          overtime_amount?: number;
          half_day_amount?: number;
          total_advances?: number;
          gross_amount?: number;
          net_amount?: number;
          is_paid?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          wage_calculation_id: string;
          employee_id: string;
          amount: number;
          payment_date: string;
          payment_method: 'cash' | 'bank' | 'cheque' | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          wage_calculation_id: string;
          employee_id: string;
          amount: number;
          payment_date: string;
          payment_method?: 'cash' | 'bank' | 'cheque' | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          wage_calculation_id?: string;
          employee_id?: string;
          amount?: number;
          payment_date?: string;
          payment_method?: 'cash' | 'bank' | 'cheque' | null;
          notes?: string | null;
          created_at?: string;
        };
      };
    };
  };
}
