migrate(
  (app) => {
    const vendas = app.findCollectionByNameOrId('vendas')

    if (!vendas.fields.getByName('tipo_venda')) {
      vendas.fields.add(
        new SelectField({
          name: 'tipo_venda',
          required: false,
          values: ['venda', 'locacao', 'administracao'],
          maxSelect: 1,
        }),
      )
    }

    if (!vendas.fields.getByName('data_recebimento')) {
      vendas.fields.add(
        new DateField({
          name: 'data_recebimento',
          required: false,
        }),
      )
    }

    if (!vendas.fields.getByName('is_valor_fixo')) {
      vendas.fields.add(
        new BoolField({
          name: 'is_valor_fixo',
          required: false,
        }),
      )
    }

    app.save(vendas)

    // Backfill valores padrão para registros legados
    try {
      const records = app.findRecordsByFilter(
        'vendas',
        "tipo_venda = '' || tipo_venda = null",
        '-created',
        500,
        0,
      )
      for (let i = 0; i < records.length; i++) {
        const r = records[i]
        r.set('tipo_venda', 'venda')
        if (!r.get('data_recebimento') && r.get('data_venda')) {
          r.set('data_recebimento', r.get('data_venda'))
        }
        app.save(r)
      }
    } catch (_) {}
  },
  (app) => {
    const vendas = app.findCollectionByNameOrId('vendas')
    const f1 = vendas.fields.getByName('tipo_venda')
    if (f1) vendas.fields.remove(f1)
    const f2 = vendas.fields.getByName('data_recebimento')
    if (f2) vendas.fields.remove(f2)
    const f3 = vendas.fields.getByName('is_valor_fixo')
    if (f3) vendas.fields.remove(f3)
    app.save(vendas)
  },
)
