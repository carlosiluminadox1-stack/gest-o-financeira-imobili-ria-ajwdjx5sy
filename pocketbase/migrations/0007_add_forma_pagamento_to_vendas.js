migrate(
  (app) => {
    const vendas = app.findCollectionByNameOrId('vendas')

    if (!vendas.fields.getByName('forma_pagamento')) {
      vendas.fields.add(
        new SelectField({
          name: 'forma_pagamento',
          required: false,
          values: ['Centralizada', 'Separada'],
          maxSelect: 1,
        }),
      )
    }

    app.save(vendas)

    // Backfill: preencher vendas existentes como 'Centralizada'
    try {
      const records = app.findRecordsByFilter(
        'vendas',
        "forma_pagamento = '' || forma_pagamento = null",
        '-created',
        500,
        0,
      )
      for (let i = 0; i < records.length; i++) {
        const r = records[i]
        r.set('forma_pagamento', 'Centralizada')
        app.save(r)
      }
    } catch (_) {}
  },
  (app) => {
    const vendas = app.findCollectionByNameOrId('vendas')
    const f = vendas.fields.getByName('forma_pagamento')
    if (f) vendas.fields.remove(f)
    app.save(vendas)
  },
)
