migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    let userRecord

    try {
      userRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'carlosiluminadox1@gmail.com')
    } catch (_) {
      userRecord = new Record(users)
      userRecord.setEmail('carlosiluminadox1@gmail.com')
      userRecord.setPassword('Skip@Pass')
      userRecord.setVerified(true)
      userRecord.set('name', 'Carlos Silva (Sócio)')
      userRecord.set('perfil', 'socio')
      app.save(userRecord)
    }

    const userId = userRecord.id

    // 1. Configuracoes
    const configsCol = app.findCollectionByNameOrId('configuracoes')
    try {
      app.findFirstRecordByData('configuracoes', 'user', userId)
    } catch (_) {
      const configRecord = new Record(configsCol)
      configRecord.set('user', userId)
      configRecord.set('percentual_imobiliaria', 50)
      configRecord.set('percentual_corretor', 40)
      configRecord.set('percentual_captador', 10)
      configRecord.set('percentual_comissao_padrao', 6)
      app.save(configRecord)
    }

    // 2. Corretores
    const corretoresCol = app.findCollectionByNameOrId('corretores')
    const corretoresList = [
      {
        nome: 'Mariana Albuquerque',
        email: 'mariana.imob@exemplo.com',
        telefone: '(11) 98765-4321',
        creci: '12345-F',
        ativo: true,
      },
      {
        nome: 'Rodrigo Mendonça',
        email: 'rodrigo.imob@exemplo.com',
        telefone: '(11) 97654-3210',
        creci: '23456-F',
        ativo: true,
      },
      {
        nome: 'Camila Guimarães',
        email: 'camila.imob@exemplo.com',
        telefone: '(11) 96543-2109',
        creci: '34567-F',
        ativo: true,
      },
    ]

    const corretorRecords = []
    for (const c of corretoresList) {
      try {
        const rec = app.findFirstRecordByData('corretores', 'email', c.email)
        corretorRecords.push(rec)
      } catch (_) {
        const rec = new Record(corretoresCol)
        rec.set('nome', c.nome)
        rec.set('email', c.email)
        rec.set('telefone', c.telefone)
        rec.set('creci', c.creci)
        rec.set('ativo', c.ativo)
        app.save(rec)
        corretorRecords.push(rec)
      }
    }

    const mariana = corretorRecords[0]
    const rodrigo = corretorRecords[1]
    const camila = corretorRecords[2]

    // 3. Metas VGV
    const metasCol = app.findCollectionByNameOrId('metas_vgv')
    const now = new Date()
    const curYear = now.getFullYear()
    const curMonth = now.getMonth() // 0-indexed

    // Format dates: YYYY-MM-DD
    const formatIsoDate = (d) => d.toISOString().split('T')[0] + ' 00:00:00.000Z'

    const startOfMonth = new Date(Date.UTC(curYear, curMonth, 1))
    const endOfMonth = new Date(Date.UTC(curYear, curMonth + 1, 0, 23, 59, 59))
    const startOfYear = new Date(Date.UTC(curYear, 0, 1))
    const endOfYear = new Date(Date.UTC(curYear, 11, 31, 23, 59, 59))

    try {
      app.findFirstRecordByData('metas_vgv', 'titulo', 'Meta Mensal — VGV Principal')
    } catch (_) {
      const meta1 = new Record(metasCol)
      meta1.set('titulo', 'Meta Mensal — VGV Principal')
      meta1.set('periodo', 'mensal')
      meta1.set('data_inicio', formatIsoDate(startOfMonth))
      meta1.set('data_fim', formatIsoDate(endOfMonth))
      meta1.set('valor_meta', 2500000)
      meta1.set('user', userId)
      app.save(meta1)
    }

    try {
      app.findFirstRecordByData('metas_vgv', 'titulo', 'Meta Anual — Expansão Imobiliária')
    } catch (_) {
      const meta2 = new Record(metasCol)
      meta2.set('titulo', 'Meta Anual — Expansão Imobiliária')
      meta2.set('periodo', 'anual')
      meta2.set('data_inicio', formatIsoDate(startOfYear))
      meta2.set('data_fim', formatIsoDate(endOfYear))
      meta2.set('valor_meta', 30000000)
      meta2.set('user', userId)
      app.save(meta2)
    }

    // 4. Vendas de Exemplo
    const vendasCol = app.findCollectionByNameOrId('vendas')
    const comissoesCol = app.findCollectionByNameOrId('comissoes')
    const transacoesCol = app.findCollectionByNameOrId('transacoes')
    const notasCol = app.findCollectionByNameOrId('notas_fiscais')

    const sampleVendas = [
      {
        titulo: 'Apartamento Jardins 180m² - Ed. Bauhaus',
        cliente: 'Eduardo Fonseca',
        corretor: mariana.id,
        captador: camila.id,
        vgv: 1200000,
        pctComissao: 6,
        comissao: 72000,
        data: formatIsoDate(new Date(Date.UTC(curYear, curMonth, 5))),
        status: 'realizada',
      },
      {
        titulo: 'Cobertura Duplex Vila Nova Conceição 240m²',
        cliente: 'Beatriz Vasconcelos',
        corretor: rodrigo.id,
        captador: mariana.id,
        vgv: 1850000,
        pctComissao: 6,
        comissao: 111000,
        data: formatIsoDate(new Date(Date.UTC(curYear, curMonth, 12))),
        status: 'realizada',
      },
      {
        titulo: 'Casa em Condomínio Fechado Alphaville 380m²',
        cliente: 'Marcelo Siqueira',
        corretor: camila.id,
        captador: rodrigo.id,
        vgv: 2400000,
        pctComissao: 6,
        comissao: 144000,
        data: formatIsoDate(new Date(Date.UTC(curYear, curMonth, 18))),
        status: 'pendente',
      },
      {
        titulo: 'Studio Pinheiros 45m² - Decorado',
        cliente: 'Larissa Prado',
        corretor: mariana.id,
        captador: null,
        vgv: 480000,
        pctComissao: 6,
        comissao: 28800,
        data: formatIsoDate(new Date(Date.UTC(curYear, curMonth, 22))),
        status: 'realizada',
      },
      {
        titulo: 'Sala Comercial Berrini 90m²',
        cliente: 'Tecnologia Alfa Ltda',
        corretor: rodrigo.id,
        captador: camila.id,
        vgv: 650000,
        pctComissao: 5,
        comissao: 32500,
        data: formatIsoDate(new Date(Date.UTC(curYear, curMonth, 24))),
        status: 'cancelada',
      },
    ]

    let vendaCount = 0
    for (const v of sampleVendas) {
      vendaCount++
      try {
        app.findFirstRecordByData('vendas', 'titulo_imovel', v.titulo)
      } catch (_) {
        const vRec = new Record(vendasCol)
        vRec.set('titulo_imovel', v.titulo)
        vRec.set('cliente', v.cliente)
        vRec.set('corretor', v.corretor)
        if (v.captador) vRec.set('captador', v.captador)
        vRec.set('valor_vgv', v.vgv)
        vRec.set('percentual_comissao', v.pctComissao)
        vRec.set('valor_comissao', v.comissao)
        vRec.set('data_venda', v.data)
        vRec.set('status', v.status)
        vRec.set('user', userId)
        app.save(vRec)

        if (v.status === 'realizada') {
          // Gerar divisao: Imobiliaria 50%, Corretor 40%, Captador 10% (ou se sem captador, corretor 50%)
          const temCaptador = !!v.captador
          const pctImob = 50
          const pctCorr = temCaptador ? 40 : 50
          const pctCapt = temCaptador ? 10 : 0

          const valImob = (v.comissao * pctImob) / 100
          const valCorr = (v.comissao * pctCorr) / 100
          const valCapt = temCaptador ? (v.comissao * pctCapt) / 100 : 0

          // Comissao Imobiliaria
          const cImob = new Record(comissoesCol)
          cImob.set('venda', vRec.id)
          cImob.set('parte', 'imobiliaria')
          cImob.set('percentual', pctImob)
          cImob.set('valor', valImob)
          // Deixar a primeira realizada como recebida para ter fluxo e nota fiscal!
          const isRecebida = vendaCount === 1
          cImob.set('status', isRecebida ? 'recebida' : 'pendente')
          if (isRecebida) {
            cImob.set('data_recebimento', v.data)
          }
          cImob.set('user', userId)
          app.save(cImob)

          if (isRecebida) {
            // Transacao de entrada
            const tEntrada = new Record(transacoesCol)
            tEntrada.set('tipo', 'entrada')
            tEntrada.set('descricao', 'Recebimento comissão - ' + v.titulo)
            tEntrada.set('categoria', 'comissao')
            tEntrada.set('valor', valImob)
            tEntrada.set('data', v.data)
            tEntrada.set('consolidado', false)
            tEntrada.set('venda', vRec.id)
            tEntrada.set('comissao', cImob.id)
            tEntrada.set('user', userId)
            app.save(tEntrada)

            // Nota Fiscal
            const impostoVal = (valImob * 6) / 100
            const nf = new Record(notasCol)
            nf.set('numero', `NF-${curYear}-0001`)
            nf.set('venda', vRec.id)
            nf.set('cliente', v.cliente)
            nf.set('valor', valImob)
            nf.set('taxa', 6)
            nf.set('valor_imposto', impostoVal)
            nf.set('data_emissao', v.data)
            nf.set('status', 'emitida')
            nf.set('user', userId)
            app.save(nf)

            // Transacao saida imposto
            const tImposto = new Record(transacoesCol)
            tImposto.set('tipo', 'saida')
            tImposto.set('descricao', 'Imposto Simples Nacional (6%) - NF-' + curYear + '-0001')
            tImposto.set('categoria', 'imposto')
            tImposto.set('valor', impostoVal)
            tImposto.set('data', v.data)
            tImposto.set('consolidado', false)
            tImposto.set('venda', vRec.id)
            tImposto.set('user', userId)
            app.save(tImposto)
          }

          // Comissao Corretor
          const cCorr = new Record(comissoesCol)
          cCorr.set('venda', vRec.id)
          cCorr.set('parte', 'corretor')
          cCorr.set('corretor', v.corretor)
          cCorr.set('percentual', pctCorr)
          cCorr.set('valor', valCorr)
          const isPago = vendaCount === 1
          cCorr.set('status', isPago ? 'paga' : 'pendente')
          if (isPago) {
            cCorr.set('data_recebimento', v.data)
          }
          cCorr.set('user', userId)
          app.save(cCorr)

          if (isPago) {
            const tRepasse = new Record(transacoesCol)
            tRepasse.set('tipo', 'saida')
            tRepasse.set('descricao', 'Repasse comissão corretor - ' + v.titulo)
            tRepasse.set('categoria', 'repasse')
            tRepasse.set('valor', valCorr)
            tRepasse.set('data', v.data)
            tRepasse.set('consolidado', false)
            tRepasse.set('venda', vRec.id)
            tRepasse.set('comissao', cCorr.id)
            tRepasse.set('user', userId)
            app.save(tRepasse)
          }

          // Comissao Captador
          if (temCaptador && valCapt > 0) {
            const cCapt = new Record(comissoesCol)
            cCapt.set('venda', vRec.id)
            cCapt.set('parte', 'captador')
            cCapt.set('corretor', v.captador)
            cCapt.set('percentual', pctCapt)
            cCapt.set('valor', valCapt)
            cCapt.set('status', 'pendente')
            cCapt.set('user', userId)
            app.save(cCapt)
          }
        }
      }
    }

    // 5. Despesas de Exemplo
    const despesasCol = app.findCollectionByNameOrId('despesas')
    const sampleDespesas = [
      {
        descricao: 'Aluguel Sede & Condomínio',
        categoria: 'aluguel',
        valor: 4500,
        data: formatIsoDate(new Date(Date.UTC(curYear, curMonth, 10))),
        recorrente: true,
        frequencia: 'mensal',
        ativa: true,
      },
      {
        descricao: 'Marketing Digital Google Ads & Portais Imobiliários (ZAP/VivaReal)',
        categoria: 'marketing',
        valor: 3200,
        data: formatIsoDate(new Date(Date.UTC(curYear, curMonth, 8))),
        recorrente: true,
        frequencia: 'mensal',
        ativa: true,
      },
      {
        descricao: 'Salários Secretária & Suporte Administrativo',
        categoria: 'salarios',
        valor: 5000,
        data: formatIsoDate(new Date(Date.UTC(curYear, curMonth, 5))),
        recorrente: true,
        frequencia: 'mensal',
        ativa: true,
      },
      {
        descricao: 'Internet Fibra e Telefonia VoIP',
        categoria: 'utilidades',
        valor: 420,
        data: formatIsoDate(new Date(Date.UTC(curYear, curMonth, 15))),
        recorrente: true,
        frequencia: 'mensal',
        ativa: true,
      },
      {
        descricao: 'Material de Escritório e Café',
        categoria: 'outros',
        valor: 350,
        data: formatIsoDate(new Date(Date.UTC(curYear, curMonth, 16))),
        recorrente: false,
        frequencia: null,
        ativa: false,
      },
    ]

    for (const d of sampleDespesas) {
      try {
        app.findFirstRecordByData('despesas', 'descricao', d.descricao)
      } catch (_) {
        const dRec = new Record(despesasCol)
        dRec.set('descricao', d.descricao)
        dRec.set('categoria', d.categoria)
        dRec.set('valor', d.valor)
        dRec.set('data', d.data)
        dRec.set('recorrente', d.recorrente)
        if (d.frequencia) dRec.set('frequencia', d.frequencia)
        dRec.set('ativa', d.ativa)
        dRec.set('user', userId)
        app.save(dRec)

        // Gerar transacao de saida para a despesa
        const tDesp = new Record(transacoesCol)
        tDesp.set('tipo', 'saida')
        tDesp.set('descricao', d.descricao)
        tDesp.set('categoria', d.categoria)
        tDesp.set('valor', d.valor)
        tDesp.set('data', d.data)
        tDesp.set('consolidado', false)
        tDesp.set('user', userId)
        app.save(tDesp)
      }
    }
  },
  (app) => {
    // down migration
  },
)
