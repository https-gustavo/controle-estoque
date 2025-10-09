import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function AddProduct({ onProductAdded }) {
  const [form, setForm] = useState({
    barcode: "",
    name: "",
    category_id: "",
    quantity: "",
    cost_price: "",
    sale_price: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Normalizar números
    const payload = {
      barcode: String(form.barcode || '').trim(),
      name: String(form.name || '').trim(),
      quantity: form.quantity !== '' ? parseFloat(String(form.quantity).replace(',', '.')) : null,
      cost_price: form.cost_price !== '' ? parseFloat(String(form.cost_price).replace(',', '.')) : null,
      sale_price: form.sale_price !== '' ? parseFloat(String(form.sale_price).replace(',', '.')) : null,
    };
    // category_id: enviar apenas se válido e numérico
    if (form.category_id !== '') {
      const cid = parseInt(String(form.category_id).trim(), 10);
      if (!isNaN(cid)) payload.category_id = cid;
    }
    // Associa produto ao usuário autenticado
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) {
      alert('Usuário não autenticado. Faça login novamente.');
      return;
    }
    const payloadWithUser = { ...payload, user_id: uid };
    // Tenta inserir com cost_price; se não existir no schema, faz fallback para last_purchase_value
    const { data, error } = await supabase.from("products").insert([payloadWithUser]);

    if (error) {
      if (/cost_price/i.test(error.message)) {
        const legacyPayload = {
          ...payloadWithUser,
          last_purchase_value: payload.cost_price ?? null,
        };
        delete legacyPayload.cost_price;
        const { data: legacyData, error: legacyError } = await supabase
          .from("products")
          .insert([legacyPayload]);
        if (legacyError) {
          alert("Erro ao cadastrar: " + legacyError.message);
          return;
        }
        alert("Produto cadastrado com sucesso!");
        setForm({
          barcode: "",
          name: "",
          category_id: "",
          quantity: "",
          cost_price: "",
          sale_price: "",
        });
        if (onProductAdded) onProductAdded(legacyData[0]);
        return;
      }
      alert("Erro ao cadastrar: " + (error.message || "Requisição inválida (400). Verifique colunas do schema."));
    } else {
      alert("Produto cadastrado com sucesso!");
      setForm({
        barcode: "",
        name: "",
        category_id: "",
        quantity: "",
        cost_price: "",
        sale_price: "",
      });
      if (onProductAdded) onProductAdded(data[0]);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white shadow-md rounded-lg p-6 mb-6"
    >
      <h2 className="text-lg font-semibold mb-4">Cadastrar Produto</h2>

      <input
        type="text"
        name="barcode"
        value={form.barcode}
        onChange={handleChange}
        placeholder="Código de Barras"
        className="border p-2 w-full mb-2 rounded"
      />

      <input
        type="text"
        name="name"
        value={form.name}
        onChange={handleChange}
        placeholder="Nome"
        className="border p-2 w-full mb-2 rounded"
      />

      <input
        type="number"
        name="category_id"
        value={form.category_id}
        onChange={handleChange}
        placeholder="ID da Categoria"
        className="border p-2 w-full mb-2 rounded"
      />

      <input
        type="number"
        name="quantity"
        value={form.quantity}
        onChange={handleChange}
        placeholder="Quantidade"
        className="border p-2 w-full mb-2 rounded"
        min="0"
        step="1"
      />

      <input
        type="number"
        name="cost_price"
        value={form.cost_price}
        onChange={handleChange}
        placeholder="Preço de Custo (R$)"
        className="border p-2 w-full mb-2 rounded"
        min="0.00"
        step="0.01"
      />

      {/* Margem é calculada a partir de custo e venda e apresentada em relatórios */}

      <input
        type="number"
        name="sale_price"
        value={form.sale_price}
        onChange={handleChange}
        placeholder="Preço de Venda (R$)"
        className="border p-2 w-full mb-2 rounded"
        min="0.00"
        step="0.01"
      />

      <button
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Salvar Produto
      </button>
    </form>
  );
}
