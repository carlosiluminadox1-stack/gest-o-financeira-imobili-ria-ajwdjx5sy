migrate(
  (app) => {
    const despesasCol = app.findCollectionByNameOrId('despesas')
    const transacoesCol = app.findCollectionByNameOrId('transacoes')

    // 1. Add despesa relation to transacoes if not exists
    if (!transacoesCol.fields.getByName('despesa')) {
      transacoesCol.fields.add(
        new RelationField({
          name: 'despesa',
          collectionId: despesasCol.id,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        }),
      )
      app.save(transacoesCol)
    }
  },
  (app) => {
    try {
      const transacoesCol = app.findCollectionByNameOrId('transacoes')
      const fDespesa = transacoesCol.fields.getByName('despesa')
      if (fDespesa) {
        transacoesCol.fields.remove(fDespesa)
        app.save(transacoesCol)
      }
    } catch (_) {}
  },
)
