// Utilidades para exportar reportes a PDF, Excel y CSV
// Se usan desde Hoy, Semana y Productos

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { formatCOP, formatDateLong, formatDateShort } from './utils'
import type { Producto, Mesa, ResumenHoy, PuntoSerie, TopProducto, AlertaStock } from '@/types'

// =========================================================================
// CSV
// =========================================================================

export function exportCSV(filename: string, rows: Record<string, any>[], headers: string[]) {
  const csvContent = [
    headers.join(','),
    ...rows.map((r) =>
      headers.map((h) => {
        const v = r[h]
        if (v === null || v === undefined) return ''
        const s = String(v).replace(/"/g, '""')
        return /[",\n]/.test(s) ? `"${s}"` : s
      }).join(','),
    ),
  ].join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`)
}

// =========================================================================
// EXCEL
// =========================================================================

export function exportExcel(filename: string, sheets: { name: string; rows: any[]; headers: string[] }[]) {
  const wb = XLSX.utils.book_new()
  for (const sheet of sheets) {
    const data = [
      sheet.headers,
      ...sheet.rows.map((r) => sheet.headers.map((h) => r[h] ?? '')),
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    // Auto-width columns
    const colWidths = sheet.headers.map((h) => {
      const maxLen = Math.max(
        h.length,
        ...sheet.rows.map((r) => String(r[h] ?? '').length),
      )
      return { wch: Math.min(Math.max(maxLen + 2, 10), 50) }
    })
    ws['!cols'] = colWidths
    XLSX.utils.book_append_sheet(wb, ws, sheet.name)
  }
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}

// =========================================================================
// PDF
// =========================================================================

interface PDFOptions {
  titulo: string
  subtitulo?: string
  rango?: { desde: string; hasta: string }
  kpis?: { label: string; valor: string }[]
  headers: string[]
  rows: any[][]
  filename: string
  nombreLocal?: string
}

export function exportPDF(opts: PDFOptions) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15

  // Header
  doc.setFillColor(22, 163, 74) // emerald-600
  doc.rect(0, 0, pageWidth, 25, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(opts.nombreLocal || 'SIGPROV - El Rincón', margin, 12)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(opts.titulo, margin, 19)

  // Subtitulo + fecha
  doc.setTextColor(60, 60, 60)
  doc.setFontSize(10)
  let y = 32
  if (opts.subtitulo) {
    doc.text(opts.subtitulo, margin, y)
    y += 5
  }
  if (opts.rango) {
    doc.text(`Período: ${opts.rango.desde} → ${opts.rango.hasta}`, margin, y)
    y += 5
  }
  doc.text(`Generado: ${formatDateLong(new Date().toISOString())}`, margin, y)
  y += 8

  // KPIs
  if (opts.kpis && opts.kpis.length > 0) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Resumen', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    for (const k of opts.kpis) {
      doc.text(`${k.label}:`, margin, y)
      doc.text(k.valor, margin + 60, y)
      y += 5
    }
    y += 3
  }

  // Tabla
  if (opts.rows.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [opts.headers],
      body: opts.rows,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      margin: { left: margin, right: margin },
    })
  }

  // Footer
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `SIGPROV v2 - Página ${i} de ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' },
    )
  }

  doc.save(opts.filename.endsWith('.pdf') ? opts.filename : `${opts.filename}.pdf`)
}

// =========================================================================
// Helpers
// =========================================================================

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// =========================================================================
// Reportes pre-armados
// =========================================================================

