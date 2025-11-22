import { useState } from 'react';
import { Users, Calendar, Calculator, FileText, Menu, X } from 'lucide-react';
import EmployeeModule from './components/EmployeeModule';
import AttendanceModule from './components/AttendanceModule';
import WagesModule from './components/WagesModule';
import ReportModule from './components/ReportModule';

type TabType = 'employees' | 'attendance' | 'wages' | 'reports';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('employees');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs = [
    { id: 'employees' as TabType, name: 'Employees', icon: Users },
    { id: 'attendance' as TabType, name: 'Attendance', icon: Calendar },
    { id: 'wages' as TabType, name: 'Wages', icon: Calculator },
    { id: 'reports' as TabType, name: 'Reports', icon: FileText },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'employees':
        return <EmployeeModule />;
      case 'attendance':
        return <AttendanceModule />;
      case 'wages':
        return <WagesModule />;
      case 'reports':
        return <ReportModule />;
      default:
        return <EmployeeModule />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <Calculator className="text-blue-600" size={32} />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">PayTrack</h1>
                <p className="text-xs text-gray-500">Payroll Management System</p>
              </div>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <nav className="hidden lg:flex gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={20} />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {mobileMenuOpen && (
            <nav className="lg:hidden pb-4 flex flex-col gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={20} />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            PayTrack - Comprehensive Payroll Management System
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
