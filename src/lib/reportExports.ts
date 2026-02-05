// src/lib/reportExports.ts

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  SalesReportData,
  ItemPerformanceReportData,
  CustomerInsightsReportData,
} from '@/types';

// ============= PDF EXPORT =============

export function exportPDF(
  data: SalesReportData | ItemPerformanceReportData | CustomerInsightsReportData,
  reportType: 'sales' | 'items' | 'customers',
  startDate: string,
  endDate: string
): Uint8Array {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.text(getReportTitle(reportType), 14, 20);

  doc.setFontSize(10);
  doc.text(`Period: ${startDate} to ${endDate}`, 14, 28);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

  let yPosition = 45;

  if (reportType === 'sales' && 'totalSales' in data) {
    // Sales Report
    doc.setFontSize(14);
    doc.text('Summary', 14, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.text(`Total Sales: $${data.totalSales.toFixed(2)}`, 14, yPosition);
    yPosition += 6;
    doc.text(`Total Orders: ${data.totalOrders}`, 14, yPosition);
    yPosition += 6;
    doc.text(`Average Order Value: $${data.averageOrderValue.toFixed(2)}`, 14, yPosition);
    yPosition += 12;

    // Sales by type table
    doc.setFontSize(14);
    doc.text('Sales by Order Type', 14, yPosition);
    yPosition += 8;

    autoTable(doc, {
      startY: yPosition,
      head: [['Order Type', 'Amount', 'Percentage']],
      body: data.salesByType.map((item) => [
        item.type,
        `$${item.amount.toFixed(2)}`,
        `${item.percentage.toFixed(1)}%`,
      ]),
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // Top selling items table
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.text('Top Selling Items', 14, yPosition);
    yPosition += 8;

    autoTable(doc, {
      startY: yPosition,
      head: [['Item Name', 'Quantity', 'Revenue']],
      body: data.topSellingItems.map((item) => [
        item.itemName,
        item.quantity.toString(),
        `$${item.revenue.toFixed(2)}`,
      ]),
    });
  } else if (reportType === 'items' && 'bestSellers' in data) {
    // Item Performance Report
    doc.setFontSize(14);
    doc.text('Best Sellers', 14, yPosition);
    yPosition += 8;

    autoTable(doc, {
      startY: yPosition,
      head: [['Item Name', 'Quantity Sold', 'Revenue']],
      body: data.bestSellers.map((item) => [
        item.itemName,
        item.quantitySold.toString(),
        `$${item.revenue.toFixed(2)}`,
      ]),
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.text('Worst Sellers', 14, yPosition);
    yPosition += 8;

    autoTable(doc, {
      startY: yPosition,
      head: [['Item Name', 'Quantity Sold', 'Revenue']],
      body: data.worstSellers.map((item) => [
        item.itemName,
        item.quantitySold.toString(),
        `$${item.revenue.toFixed(2)}`,
      ]),
    });
  } else if (reportType === 'customers' && 'totalCustomers' in data) {
    // Customer Insights Report
    doc.setFontSize(14);
    doc.text('Customer Statistics', 14, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.text(`Total Customers: ${data.totalCustomers}`, 14, yPosition);
    yPosition += 6;
    doc.text(`New Customers: ${data.newCustomers}`, 14, yPosition);
    yPosition += 6;
    doc.text(`Returning Customers: ${data.returningCustomers}`, 14, yPosition);
    yPosition += 6;
    doc.text(
      `Average Lifetime Value: $${data.averageLifetimeValue.toFixed(2)}`,
      14,
      yPosition
    );
    yPosition += 6;
    doc.text(
      `Average Orders per Customer: ${data.averageOrdersPerCustomer.toFixed(1)}`,
      14,
      yPosition
    );
    yPosition += 12;

    // Top customers table
    doc.setFontSize(14);
    doc.text('Top Customers', 14, yPosition);
    yPosition += 8;

    autoTable(doc, {
      startY: yPosition,
      head: [['Customer Name', 'Total Orders', 'Total Spent']],
      body: data.topCustomers.map((customer) => [
        customer.customerName,
        customer.totalOrders.toString(),
        `$${customer.totalSpent.toFixed(2)}`,
      ]),
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Peak ordering hours table
    doc.setFontSize(14);
    doc.text('Peak Ordering Hours', 14, yPosition);
    yPosition += 8;

    autoTable(doc, {
      startY: yPosition,
      head: [['Hour', 'Orders']],
      body: data.peakOrderingHours.map((hour) => [
        `${hour.hour}:00`,
        hour.orders.toString(),
      ]),
    });
  }

  return new Uint8Array(doc.output('arraybuffer') as ArrayBuffer);
}

// ============= EXCEL EXPORT =============

export function exportExcel(
  data: SalesReportData | ItemPerformanceReportData | CustomerInsightsReportData,
  reportType: 'sales' | 'items' | 'customers',
  startDate: string,
  endDate: string
): Uint8Array {
  const workbook = XLSX.utils.book_new();

  if (reportType === 'sales' && 'totalSales' in data) {
    // Summary sheet
    const summaryData = [
      ['Sales Report'],
      [`Period: ${startDate} to ${endDate}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ['Total Sales', data.totalSales],
      ['Total Orders', data.totalOrders],
      ['Average Order Value', data.averageOrderValue],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Sales by type sheet
    const typeData = [
      ['Order Type', 'Amount', 'Percentage'],
      ...data.salesByType.map((item) => [item.type, item.amount, item.percentage]),
    ];
    const typeSheet = XLSX.utils.aoa_to_sheet(typeData);
    XLSX.utils.book_append_sheet(workbook, typeSheet, 'Sales by Type');

    // Sales trend sheet
    const trendData = [
      ['Date', 'Amount', 'Orders'],
      ...data.salesTrend.map((item) => [item.date, item.amount, item.orders]),
    ];
    const trendSheet = XLSX.utils.aoa_to_sheet(trendData);
    XLSX.utils.book_append_sheet(workbook, trendSheet, 'Sales Trend');

    // Top selling items sheet
    const itemsData = [
      ['Item Name', 'Quantity', 'Revenue'],
      ...data.topSellingItems.map((item) => [
        item.itemName,
        item.quantity,
        item.revenue,
      ]),
    ];
    const itemsSheet = XLSX.utils.aoa_to_sheet(itemsData);
    XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Top Items');
  } else if (reportType === 'items' && 'bestSellers' in data) {
    // Best sellers sheet
    const bestData = [
      ['Item Name', 'Quantity Sold', 'Revenue'],
      ...data.bestSellers.map((item) => [
        item.itemName,
        item.quantitySold,
        item.revenue,
      ]),
    ];
    const bestSheet = XLSX.utils.aoa_to_sheet(bestData);
    XLSX.utils.book_append_sheet(workbook, bestSheet, 'Best Sellers');

    // Worst sellers sheet
    const worstData = [
      ['Item Name', 'Quantity Sold', 'Revenue'],
      ...data.worstSellers.map((item) => [
        item.itemName,
        item.quantitySold,
        item.revenue,
      ]),
    ];
    const worstSheet = XLSX.utils.aoa_to_sheet(worstData);
    XLSX.utils.book_append_sheet(workbook, worstSheet, 'Worst Sellers');
  } else if (reportType === 'customers' && 'totalCustomers' in data) {
    // Summary sheet
    const summaryData = [
      ['Customer Insights Report'],
      [`Period: ${startDate} to ${endDate}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ['Total Customers', data.totalCustomers],
      ['New Customers', data.newCustomers],
      ['Returning Customers', data.returningCustomers],
      ['Average Lifetime Value', data.averageLifetimeValue],
      ['Average Orders per Customer', data.averageOrdersPerCustomer],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Top customers sheet
    const customersData = [
      ['Customer Name', 'Total Orders', 'Total Spent'],
      ...data.topCustomers.map((customer) => [
        customer.customerName,
        customer.totalOrders,
        customer.totalSpent,
      ]),
    ];
    const customersSheet = XLSX.utils.aoa_to_sheet(customersData);
    XLSX.utils.book_append_sheet(workbook, customersSheet, 'Top Customers');

    // Peak hours sheet
    const hoursData = [
      ['Hour', 'Orders'],
      ...data.peakOrderingHours.map((hour) => [`${hour.hour}:00`, hour.orders]),
    ];
    const hoursSheet = XLSX.utils.aoa_to_sheet(hoursData);
    XLSX.utils.book_append_sheet(workbook, hoursSheet, 'Peak Hours');
  }

  // Convert workbook to Uint8Array for browser compatibility
  const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(excelBuffer);
}

// ============= HELPER FUNCTIONS =============

function getReportTitle(reportType: 'sales' | 'items' | 'customers'): string {
  switch (reportType) {
    case 'sales':
      return 'Sales Report';
    case 'items':
      return 'Item Performance Report';
    case 'customers':
      return 'Customer Insights Report';
    default:
      return 'Report';
  }
}