export function reporteHoy(resumen: ResumenHoy, productosStockBajo: number, mesasActivas: number, enMesas: number) {
  const filenameBase = `sigprov-hoy-${new Date().toISOString().slice(0, 10)}`

  const csvRows = [
    { metrica: 'Total vendido',        valor: resumen.total_vendido },
    { metrica: 'N° de ventas',         valor: resumen.num_ventas },
    { metrica: 'Ticket promedio',      valor: resumen.ticket_promedio.toFixed(0) },
    { metrica: 'Variación vs ayer',    valor: `${resumen.vs_ayer_pct.toFixed(1)}%` },
    { metrica: 'Productos stock bajo', valor: productosStockBajo },
    { metrica: 'Mesas activas',        valor: mesasActivas },
    { metrica: 'En mesas (pendiente)', valor: enMesas },
    { metrica: 'Festivo hoy',          valor: resumen.es_festivo ? resumen.nombre_festivo ?? 'Sí' : 'No' },
  ]

  return {
    csv: () => exportCSV(filenameBase, csvRows, ['Métrica', 'Valor']),
    excel: () => exportExcel(filenameBase, [{
      name: 'Resumen del día',
      headers: ['Métrica', 'Valor'],
      rows: csvRows,
    }]),
    pdf: () => exportPDF({
      titulo: 'Reporte diario',
      subtitulo: `Estado del día ${formatDateLong(resumen.fecha)}`,
      kpis: [
        { label: 'Total vendido',      valor: formatCOP(resumen.total_vendido) },
        { label: 'N° de ventas',       valor: String(resumen.num_ventas) },
        { label: 'Ticket promedio',    valor: formatCOP(resumen.ticket_promedio) },
        { label: 'Variación vs ayer',  valor: `${resumen.vs_ayer_pct.toFixed(1)}%` },
        { label: 'Stock bajo',         valor: String(productosStockBajo) },
        { label: 'Mesas activas',      valor: String(mesasActivas) },
        { label: 'En mesas',           valor: formatCOP(enMesas) },
      ],
      headers: ['Métrica', 'Valor'],
      rows: csvRows.map((r) => [r.metrica, String(r.valor)]),
      filename: filenameBase,
    }),
  }
}

export function reporteSemana(semana: { historico_7_dias: PuntoSerie[]; prediccion_7_dias: PuntoSerie[]; modelo_version: string }) {
  const filenameBase = `sigprov-semana-${new Date().toISOString().slice(0, 10)}`

  const allPuntos: { fecha: string; tipo: string; total: number; festivo: string; rango?: string }[] = [
    ...semana.historico_7_dias.map((p) => ({
      fecha: p.fecha,
      tipo: 'Real',
      total: p.total ?? 0,
      festivo: p.es_festivo ? p.nombre_festivo ?? 'Sí' : '',
      rango: '',
    })),
    ...semana.prediccion_7_dias.map((p) => ({
      fecha: p.fecha,
      tipo: 'Predicho',
      total: p.total ?? 0,
      festivo: p.es_festivo ? p.nombre_festivo ?? 'Sí' : '',
      rango: p.limite_inferior != null && p.limite_superior != null
        ? `${formatCOP(p.limite_inferior)} – ${formatCOP(p.limite_superior)}`
        : '',
    })),
  ]

  const totalReal = semana.historico_7_dias.reduce((s, p) => s + (p.total ?? 0), 0)
  const totalPred = semana.prediccion_7_dias.reduce((s, p) => s + (p.total ?? 0), 0)

  return {
    csv: () => exportCSV(filenameBase, allPuntos, ['Fecha', 'Tipo', 'Total (COP)', 'Festivo', 'Rango predicho']),
    excel: () => exportExcel(filenameBase, [{
      name: 'Histórico + Predicción',
      headers: ['Fecha', 'Día', 'Tipo', 'Total (COP)', 'Festivo', 'Límite inferior', 'Límite superior'],
      rows: allPuntos.map((p) => {
        const pred = semana.prediccion_7_dias.find((x) => x.fecha === p.fecha)
        return {
          Fecha: p.fecha,
          Día: formatDateShort(p.fecha),
          Tipo: p.tipo,
          'Total (COP)': p.total,
          Festivo: p.festivo,
          'Límite inferior': pred?.limite_inferior ?? '',
          'Límite superior': pred?.limite_superior ?? '',
        }
      }),
    }]),
    pdf: () => exportPDF({
      titulo: 'Reporte semanal con predicción ML',
      subtitulo: `Modelo: ${semana.modelo_version}`,
      rango: {
        desde: semana.historico_7_dias[0]?.fecha ?? '',
        hasta: semana.prediccion_7_dias.at(-1)?.fecha ?? '',
      },
      kpis: [
        { label: 'Total últimos 7 días',       valor: formatCOP(totalReal) },
        { label: 'Predicción próximos 7 días', valor: formatCOP(totalPred) },
        { label: 'Modelo',                     valor: semana.modelo_version },
      ],
      headers: ['Fecha', 'Día', 'Tipo', 'Total', 'Festivo', 'Rango predicho'],
      rows: allPuntos.map((p) => [
        p.fecha,
        formatDateShort(p.fecha),
        p.tipo,
        formatCOP(p.total),
        p.festivo,
        p.rango,
      ]),
      filename: filenameBase,
    }),
  }
}

