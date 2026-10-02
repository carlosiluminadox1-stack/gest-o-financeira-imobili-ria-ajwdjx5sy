migrate(
  (app) => {
    // -------------------------------------------------------------
    // ITEM 1: Preencher status vazio de transações de imposto (status -> "Pendente")
    // Especificamente:
    // - 8mnwoa6scz5usk1: "Repasse construção" (97.80)
    // - nc5hc82e617x3h9: "Comissão de administração" (246.252)
    // E qualquer outra transação com status vazio/null
    // -------------------------------------------------------------
    const idsStatusVazio = ['8mnwoa6scz5usk1', 'nc5hc82e617x3h9']
    for (let i = 0; i < idsStatusVazio.length; i++) {
      try {
        const t = app.findFirstRecordByData('transacoes', 'id', idsStatusVazio[i])
        t.set('status', 'Pendente')
        app.save(t)
      } catch (e) {
        console.log('Transacao ' + idsStatusVazio[i] + ' nao encontrada para preencher status:', e)
      }
    }

    // Atualizar genericamente qualquer transação com status vazio
    try {
      const transacoesSemStatus = app.findRecordsByFilter(
        'transacoes',
        "status = '' || status = null",
        '',
        1000,
        0,
      )
      for (let i = 0; i < transacoesSemStatus.length; i++) {
        const t = transacoesSemStatus[i]
        const st = t.getBool('consolidado') ? 'Pago' : 'Pendente'
        t.set('status', st)
        app.save(t)
      }
    } catch (e) {
      console.log('Erro ao buscar transacoes sem status:', e)
    }

    // -------------------------------------------------------------
    // ITEM 2: Corrigir 2 impostos antigos para a fórmula nova (6% só sobre a parte da imobiliária)
    // - 03/09 (id sxyjkqczipwdx0e): 223.794 -> 111.90
    // - 14/09 (id vwgg6n6hb05snnf): 81.00 -> 40.50
    // Atualizar também a descrição e notas fiscais/comissões se vinculadas
    // -------------------------------------------------------------
    // Transação 1: 03/09 (venda rx8tx0sktg5hf5x)
    try {
      const t1 = app.findFirstRecordByData('transacoes', 'id', 'sxyjkqczipwdx0e')
      t1.set('valor', 111.9)
      t1.set(
        'descricao',
        'Imposto Simples Nacional (6% s/ parte Imob) - PIX REC.OUTRA IF MT - Recebimento Pix | ALFA EMPRENDIMENTOS IMOBILIARIA LTDA | 48.236.892 0001-50',
      )
      t1.set('status', 'Pendente')
      app.save(t1)
    } catch (e) {
      console.log('Erro ao atualizar transacao sxyjkqczipwdx0e (03/09):', e)
    }

    // Transação 2: 14/09 (venda h5xguxwodg1mt8z)
    try {
      const t2 = app.findFirstRecordByData('transacoes', 'id', 'vwgg6n6hb05snnf')
      t2.set('valor', 40.5)
      t2.set(
        'descricao',
        'Imposto Simples Nacional (6% s/ parte Imob) - MARIA DE LOURDES FIGUEIREDO SOUZA LOCAÇÃO',
      )
      t2.set(
        'observacoes',
        'Imposto Simples Nacional (6% s/ parte Imob) - MARIA DE LOURDES FIGUEIREDO SOUZA LOCAÇÃO',
      )
      t2.set('status', 'Pendente')
      app.save(t2)
    } catch (e) {
      console.log('Erro ao atualizar transacao vwgg6n6hb05snnf (14/09):', e)
    }

    // -------------------------------------------------------------
    // ITEM 3: Arredondar valores de transações e comissões para 2 casas decimais (round2)
    // Arredondar transações de imposto e repasse com casas decimais quebradas
    // (ex: 223.794, 246.25199999999998, 543.3864, 851.30536, etc.)
    // -------------------------------------------------------------
    const todasTransacoes = app.findRecordsByFilter('transacoes', '', '', 1000, 0)
    for (let i = 0; i < todasTransacoes.length; i++) {
      const t = todasTransacoes[i]
      const val = Number(t.get('valor')) || 0
      const rounded = Math.round(val * 100) / 100
      if (Math.abs(val - rounded) > 0.0000001) {
        t.set('valor', rounded)
        app.save(t)
      }
    }

    // Arredondar comissões com dízimas/casas quebradas (ex: 3506.106, 3857.948)
    const todasComissoes = app.findRecordsByFilter('comissoes', '', '', 1000, 0)
    for (let j = 0; j < todasComissoes.length; j++) {
      const c = todasComissoes[j]
      const val = Number(c.get('valor')) || 0
      const rounded = Math.round(val * 100) / 100
      if (Math.abs(val - rounded) > 0.0000001) {
        c.set('valor', rounded)
        app.save(c)
      }
    }
  },
  (app) => {
    // Reverter apenas se necessário
    console.log('Rollback da migracao 0016')
  },
)
