migrate(
  (app) => {
    // 1. Adicionar campo valor_previsto_imobiliaria à collection vendas
    const vendas = app.findCollectionByNameOrId('vendas')
    if (!vendas.fields.getByName('valor_previsto_imobiliaria')) {
      vendas.fields.add(
        new NumberField({
          name: 'valor_previsto_imobiliaria',
          required: false,
          min: 0,
        }),
      )
      app.save(vendas)
    }

    // 2. Inicializar valor_previsto_imobiliaria nas vendas existentes
    const allVendas = app.findRecordsByFilter('vendas', '', 'created', 1000, 0)
    for (let i = 0; i < allVendas.length; i++) {
      const v = allVendas[i]
      const id = v.id
      const forma = v.getString('forma_pagamento') || 'Centralizada'
      const valorComissao = v.getFloat('valor_comissao') || 0

      // Se for Studio Collegiate One (iq71s8qtqwzfmru): 50% de 7500 = 3750 bruto, líquido 3525 (imposto 225)
      // Conforme especificação: no modo Separada previsto a receber pela imobiliária é R$ 3.525 (ou 3.750 bruto menos imposto 225)
      if (id === 'iq71s8qtqwzfmru') {
        v.set('valor_previsto_imobiliaria', 3525)
        app.save(v)
        continue
      }

      // Para as demais vendas:
      // Se tiver comissão cadastrada:
      // 50% bruto - 6% imposto sobre 50% bruto = 50% * 0.94 = 47% do total (se 50% imob)
      // Se não tiver divisão, calcular com base padrão (50% imobiliária - 6% imposto = líquido)
      const pctImob = 50
      const imobBruto = (valorComissao * pctImob) / 100
      const imposto = (imobBruto * 6) / 100
      const previstoLiq = Math.round((imobBruto - imposto) * 100) / 100
      v.set('valor_previsto_imobiliaria', previstoLiq > 0 ? previstoLiq : valorComissao)
      app.save(v)
    }
  },
  (app) => {
    const vendas = app.findCollectionByNameOrId('vendas')
    const field = vendas.fields.getByName('valor_previsto_imobiliaria')
    if (field) {
      vendas.fields.removeByName('valor_previsto_imobiliaria')
      app.save(vendas)
    }
  },
)