export function reporteProductos(productos: Producto[], alertas: AlertaStock[]) {
  const filenameBase = `sigprov-inventario-${new Date().toISOString().slice(0, 10)}`

  const rows = productos.map((p) => ({
    'ID': p.id,
    'Nombre': p.nombre,
    'Tipo': p.tipo,
    'Categoría': p.categoria,
    'Precio venta': p.precio_venta ?? 0,
    'Costo unitario': p.costo_unitario,
    'Unidad': p.unidad,
    'Stock actual': p.stock_actual,
    'Stock mínimo': p.stock_minimo,
    'Estado': p.stock_actual === 0 ? 'AGOTADO' : p.stock_actual <= p.stock_minimo ? 'BAJO' : 'OK',
    'Activo': p.activo ? 'Sí' : 'No',
  }))

  return {
    csv: () => exportCSV(filenameBase, rows, Object.keys(rows[0] ?? { ID: '', Nombre: '' })),
    excel: () => exportExcel(filenameBase, [{
      name: 'Inventario',
      headers: Object.keys(rows[0] ?? { ID: '', Nombre: '' }),
      rows,
    }]),
    pdf: () => exportPDF({
      titulo: 'Inventario completo',
      subtitulo: `${productos.length} productos · ${alertas.length} alertas de stock`,
      headers: ['ID', 'Nombre', 'Tipo', 'Categoría', 'Stock', 'Mín.', 'Estado', 'Precio venta'],
      rows: rows.map((r) => [
        String(r['ID']),
        String(r['Nombre']),
        String(r['Tipo']),
        String(r['Categoría']),
        `${r['Stock actual']} ${r['Unidad']}`,
        String(r['Stock mínimo']),
        String(r['Estado']),
        formatCOP(r['Precio venta'] as number),
      ]),
      filename: filenameBase,
    }),
  }
}

export function reporteTopProductos(top: TopProducto[], rango: string) {
  const filenameBase = `sigprov-top-productos-${new Date().toISOString().slice(0, 10)}`
  const rows = top.map((p, i) => ({
    Ranking: i + 1,
    Producto: p.nombre,
    Categoría: p.categoria,
    'Cantidad vendida': p.cantidad_vendida,
    Ingresos: formatCOP(p.ingresos),
  }))

  return {
    csv: () => exportCSV(filenameBase, rows, Object.keys(rows[0])),
    excel: () => exportExcel(filenameBase, [{ name: 'Top productos', headers: Object.keys(rows[0]), rows }]),
    pdf: () => exportPDF({
      titulo: `Top productos (${rango})`,
      subtitulo: `${top.length} productos más vendidos`,
      headers: ['#', 'Producto', 'Categoría', 'Cantidad', 'Ingresos'],
      rows: rows.map((r) => [String(r.Ranking), String(r.Producto), String(r.Categoría), String(r['Cantidad vendida']), String(r.Ingresos)]),
      filename: filenameBase,
    }),
  }
}