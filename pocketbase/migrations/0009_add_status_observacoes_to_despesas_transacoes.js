migrate(
  (app) => {
    // 1. Add status and observacoes to 'despesas'
    const despesasCol = app.findCollectionByNameOrId('despesas')
    if (!despesasCol.fields.getByName('status')) {
      despesasCol.fields.add(
        new SelectField({
          name: 'status',
          required: false,
          values: ['Pendente', 'Pago', 'Cancelado'],
          maxSelect: 1,
        }),
      )
    }
    if (!despesasCol.fields.getByName('observacoes')) {
      despesasCol.fields.add(
        new TextField({
          name: 'observacoes',
          required: false,
        }),
      )
    }
    app.save(despesasCol)

    // 2. Add status and observacoes to 'transacoes'
    const transacoesCol = app.findCollectionByNameOrId('transacoes')
    if (!transacoesCol.fields.getByName('status')) {
      transacoesCol.fields.add(
        new SelectField({
          name: 'status',
          required: false,
          values: ['Pendente', 'Pago', 'Cancelado'],
          maxSelect: 1,
        }),
      )
    }
    if (!transacoesCol.fields.getByName('observacoes')) {
      transacoesCol.fields.add(
        new TextField({
          name: 'observacoes',
          required: false,
        }),
      )
    }
    app.save(transacoesCol)
  },
  (app) => {
    try {
      const despesasCol = app.findCollectionByNameOrId('despesas')
      const fStatus = despesasCol.fields.getByName('status')
      if (fStatus) despesasCol.fields.remove(fStatus)
      const fObs = despesasCol.fields.getByName('observacoes')
      if (fObs) despesasCol.fields.remove(fObs)
      app.save(despesasCol)
    } catch (_) {}

    try {
      const transacoesCol = app.findCollectionByNameOrId('transacoes')
      const fStatus = transacoesCol.fields.getByName('status')
      if (fStatus) transacoesCol.fields.remove(fStatus)
      const fObs = transacoesCol.fields.getByName('observacoes')
      if (fObs) transacoesCol.fields.remove(fObs)
      app.save(transacoesCol)
    } catch (_) {}
  },
)
