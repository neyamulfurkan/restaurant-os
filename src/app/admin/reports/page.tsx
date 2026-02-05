'use client';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import React from 'react';
import ReportGenerator from '@/components/admin/ReportGenerator';
import { Card } from '@/components/ui/card';
import { FileText, TrendingUp, Users, Receipt, Trash2 } from 'lucide-react';

export default function AdminReportsPage() {
  const router = useRouter();
  const { data: session } = useSession();

  // Redirect non-admin users
  React.useEffect(() => {
    if (session?.user?.role && session.user.role !== 'ADMIN') {
      router.push('/admin/orders');
    }
  }, [session, router]);

  // In a real app, this would come from auth/session
  const restaurantId = 'restaurant_1';

  const handleReportGenerate = (reportType: string) => {
    console.log(`Report generated: ${reportType}`);
    // Track analytics or perform additional actions
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ backgroundColor: 'hsl(var(--background))' }}>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>Reports & Analytics</h1>
        <p style={{ color: 'hsl(var(--muted-foreground))' }}>
          Generate comprehensive reports to analyze your restaurant's performance
        </p>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card className="p-4 border border-primary/30" style={{ 
          background: 'linear-gradient(to bottom right, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.2))'
        }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'hsl(var(--primary))' }}>
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Revenue & Trends</p>
              <p className="text-sm text-blue-900 font-semibold">Revenue & Trends</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border" style={{ 
          background: 'linear-gradient(to bottom right, hsl(var(--primary) / 0.05), hsl(var(--primary) / 0.1))',
          borderColor: 'hsl(var(--border))'
        }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'hsl(var(--primary))' }}>
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'hsl(var(--primary))' }}>Items</p>
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Performance</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border" style={{ 
          background: 'linear-gradient(to bottom right, hsl(var(--success) / 0.1), hsl(var(--success) / 0.2))',
          borderColor: 'hsl(var(--success) / 0.3)'
        }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'hsl(var(--success))' }}>
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'hsl(var(--success))' }}>Customers</p>
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Insights</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border" style={{ 
          background: 'linear-gradient(to bottom right, hsl(var(--warning) / 0.1), hsl(var(--warning) / 0.2))',
          borderColor: 'hsl(var(--warning) / 0.3)'
        }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'hsl(var(--warning))' }}>
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'hsl(var(--warning))' }}>Tax</p>
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Compliance</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border" style={{ 
          background: 'linear-gradient(to bottom right, hsl(var(--destructive) / 0.1), hsl(var(--destructive) / 0.2))',
          borderColor: 'hsl(var(--destructive) / 0.3)'
        }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'hsl(var(--destructive))' }}>
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'hsl(var(--destructive))' }}>Waste</p>
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Optimization</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Report Generator Component */}
      <ReportGenerator 
        restaurantId={restaurantId} 
        onGenerate={handleReportGenerate}
      />

      {/* Help Section */}
      <Card className="mt-8 p-6 border border-primary/30" style={{
        background: 'linear-gradient(to bottom right, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.15))'
      }}>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--primary))' }}>
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>Report Tips</h3>
            <ul className="text-sm space-y-1" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
              <li>• Select a report type from the cards above to get started</li>
              <li>• Choose your desired date range for analysis</li>
              <li>• Generate the report to view detailed insights</li>
              <li>• Export reports as PDF for printing or Excel for further analysis</li>
              <li>• Use reports to make data-driven decisions about menu, pricing, and operations</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}