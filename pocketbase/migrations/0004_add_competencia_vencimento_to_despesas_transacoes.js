migrate(
  (app) => {
    // 1. Add data_competencia and data_vencimento to 'despesas'
    const despesasCol = app.findCollectionByNameOrId('despesas')
    if (!despesasCol.fields.getByName('data_competencia')) {
      despesasCol.fields.add(
        new DateField({
          name: 'data_competencia',
          required: false,
        }),
      )
    }
    if (!despesasCol.fields.getByName('data_vencimento')) {
      despesasCol.fields.add(
        new DateField({
          name: 'data_vencimento',
          required: false,
        }),
      )
    }
    app.save(despesasCol)

    // 2. Add data_competencia and data_vencimento to 'transacoes'
    const transacoesCol = app.findCollectionByNameOrId('transacoes')
    if (!transacoesCol.fields.getByName('data_competencia')) {
      transacoesCol.fields.add(
        new DateField({
          name: 'data_competencia',
          required: false,
        }),
      )
    }
    if (!transacoesCol.fields.getByName('data_vencimento')) {
      transacoesCol.fields.add(
        new DateField({
          name: 'data_vencimento',
          required: false,
        }),
      )
    }
    app.save(transacoesCol)
  },
  (app) => {
    try {
      const despesasCol = app.findCollectionByNameOrId('despesas')
      despesasCol.fields.removeByName('data_competencia')
      despesasCol.fields.removeByName('data_vencimento')
      app.save(despesasCol)
    } catch (_) {}

    try {
      const transacoesCol = app.findCollectionByNameOrId('transacoes')
      transacoesCol.fields.removeByName('data_competencia')
      transacoesCol.fields.removeByName('data_vencimento')
      app.save(transacoesCol)
    } catch (_) {}
  },
)
