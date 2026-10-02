migrate(
  (app) => {
    // 1. Adicionar campo codigo_referencia à collection vendas
    const vendas = app.findCollectionByNameOrId('vendas')
    if (!vendas.fields.getByName('codigo_referencia')) {
      vendas.fields.add(
        new TextField({
          name: 'codigo_referencia',
          required: false,
        }),
      )
      app.save(vendas)
    }

    // 2. Backfill do codigo_referencia para vendas existentes ordenadas cronologicamente
    // Agrupamento sequencial por ano: VENDA-{ano}-0001, VENDA-{ano}-0002, etc.
    const allVendas = app.findRecordsByFilter('vendas', '', 'data_venda,created', 1000, 0)
    const countByYear = {}

    for (let i = 0; i < allVendas.length; i++) {
      const v = allVendas[i]
      let ano = '2026'
      const dataVendaStr = v.getString('data_venda') || v.getString('created')
      if (dataVendaStr && dataVendaStr.length >= 4) {
        ano = dataVendaStr.substring(0, 4)
      }
      countByYear[ano] = (countByYear[ano] || 0) + 1
      const seqStr = String(countByYear[ano]).padStart(4, '0')
      const codigo = 'VENDA-' + ano + '-' + seqStr

      v.set('codigo_referencia', codigo)
      app.save(v)
    }

    // 3. AÇÃO 1: Corrigir dados no banco da venda "Studio Collegiate One" (id: iq71s8qtqwzfmru)
    // Atualizar valor_recebido da venda para 3750 (na forma Separada, entra apenas a cota da imobiliária)
    try {
      const vendaStudio = app.findFirstRecordByData('vendas', 'id', 'iq71s8qtqwzfmru')
      vendaStudio.set('valor_recebido', 3750)
      app.save(vendaStudio)
    } catch (e) {
      console.log('Venda Studio Collegiate One não encontrada ou erro ao atualizar:', e)
    }

    // Atualizar n81tk58yh51wcyc de 7500 para 3750
    try {
      const tEntrada = app.findFirstRecordByData('transacoes', 'id', 'n81tk58yh51wcyc')
      tEntrada.set('valor', 3750)
      app.save(tEntrada)
    } catch (e) {
      console.log('Transacao n81tk58yh51wcyc nao encontrada:', e)
    }

    // Excluir saídas indevidas no modo Separada:
    // 9ddeztvhupi0m6y (saída repasse corretor 3.000)
    // mpmdoxsnyxxnuh4 (saída repasse captador 750)
    // aecdh2ynzsslfx0 (duplicata 750)
    // kk28uvdd78ujwqz (duplicata 3.000)
    // flgxuxp6jo9ht6g (duplicata 3.525)
    const idsParaExcluir = [
      '9ddeztvhupi0m6y',
      'mpmdoxsnyxxnuh4',
      'aecdh2ynzsslfx0',
      'kk28uvdd78ujwqz',
      'flgxuxp6jo9ht6g',
    ]

    for (let j = 0; j < idsParaExcluir.length; j++) {
      try {
        const tDel = app.findFirstRecordByData('transacoes', 'id', idsParaExcluir[j])
        app.delete(tDel)
      } catch (e) {
        console.log('Transacao já ausente ou erro ao excluir ' + idsParaExcluir[j] + ':', e)
      }
    }
  },
  (app) => {
    const vendas = app.findCollectionByNameOrId('vendas')
    const field = vendas.fields.getByName('codigo_referencia')
    if (field) {
      vendas.fields.removeByName('codigo_referencia')
      app.save(vendas)
    }
  },
)
