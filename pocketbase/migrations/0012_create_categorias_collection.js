migrate(
  (app) => {
    // 1. Create categorias collection
    try {
      app.findCollectionByNameOrId('categorias')
    } catch (_) {
      const categorias = new Collection({
        name: 'categorias',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'nome', type: 'text', required: true },
          {
            name: 'tipo',
            type: 'select',
            required: true,
            values: ['entrada', 'saida', 'ambos'],
            maxSelect: 1,
          },
          { name: 'cor', type: 'text' },
          { name: 'ativo', type: 'bool' },
          {
            name: 'user',
            type: 'relation',
            required: false,
            collectionId: '_pb_users_auth_',
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_categorias_tipo ON categorias (tipo)',
          'CREATE INDEX idx_categorias_ativo ON categorias (ativo)',
        ],
      })
      app.save(categorias)
    }

    // 2. Change 'categoria' on transacoes from fixed select to text
    const transacoesCol = app.findCollectionByNameOrId('transacoes')
    const catFieldTransacoes = transacoesCol.fields.getByName('categoria')
    if (catFieldTransacoes && catFieldTransacoes.type !== 'text') {
      transacoesCol.fields.removeByName('categoria')
      transacoesCol.fields.add(
        new TextField({
          name: 'categoria',
          required: false,
        }),
      )
      app.save(transacoesCol)
    }

    // 3. Change 'categoria' on despesas from fixed select to text
    const despesasCol = app.findCollectionByNameOrId('despesas')
    const catFieldDespesas = despesasCol.fields.getByName('categoria')
    if (catFieldDespesas && catFieldDespesas.type !== 'text') {
      despesasCol.fields.removeByName('categoria')
      despesasCol.fields.add(
        new TextField({
          name: 'categoria',
          required: false,
        }),
      )
      app.save(despesasCol)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('categorias')
      app.delete(col)
    } catch (_) {}
  },
)
