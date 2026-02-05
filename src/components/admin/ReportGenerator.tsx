'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

import { Card } from '@/components/ui/card';
import SalesChart from '@/components/admin/SalesChart';

import { 
  SalesReportData, 
  ItemPerformanceReportData,
  CustomerInsightsReportData
} from '@/types';

type ReportType = 'sales' | 'items' | 'customers' | 'tax' | 'waste';
import { 
  FileText, 
  TrendingUp, 
  Users, 
  Receipt, 
  Trash2,
  Download,
  FileDown,
  Calendar
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ReportGeneratorProps {
  restaurantId: string;
  onGenerate?: (reportType: ReportType) => void;
}

type ReportData = 
  | SalesReportData 
  | ItemPerformanceReportData 
  | CustomerInsightsReportData 
  | null;

export default function ReportGenerator({ restaurantId, onGenerate }: ReportGeneratorProps) {
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState<ReportData>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const reportTypes = [
    {
      type: 'sales' as ReportType,
      title: 'Sales Report',
      description: 'Revenue, orders, and sales trends',
      icon: TrendingUp,
      color: 'text-blue-600 bg-blue-50'
    },
    {
      type: 'items' as ReportType,
      title: 'Item Performance',
      description: 'Best sellers and profit margins',
      icon: FileText,
      color: 'text-purple-600 bg-purple-50'
    },
    {
      type: 'customers' as ReportType,
      title: 'Customer Insights',
      description: 'Customer behavior and lifetime value',
      icon: Users,
      color: 'text-green-600 bg-green-50'
    },
    {
      type: 'tax' as ReportType,
      title: 'Tax Report',
      description: 'Tax collected and breakdown',
      icon: Receipt,
      color: 'text-orange-600 bg-orange-50'
    },
    {
      type: 'waste' as ReportType,
      title: 'Waste Report',
      description: 'Inventory waste and prep suggestions',
      icon: Trash2,
      color: 'text-red-600 bg-red-50'
    }
  ];

  const handleGenerateReport = async () => {
    if (!selectedReportType) return;
    if (selectedReportType === 'tax' || selectedReportType === 'waste') return;

    setIsGenerating(true);
    try {
      const params = new URLSearchParams({
        restaurantId,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      const endpoint = `/api/reports/${selectedReportType}?${params.toString()}`;
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`Failed to generate report: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        setReportData(result.data);
        onGenerate?.(selectedReportType);
      } else {
        throw new Error(result.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = async () => {
    if (!reportData || !selectedReportType) return;

    setIsExporting(true);
    try {
      const { exportPDF } = await import('@/lib/reportExports');
      const buffer = exportPDF(reportData, selectedReportType as 'sales' | 'items' | 'customers', dateRange.startDate, dateRange.endDate);
      const blob = new Blob([buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReportType}-report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!reportData || !selectedReportType) return;

    setIsExporting(true);
    try {
      const { exportExcel } = await import('@/lib/reportExports');
      const buffer = exportExcel(reportData, selectedReportType as 'sales' | 'items' | 'customers', dateRange.startDate, dateRange.endDate);
      const blob = new Blob([buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReportType}-report.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting Excel:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Report Type Selector */}
      <div>
        <h2 className="text-2xl font-bold mb-4" style={{ color: 'hsl(var(--foreground))' }}>Generate Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            return (
              <Card
                key={report.type}
                className={`p-6 cursor-pointer transition-all duration-200 ${
                  selectedReportType === report.type
                    ? 'ring-2 ring-primary-500 shadow-lg'
                    : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedReportType(report.type)}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${report.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1" style={{ color: 'hsl(var(--foreground))' }}>{report.title}</h3>
                    <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>{report.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Report Generator */}
      {selectedReportType && (
        <Card className="p-6">
          <div className="space-y-4">
            {/* Date Range Picker */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                <Calendar className="inline w-4 h-4 mr-1" />
                Date Range
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Start Date</label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    className="w-full px-4 py-2 border-2 rounded-lg transition-colors duration-200"
                    style={{ 
                      backgroundColor: 'hsl(var(--background))',
                      color: 'hsl(var(--foreground))',
                      borderColor: 'hsl(var(--border))'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'hsl(var(--primary))';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'hsl(var(--border))';
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>End Date</label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                    className="w-full px-4 py-2 border-2 rounded-lg transition-colors duration-200"
                    style={{ 
                      backgroundColor: 'hsl(var(--background))',
                      color: 'hsl(var(--foreground))',
                      borderColor: 'hsl(var(--border))'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'hsl(var(--primary))';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'hsl(var(--border))';
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Preview Area */}
      {reportData && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>Report Preview</h3>
            <div className="flex gap-2">
              <Button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button
                onClick={handleExportExcel}
                disabled={isExporting}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>

          {/* Sales Report Preview */}
          {selectedReportType === 'sales' && 'totalSales' in reportData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <p className="text-sm mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Total Sales</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(reportData.totalSales)}</p>
                </Card>
                <Card className="p-4 bg-green-50 border-green-200">
                  <p className="text-sm mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Total Orders</p>
                  <p className="text-2xl font-bold text-green-600">{reportData.totalOrders}</p>
                </Card>
                <Card className="p-4 bg-purple-50 border-purple-200">
                  <p className="text-sm mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Average Order Value</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(reportData.averageOrderValue)}</p>
                </Card>
              </div>

              {/* Sales Trend Chart */}
              <div>
                <h4 className="font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>Sales Trend</h4>
                <SalesChart data={reportData.salesTrend} />
              </div>

              {/* Sales by Order Type */}
              <div>
                <h4 className="font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>Sales by Order Type</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {reportData.salesByType.map((item: any) => (
                    <Card key={item.type} className="p-4">
                      <p className="text-sm mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{item.type}</p>
                      <p className="text-xl font-bold text-neutral-900">{formatCurrency(item.amount)}</p>
                      <p className="text-sm text-neutral-500">{item.percentage}%</p>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Top Selling Items */}
              <div>
                <h4 className="font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>Top Selling Items</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b" style={{ backgroundColor: 'hsl(var(--muted))', borderColor: 'hsl(var(--border))' }}>
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Item</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Quantity Sold</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                      {reportData.topSellingItems.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm" style={{ color: 'hsl(var(--foreground))' }}>{item.itemName}</td>
                          <td className="px-4 py-3 text-sm text-neutral-900 text-right">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-right" style={{ color: 'hsl(var(--foreground))' }}>
                            {formatCurrency(item.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Item Performance Report Preview */}
          {selectedReportType === 'items' && 'bestSellers' in reportData && (
            <div className="space-y-6">
              {/* Best Sellers */}
              <div>
                <h4 className="font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>Best Sellers</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b" style={{ backgroundColor: 'hsl(var(--muted))', borderColor: 'hsl(var(--border))' }}>
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Item</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Quantity</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Revenue</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                      {reportData.bestSellers.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm" style={{ color: 'hsl(var(--foreground))' }}>{item.itemName}</td>
                          <td className="px-4 py-3 text-sm text-neutral-900 text-right">{item.quantitySold}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-right" style={{ color: 'hsl(var(--foreground))' }}>
                            {formatCurrency(item.revenue)}
                          </td>
                          <td className="px-4 py-3 text-sm text-green-600 text-right">{item.profitMargin || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Worst Sellers */}
              <div>
                <h4 className="font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>Worst Sellers</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b" style={{ backgroundColor: 'hsl(var(--muted))', borderColor: 'hsl(var(--border))' }}>
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Item</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Quantity</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                      {reportData.worstSellers.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm" style={{ color: 'hsl(var(--foreground))' }}>{item.itemName}</td>
                          <td className="px-4 py-3 text-sm text-neutral-900 text-right">{item.quantitySold}</td>
                          <td className="px-4 py-3 text-sm text-neutral-900 text-right">
                            {formatCurrency(item.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Customer Insights Report Preview */}
          {selectedReportType === 'customers' && 'newCustomers' in reportData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-green-50 border-green-200">
                  <p className="text-sm mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>New Customers</p>
                  <p className="text-2xl font-bold text-green-600">{reportData.newCustomers}</p>
                  <p className="text-sm text-neutral-500">{((reportData.newCustomers / reportData.totalCustomers) * 100).toFixed(1)}%</p>
                </Card>
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <p className="text-sm mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Returning Customers</p>
                  <p className="text-2xl font-bold text-blue-600">{reportData.returningCustomers}</p>
                  <p className="text-sm text-neutral-500">{((reportData.returningCustomers / reportData.totalCustomers) * 100).toFixed(1)}%</p>
                </Card>
                <Card className="p-4 bg-purple-50 border-purple-200">
                  <p className="text-sm mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Avg Orders per Customer</p>
                  <p className="text-2xl font-bold text-purple-600">{reportData.averageOrdersPerCustomer.toFixed(1)}</p>
                </Card>
              </div>

              {/* Top Customers */}
              <div>
                <h4 className="font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>Top Customers by Lifetime Value</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b" style={{ backgroundColor: 'hsl(var(--muted))', borderColor: 'hsl(var(--border))' }}>
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Customer</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Total Orders</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Lifetime Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                      {reportData.topCustomers.map((customer: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm" style={{ color: 'hsl(var(--foreground))' }}>{customer.customerName}</td>
                          <td className="px-4 py-3 text-sm text-neutral-900 text-right">{customer.totalOrders}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-right" style={{ color: 'hsl(var(--foreground))' }}>
                            {formatCurrency(customer.totalSpent)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tax Report Preview - Not implemented */}
          {selectedReportType === 'tax' && reportData && 'totalTaxableAmount' in reportData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <p className="text-sm mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Total Taxable Sales</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency((reportData as any).totalTaxableAmount)}</p>
                </Card>
                <Card className="p-4 bg-green-50 border-green-200">
                  <p className="text-sm mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Total Tax Collected</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency((reportData as any).totalTaxCollected)}</p>
                </Card>
              </div>

              {/* Tax Breakdown */}
              <div>
                <h4 className="font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>Tax Breakdown by Rate</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b" style={{ backgroundColor: 'hsl(var(--muted))', borderColor: 'hsl(var(--border))' }}>
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Tax Rate</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Taxable Amount</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Tax Collected</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                      {(reportData as any).taxBreakdown?.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm" style={{ color: 'hsl(var(--foreground))' }}>{item.rate}%</td>
                          <td className="px-4 py-3 text-sm text-neutral-900 text-right">
                            {formatCurrency(item.taxableAmount)}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-right" style={{ color: 'hsl(var(--foreground))' }}>
                            {formatCurrency(item.taxCollected)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Waste Report Preview - Not implemented */}
          {selectedReportType === 'waste' && reportData && 'wasteItems' in reportData && (
            <div className="space-y-6">
              {/* Waste Items */}
              <div>
                <h4 className="font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>Items Prepared vs Sold</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b" style={{ backgroundColor: 'hsl(var(--muted))', borderColor: 'hsl(var(--border))' }}>
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Item</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Prepared</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Sold</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Waste</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Waste %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                      {(reportData as any).wasteItems?.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm" style={{ color: 'hsl(var(--foreground))' }}>{item.name}</td>
                          <td className="px-4 py-3 text-sm text-neutral-900 text-right">{item.prepared}</td>
                          <td className="px-4 py-3 text-sm text-neutral-900 text-right">{item.sold}</td>
                          <td className="px-4 py-3 text-sm text-red-600 text-right">{item.waste}</td>
                          <td className="px-4 py-3 text-sm text-red-600 text-right">{item.wastePercentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Prep Suggestions */}
              <div>
                <h4 className="font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>Suggested Prep Quantities for Next Period</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b" style={{ backgroundColor: 'hsl(var(--muted))', borderColor: 'hsl(var(--border))' }}>
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Item</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Current Prep</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Suggested Prep</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Difference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                      {(reportData as any).prepSuggestions?.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm" style={{ color: 'hsl(var(--foreground))' }}>{item.name}</td>
                          <td className="px-4 py-3 text-sm text-neutral-900 text-right">{item.currentPrep}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-600 text-right">
                            {item.suggestedPrep}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right ${
                            item.difference > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {item.difference > 0 ? '+' : ''}{item.difference}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}