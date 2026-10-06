import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { MonthData, FinancialKPIs } from "@/features/dashboard/types/dashboard.types";
import { Transaction } from "@/features/transactions/types/transaction.types";
import { formatCurrency, formatPercentage } from "@/features/dashboard/lib/financial-math";

export interface GeneratePdfOptions {
  year: number;
  months: MonthData[];
  transactions: Transaction[];
  categoriesMap?: Map<string, string>; // categoryId -> categoryName
  kpis?: FinancialKPIs;
  selectedMonth?: number; // 0-11, se for undefined emite o ano completo
  includeMonthSummary?: boolean; // Tabela consolidada mês a mês
  includeTransactionsList?: boolean; // Lançamentos individuais
  includeCategoryBreakdown?: boolean; // Distribuição por categoria
}

const MONTH_NAMES_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

/**
 * Formata data ISO (YYYY-MM-DD) para formato legível DD/MM/AAAA ou DD/MM
 */
function formatDateShort(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return dateStr || "-";
  const [y, m, d] = dateStr.slice(0, 10).split("-");
  return `${d}/${m}`;
}

/**
 * Gera um documento PDF executivo de alta resolução contendo o balanço financeiro,
 * demonstrativo consolidado mês a mês e todos os lançamentos detalhados.
 */
