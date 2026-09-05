migrate(
  (app) => {
    // Ordem de limpeza respeitando integridade referencial:
    // 1. fechamentos (sem dependências de FK direta, referencia users)
    // 2. notas_fiscais (referencia vendas, users)
    // 3. transacoes (referencia vendas, comissoes, despesas, users)
    // 4. comissoes (referencia vendas, corretores, users)
    // 5. despesas (referencia users)
    // 6. metas_vgv (referencia users)
    // 7. vendas (referencia corretores, users)
    // 8. corretores (referenciado por vendas, comissoes)

    const collectionsToClean = [
      'fechamentos',
      'notas_fiscais',
      'transacoes',
      'comissoes',
      'despesas',
      'metas_vgv',
      'vendas',
      'corretores',
    ]

    for (const name of collectionsToClean) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.truncateCollection(col)
      } catch (err) {
        // Fallback usando raw SQL caso truncateCollection encontre restrição
        try {
          app.db().newQuery(`DELETE FROM ${name}`).execute()
        } catch (sqlErr) {
          console.log(`Erro ao limpar ${name}: ${sqlErr}`)
        }
      }
    }
  },
  (app) => {
    // down migration: limpeza de dados não precisa ser desfeita
  },
)
