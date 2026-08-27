// Hook to process recurring expenses daily at midnight UTC
cronAdd('process_recurring_expenses', '0 0 * * *', () => {
  try {
    const despesas = $app.findRecordsByFilter(
      'despesas',
      'recorrente = true && ativa = true',
      '-created',
      500,
      0,
    )

    const now = new Date()
    const todayIso = now.toISOString().split('T')[0] + ' 00:00:00.000Z'

    const transacoesCol = $app.findCollectionByNameOrId('transacoes')

    for (let i = 0; i < despesas.length; i++) {
      const d = despesas[i]
      // Create transaction for recurring expense
      const t = new Record(transacoesCol)
      t.set('tipo', 'saida')
      t.set('descricao', d.getString('descricao') + ' (Recorrência)')
      t.set('categoria', d.getString('categoria'))
      t.set('valor', d.getFloat('valor'))
      t.set('data', todayIso)
      t.set('consolidado', false)
      t.set('user', d.getString('user'))
      $app.save(t)
    }
  } catch (err) {
    console.error('Error processing recurring expenses:', err)
  }
})
