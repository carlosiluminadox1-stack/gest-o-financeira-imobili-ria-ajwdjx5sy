migrate(
  (app) => {
    const vendas = app.findCollectionByNameOrId('vendas')

    const vgvField = vendas.fields.getByName('valor_vgv')
    if (vgvField) {
      vgvField.required = false
    }

    const pctField = vendas.fields.getByName('percentual_comissao')
    if (pctField) {
      pctField.required = false
    }

    app.save(vendas)
  },
  (app) => {
    const vendas = app.findCollectionByNameOrId('vendas')

    const vgvField = vendas.fields.getByName('valor_vgv')
    if (vgvField) {
      vgvField.required = true
    }

    const pctField = vendas.fields.getByName('percentual_comissao')
    if (pctField) {
      pctField.required = true
    }

    app.save(vendas)
  },
)
