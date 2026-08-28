migrate(
  (app) => {
    const vendas = app.findCollectionByNameOrId('vendas')
    const corretores = app.findCollectionByNameOrId('corretores')

    if (!vendas.fields.getByName('captadores')) {
      vendas.fields.add(
        new RelationField({
          name: 'captadores',
          collectionId: corretores.id,
          cascadeDelete: false,
          maxSelect: 10,
        }),
      )
    }

    app.save(vendas)

    // Backfill captadores from existing captador relation
    try {
      const records = app.findRecordsByFilter(
        'vendas',
        "captador != '' && captador != null",
        '-created',
        500,
        0,
      )
      for (let i = 0; i < records.length; i++) {
        const r = records[i]
        const singleCaptador = r.getString('captador')
        if (singleCaptador) {
          r.set('captadores', [singleCaptador])
          app.save(r)
        }
      }
    } catch (_) {}
  },
  (app) => {
    const vendas = app.findCollectionByNameOrId('vendas')
    const f = vendas.fields.getByName('captadores')
    if (f) vendas.fields.remove(f)
    app.save(vendas)
  },
)