export function generateFinancialPdf({
  year,
  months,
  transactions,
  categoriesMap = new Map(),
  kpis,
  selectedMonth,
  includeMonthSummary = true,
  includeTransactionsList = true,
  includeCategoryBreakdown = true,
}: GeneratePdfOptions): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  const now = new Date();
  const issueDateFormatted = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} às ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const isSingleMonth = selectedMonth !== undefined && selectedMonth >= 0 && selectedMonth <= 11;
  const singleMonthName = isSingleMonth ? MONTH_NAMES_FULL[selectedMonth] : "";
  const periodLabel = isSingleMonth
    ? `${singleMonthName} de ${year}`
    : `Ano de ${year} (Janeiro a Dezembro)`;

  // Filtra transações do ano ou do mês específico
  const filteredTxs = transactions.filter((tx) => {
    if (!tx?.date) return false;
    if (isSingleMonth) {
      const ymPrefix = `${year}-${String(selectedMonth + 1).padStart(2, "0")}`;
      return tx.date.startsWith(ymPrefix);
    }
    return tx.date.startsWith(`${year}-`);
  });

  // Ordena transações cronologicamente
  filteredTxs.sort((a, b) => a.date.localeCompare(b.date));

  // Totais do período
  let totalIncome = 0;
  let totalExpenses = 0;

  if (isSingleMonth) {
    const targetM = months[selectedMonth];
    totalIncome = targetM?.income || 0;
    totalExpenses = targetM?.expenses || 0;
  } else {
    totalIncome = months.reduce((acc, m) => acc + (m.income || 0), 0);
    totalExpenses = months.reduce((acc, m) => acc + (m.expenses || 0), 0);
  }

  const netBalance = totalIncome - totalExpenses;
  const finalAccumulated = isSingleMonth
    ? months[selectedMonth]?.accumulatedBalance ?? netBalance
    : months[months.length - 1]?.accumulatedBalance ?? netBalance;

  // ==========================================
  // 1. CABEÇALHO EXECUTIVO
  // ==========================================
  // Barra decorativa superior
  doc.setFillColor(37, 99, 235); // Blue-600
  doc.rect(0, 0, pageWidth, 4, "F");

  let currentY = 14;

  // Título e Subtítulo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text("CONTROLE FINANCEIRO", marginX, currentY);

  currentY += 5.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(`Demonstrativo Financeiro & Relatório Gerencial • ${periodLabel}`, marginX, currentY);

  // Data de Emissão (alinhada à direita)
  doc.setFontSize(8);
  doc.text(`Emissão: ${issueDateFormatted}`, pageWidth - marginX, currentY - 5.5, { align: "right" });
  doc.text(`Lançamentos: ${filteredTxs.length}`, pageWidth - marginX, currentY, { align: "right" });

  currentY += 5;
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.4);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);

  currentY += 6;

  // ==========================================
  // 2. CARDS DE KPIS EXECUTIVOS
  // ==========================================
  const cardWidth = (pageWidth - marginX * 2 - 9) / 4;
  const cardHeight = 17;

  const kpiItems = [
    {
      title: "RECEITAS DO PERÍODO",
      value: formatCurrency(totalIncome),
      color: [16, 185, 129], // Emerald
    },
    {
      title: "GASTOS DO PERÍODO",
      value: formatCurrency(totalExpenses),
      color: [244, 63, 94], // Rose
    },
    {
      title: "SALDO LÍQUIDO",
      value: formatCurrency(netBalance),
      color: netBalance >= 0 ? [16, 185, 129] : [244, 63, 94],
    },
    {
      title: isSingleMonth ? "SALDO ACUMULADO" : "PATRIMÔNIO FINAL",
      value: formatCurrency(finalAccumulated),
      color: [59, 130, 246], // Blue
    },
  ];

  kpiItems.forEach((kpi, idx) => {
    const cardX = marginX + idx * (cardWidth + 3);

    // Fundo do card
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, "F");

    // Borda do card
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, "S");

    // Título do KPI
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.title, cardX + 3, currentY + 4.5);

    // Valor do KPI
    doc.setFontSize(10.5);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, cardX + 3, currentY + 12);
  });

  currentY += cardHeight + 7;

  // ==========================================
  // 3. TABELA CONSOLIDADA MÊS A MÊS
  // ==========================================
  if (includeMonthSummary) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("1. Demonstrativo Consolidado Mês a Mês", marginX, currentY);

    currentY += 2.5;

    const summaryMonths = isSingleMonth ? [months[selectedMonth]] : months;

    const summaryTableBody = summaryMonths.map((m) => {
      const isPos = m.balance >= 0;
      const acc = m.accumulatedBalance ?? m.balance;
      const rate = m.savingsRate || 0;

      return [
        m.monthFullName,
        formatCurrency(m.income),
        formatCurrency(m.expenses),
        formatCurrency(m.balance),
        formatCurrency(acc),
        formatPercentage(rate),
        isPos ? "Superávit" : "Déficit",
      ];
    });

    // Linha de total no rodapé (se múltiplos meses)
    if (!isSingleMonth) {
      const avgIncome = totalIncome / 12;
      const avgExpenses = totalExpenses / 12;
      summaryTableBody.push([
        "TOTAL / MÉDIA",
        `${formatCurrency(totalIncome)} (méd. ${formatCurrency(avgIncome)})`,
        `${formatCurrency(totalExpenses)} (méd. ${formatCurrency(avgExpenses)})`,
        formatCurrency(netBalance),
        formatCurrency(finalAccumulated),
        formatPercentage(totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0),
        netBalance >= 0 ? "Superávit Anual" : "Déficit Anual",
      ]);
    }

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [["Mês", "Receitas", "Gastos", "Saldo do Mês", "Patrimônio Acum.", "Poupança", "Resultado"]],
      body: summaryTableBody,
      theme: "grid",
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: "bold",
        halign: "left",
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 26 },
        1: { halign: "right", textColor: [5, 150, 105], fontStyle: "bold" },
        2: { halign: "right", textColor: [225, 29, 72] },
        3: { halign: "right", fontStyle: "bold" },
        4: { halign: "right", textColor: [37, 99, 235], fontStyle: "bold" },
        5: { halign: "center" },
        6: { halign: "center" },
      },
      didParseCell: (data) => {
        // Estiliza a linha de total
        if (!isSingleMonth && data.row.index === summaryTableBody.length - 1) {
          data.cell.styles.fillColor = [241, 245, 249];
          data.cell.styles.fontStyle = "bold";
        }
        // Colore saldo positivo/negativo
        if (data.column.index === 3) {
          const valStr = String(data.cell.raw);
          if (valStr.includes("-")) {
            data.cell.styles.textColor = [225, 29, 72];
          } else {
            data.cell.styles.textColor = [5, 150, 105];
          }
        }
        // Colore resultado
        if (data.column.index === 6) {
          const raw = String(data.cell.raw);
          if (raw.includes("Superávit")) {
            data.cell.styles.textColor = [5, 150, 105];
            data.cell.styles.fontStyle = "bold";
          } else if (raw.includes("Déficit")) {
            data.cell.styles.textColor = [225, 29, 72];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // ==========================================
  // 4. DISTRIBUIÇÃO DE GASTOS POR CATEGORIA
  // ==========================================
  if (includeCategoryBreakdown) {
    // Agrupa despesas por categoria
    const categoryTotals = new Map<string, { total: number; count: number }>();
    filteredTxs
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const cat = t.category || "outros";
        const curr = categoryTotals.get(cat) || { total: 0, count: 0 };
        curr.total += Number(t.amount) || 0;
        curr.count += 1;
        categoryTotals.set(cat, curr);
      });

    const categoryList = Array.from(categoryTotals.entries())
      .map(([catId, data]) => ({
        catId,
        name: categoriesMap.get(catId) || catId,
        total: data.total,
        count: data.count,
        percent: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    if (categoryList.length > 0) {
      // Se estiver próximo do fim da página, quebra de página
      if (currentY > pageHeight - 50) {
        doc.addPage();
        currentY = 16;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("2. Distribuição de Gastos por Categoria", marginX, currentY);

      currentY += 2.5;

      const categoryTableBody = categoryList.map((c) => [
        c.name,
        formatCurrency(c.total),
        `${c.percent.toFixed(1)}%`,
        `${c.count} lançamentos`,
      ]);

      autoTable(doc, {
        startY: currentY,
        margin: { left: marginX, right: marginX },
        head: [["Categoria", "Total Gasto", "% do Total", "Qtd. Itens"]],
        body: categoryTableBody,
        theme: "grid",
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: "bold",
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [51, 65, 85],
        },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 50 },
          1: { halign: "right", fontStyle: "bold", textColor: [225, 29, 72] },
          2: { halign: "center" },
          3: { halign: "center" },
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  // ==========================================
  // 5. DETALHAMENTO DE LANÇAMENTOS MÊS A MÊS
  // ==========================================
  if (includeTransactionsList && filteredTxs.length > 0) {
    // Nova página dedicada para os lançamentos
    doc.addPage();
    currentY = 16;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("3. Detalhamento de Lançamentos Mês a Mês", marginX, currentY);

    currentY += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Lista discriminada de todas as receitas e despesas registradas em ${periodLabel}.`, marginX, currentY);

    currentY += 4;

    // Agrupa transações por mês (YYYY-MM)
    const txsByMonth = new Map<string, Transaction[]>();
    for (const tx of filteredTxs) {
      const ym = tx.date.slice(0, 7);
      const list = txsByMonth.get(ym) || [];
      list.push(tx);
      txsByMonth.set(ym, list);
    }

    const sortedYms = Array.from(txsByMonth.keys()).sort();

    sortedYms.forEach((ym) => {
      const txList = txsByMonth.get(ym) || [];
      const [yStr, mStr] = ym.split("-");
      const mIdx = parseInt(mStr, 10) - 1;
      const monthTitle = `${MONTH_NAMES_FULL[mIdx]} / ${yStr}`;

      const monthIncome = txList.filter((t) => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
      const monthExp = txList.filter((t) => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
      const monthBal = monthIncome - monthExp;

      // Se espaço insuficiente antes do cabeçalho da tabela, adiciona página
      if (currentY > pageHeight - 35) {
        doc.addPage();
        currentY = 16;
      }

      // Banner da Seção do Mês
      doc.setFillColor(241, 245, 249);
      doc.rect(marginX, currentY, pageWidth - marginX * 2, 7, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`Mês: ${monthTitle}`, marginX + 3, currentY + 4.8);

      const summaryText = `Receitas: ${formatCurrency(monthIncome)}  •  Gastos: ${formatCurrency(monthExp)}  •  Saldo: ${formatCurrency(monthBal)}  (${txList.length} itens)`;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(summaryText, pageWidth - marginX - 3, currentY + 4.8, { align: "right" });

      currentY += 8.5;

      const txTableBody = txList.map((t) => {
        const catName = categoriesMap.get(t.category) || t.category;
        const isInc = t.type === "income";
        const isPaid = t.status === "paid";

        return [
          formatDateShort(t.date),
          t.description || "Sem descrição",
          catName,
          isInc ? "Receita" : "Despesa",
          isPaid ? "Pago" : "Pendente",
          isInc ? `+${formatCurrency(t.amount)}` : `-${formatCurrency(t.amount)}`,
        ];
      });

      autoTable(doc, {
        startY: currentY,
        margin: { left: marginX, right: marginX },
        head: [["Data", "Descrição do Lançamento", "Categoria", "Tipo", "Status", "Valor (R$)"]],
        body: txTableBody,
        theme: "striped",
        headStyles: {
          fillColor: [51, 65, 85],
          textColor: [255, 255, 255],
          fontSize: 7,
          fontStyle: "bold",
        },
        bodyStyles: {
          fontSize: 7,
          textColor: [30, 41, 59],
        },
        columnStyles: {
          0: { cellWidth: 16, halign: "center" },
          1: { cellWidth: "auto", fontStyle: "normal" },
          2: { cellWidth: 32 },
          3: { cellWidth: 18, halign: "center" },
          4: { cellWidth: 18, halign: "center" },
          5: { cellWidth: 26, halign: "right", fontStyle: "bold" },
        },
        didParseCell: (data) => {
          // Colore valores
          if (data.column.index === 5) {
            const valStr = String(data.cell.raw);
            if (valStr.startsWith("+")) {
              data.cell.styles.textColor = [5, 150, 105];
            } else {
              data.cell.styles.textColor = [225, 29, 72];
            }
          }
          // Colore status
          if (data.column.index === 4) {
            const st = String(data.cell.raw);
            if (st === "Pago") {
              data.cell.styles.textColor = [5, 150, 105];
            } else {
              data.cell.styles.textColor = [217, 119, 6]; // Amber-600
            }
          }
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 7;
    });
  }

  // ==========================================
  // 6. NUMERAÇÃO DE PÁGINAS E RODAPÉ GLOBAL
  // ==========================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Linha divisória de rodapé
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 9, pageWidth - marginX, pageHeight - 9);

    // Texto de rodapé
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text("Controle Financeiro • Gestão Pessoal & Orçamento", marginX, pageHeight - 5.5);
    doc.text(`Página ${p} de ${totalPages}`, pageWidth - marginX, pageHeight - 5.5, { align: "right" });
  }

  return doc;
}
