import React from "react";

/**
 * Products.jsx
 * Apresenta a tabela e recebe callbacks via props:
 *  - products: array
 *  - searchValue, onSearchChange
 *  - onEdit(productId), onDelete(productId)
 *
 * Simples, responsiva e sem dependências externas.
 */

export default function Products({
  products = [],
  searchValue = "",
  onSearchChange = () => {},
  onEdit = () => {},
  onDelete = () => {},
}) {
  const toNumber = (v) => {
    if (typeof v === "number") return v;
    const n = parseFloat(String(v ?? "").replace(",", "."));
    return isNaN(n) ? NaN : n;
  };

  const getCost = (product) =>
    typeof product?.cost_price !== "undefined" && product?.cost_price !== null
      ? product.cost_price
      : product?.last_purchase_value;

  const formatCurrency = (v) => {
    const n = toNumber(v);
    return isNaN(n)
      ? "-"
      : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Ordena alfabeticamente por nome (fallback para product_name e barcode)
  const displayProducts = [...products].sort((a, b) =>
    String(a.name || a.product_name || a.barcode || "")
      .localeCompare(
        String(b.name || b.product_name || b.barcode || ""),
        "pt-BR",
        { sensitivity: "base" }
      )
  );

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <h2 style={styles.cardTitle}>Estoque de Produtos</h2>
          <p style={styles.cardSubtitle}>Visão geral dos itens cadastrados</p>
        </div>

        <div style={{ width: 320 }}>
          <div style={styles.searchBox}>
            <input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por nome..."
              style={styles.searchInput}
            />
          </div>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>Código de Barras</th>
              <th style={styles.th}>Nome</th>
              <th style={styles.th}>Categoria</th>
              <th style={styles.thCenter}>Qtd</th>
              <th style={styles.thCenter}>Preço de Custo</th>
              <th style={styles.thCenter}>Margem</th>
              <th style={styles.thCenter}>Preço de Venda</th>
              <th style={{ ...styles.thCenter, width: 140 }}>Status</th>
              <th style={{ ...styles.thCenter, width: 72 }}>Ações</th>
            </tr>
          </thead>

          <tbody>
            {displayProducts.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  style={{ padding: 26, textAlign: "center", color: "#6b7280" }}
                >
                  Nenhum produto encontrado.
                </td>
              </tr>
            ) : (
              displayProducts.map((p, idx) => (
                <tr key={p.id || idx} style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                  <td style={styles.td}>{p.barcode}</td>
                  <td style={styles.td}>{p.name}</td>
                  <td style={styles.td}>{p.categories?.name ?? "-"}</td>

                  <td style={{ ...styles.td, textAlign: "center" }}>{p.quantity}</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    {formatCurrency(getCost(p))}
                  </td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    {(() => {
                      const c = toNumber(getCost(p));
                      const s = toNumber(p.sale_price);
                      if (!isNaN(c) && c > 0 && !isNaN(s)) {
                        return `${(((s - c) / c) * 100).toFixed(1)}%`;
                      }
                      return "-";
                    })()}
                  </td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    {formatCurrency(p.sale_price)}
                  </td>
                  <td style={{ ...styles.td, textAlign: "center", width: 90 }}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        ...(p.quantity <= 0
                          ? styles.badgeWarning
                          : p.quantity < 10
                          ? styles.badgeWarning
                          : styles.badgeSuccess),
                      }}
                    >
                      {p.quantity <= 0 ? "Sem Estoque" : p.quantity < 10 ? "Baixo" : "Em Estoque"}
                    </span>
                  </td>
                  <td style={{ ...styles.td, textAlign: "left", width: 72 }}>
                    <div style={styles.actionsCell}>
                      <button
                        title="Editar"
                        style={{ ...styles.iconBtn, ...styles.editBtn }}
                        onClick={() => onEdit(p.id)}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        title="Excluir"
                        style={{ ...styles.iconBtn, ...styles.deleteBtn }}
                        onClick={() => onDelete(p.id)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 18,
    boxShadow: "0 8px 24px rgba(2,6,23,0.06)",
    border: "1px solid rgba(15,23,42,0.03)",
  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  cardTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" },
  cardSubtitle: { margin: 0, fontSize: 13, color: "#64748b", marginTop: 4 },

  searchBox: { display: "flex", alignItems: "center", gap: 8 },
  searchInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #e6e9ef",
    fontSize: 14,
    outline: "none",
  },

  table: { width: "100%", borderCollapse: "collapse", marginTop: 14, tableLayout: "fixed" },
  thead: { background: "#f8fafc" },
  th: { textAlign: "left", padding: "12px 14px", color: "#334155", fontSize: 13, fontWeight: 700 },
  thCenter: { textAlign: "center", padding: "12px 14px", color: "#334155", fontSize: 13, fontWeight: 700 },

  td: {
    padding: "6px 8px",
    background: "#fff",
    color: "#0f172a",
    fontSize: 14,
    borderBottom: "1px solid #eef2f7",
    verticalAlign: "middle",
  },

  rowEven: { borderRadius: 8 },
  rowOdd: { background: "#fbfdff", borderRadius: 8 },

  actionsCell: { display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 4 },
  iconBtn: {
    width: 28,
    height: 28,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#0f172a",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(2,6,23,0.06)",
  },
  editBtn: { color: "#2563eb", borderColor: "#2563eb" },
  deleteBtn: { color: "#ef4444", borderColor: "#ef4444" },

  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px 8px",
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
    minWidth: 120,
  },
  badgeSuccess: { background: "rgba(16,185,129,0.12)", color: "#10b981" },
  badgeWarning: { background: "rgba(245,158,11,0.12)", color: "#f59e0b" },
};
