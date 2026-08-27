migrate(
  (app) => {
    const vendas = app.findCollectionByNameOrId('vendas')

    if (!vendas.fields.getByName('situacao_recebimento')) {
      vendas.fields.add(
        new SelectField({
          name: 'situacao_recebimento',
          values: ['Recebido', 'Parcial'],
          maxSelect: 1,
        }),
      )
    }

    if (!vendas.fields.getByName('valor_recebido')) {
      vendas.fields.add(
        new NumberField({
          name: 'valor_recebido',
        }),
      )
    }

    app.save(vendas)

    // Atualizar registros legados existentes se houver
    app
      .db()
      .newQuery(`
      UPDATE vendas
      SET situacao_recebimento = 'Recebido', valor_recebido = valor_comissao
      WHERE (situacao_recebimento IS NULL OR situacao_recebimento = '')
    `)
      .execute()
  },
  (app) => {
    const vendas = app.findCollectionByNameOrId('vendas')
    const f1 = vendas.fields.getByName('situacao_recebimento')
    if (f1) vendas.fields.remove(f1)
    const f2 = vendas.fields.getByName('valor_recebido')
    if (f2) vendas.fields.remove(f2)
    app.save(vendas)
  },
)
