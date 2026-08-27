migrate(
  (app) => {
    // 1. corretores
    const corretores = new Collection({
      name: 'corretores',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'email', type: 'text', required: true },
        { name: 'telefone', type: 'text' },
        { name: 'creci', type: 'text' },
        { name: 'ativo', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_corretores_ativo ON corretores (ativo)'],
    })
    app.save(corretores)

    const corretoresId = corretores.id

    // 2. vendas
    const vendas = new Collection({
      name: 'vendas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'titulo_imovel', type: 'text', required: true },
        { name: 'cliente', type: 'text' },
        {
          name: 'corretor',
          type: 'relation',
          required: true,
          collectionId: corretoresId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'captador',
          type: 'relation',
          collectionId: corretoresId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'valor_vgv', type: 'number', required: true },
        { name: 'percentual_comissao', type: 'number', required: true },
        { name: 'valor_comissao', type: 'number', required: true },
        { name: 'data_venda', type: 'date', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['realizada', 'pendente', 'cancelada'],
          maxSelect: 1,
        },
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_vendas_data ON vendas (data_venda DESC)',
        'CREATE INDEX idx_vendas_status ON vendas (status)',
        'CREATE INDEX idx_vendas_corretor ON vendas (corretor)',
      ],
    })
    app.save(vendas)

    const vendasId = vendas.id

    // 3. comissoes
    const comissoes = new Collection({
      name: 'comissoes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'venda',
          type: 'relation',
          required: true,
          collectionId: vendasId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'parte',
          type: 'select',
          required: true,
          values: ['imobiliaria', 'corretor', 'captador'],
          maxSelect: 1,
        },
        {
          name: 'corretor',
          type: 'relation',
          collectionId: corretoresId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'percentual', type: 'number', required: true },
        { name: 'valor', type: 'number', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pendente', 'recebida', 'paga'],
          maxSelect: 1,
        },
        { name: 'data_recebimento', type: 'date' },
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_comissoes_status ON comissoes (status)',
        'CREATE INDEX idx_comissoes_venda ON comissoes (venda)',
      ],
    })
    app.save(comissoes)

    const comissoesId = comissoes.id

    // 4. metas_vgv
    const metas = new Collection({
      name: 'metas_vgv',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'titulo', type: 'text', required: true },
        {
          name: 'periodo',
          type: 'select',
          required: true,
          values: ['mensal', 'trimestral', 'semestral', 'anual'],
          maxSelect: 1,
        },
        { name: 'data_inicio', type: 'date', required: true },
        { name: 'data_fim', type: 'date', required: true },
        { name: 'valor_meta', type: 'number', required: true },
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(metas)

    // 5. transacoes
    const transacoes = new Collection({
      name: 'transacoes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['entrada', 'saida'],
          maxSelect: 1,
        },
        { name: 'descricao', type: 'text', required: true },
        {
          name: 'categoria',
          type: 'select',
          required: true,
          values: [
            'comissao',
            'imposto',
            'repasse',
            'aluguel',
            'marketing',
            'salarios',
            'utilidades',
            'manutencao',
            'outros',
          ],
          maxSelect: 1,
        },
        { name: 'valor', type: 'number', required: true },
        { name: 'data', type: 'date', required: true },
        { name: 'consolidado', type: 'bool' },
        {
          name: 'venda',
          type: 'relation',
          collectionId: vendasId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'comissao',
          type: 'relation',
          collectionId: comissoesId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_transacoes_data ON transacoes (data DESC)',
        'CREATE INDEX idx_transacoes_tipo ON transacoes (tipo)',
      ],
    })
    app.save(transacoes)

    // 6. despesas
    const despesas = new Collection({
      name: 'despesas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'descricao', type: 'text', required: true },
        {
          name: 'categoria',
          type: 'select',
          required: true,
          values: ['aluguel', 'marketing', 'salarios', 'utilidades', 'manutencao', 'outros'],
          maxSelect: 1,
        },
        { name: 'valor', type: 'number', required: true },
        { name: 'data', type: 'date', required: true },
        { name: 'recorrente', type: 'bool' },
        {
          name: 'frequencia',
          type: 'select',
          values: ['mensal', 'trimestral', 'semestral', 'anual'],
          maxSelect: 1,
        },
        { name: 'ativa', type: 'bool' },
        { name: 'proxima_data', type: 'date' },
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(despesas)

    // 7. notas_fiscais
    const notasFiscais = new Collection({
      name: 'notas_fiscais',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'numero', type: 'text', required: true },
        {
          name: 'venda',
          type: 'relation',
          collectionId: vendasId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'cliente', type: 'text', required: true },
        { name: 'valor', type: 'number', required: true },
        { name: 'taxa', type: 'number', required: true },
        { name: 'valor_imposto', type: 'number', required: true },
        { name: 'data_emissao', type: 'date', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['emitida', 'cancelada'],
          maxSelect: 1,
        },
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_nf_numero ON notas_fiscais (numero)',
        'CREATE INDEX idx_nf_data ON notas_fiscais (data_emissao DESC)',
      ],
    })
    app.save(notasFiscais)

    // 8. fechamentos
    const fechamentos = new Collection({
      name: 'fechamentos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'mes', type: 'number', required: true },
        { name: 'ano', type: 'number', required: true },
        { name: 'receita_bruta', type: 'number', required: true },
        { name: 'despesas', type: 'number', required: true },
        { name: 'impostos', type: 'number', required: true },
        { name: 'resultado_liquido', type: 'number', required: true },
        { name: 'snapshot', type: 'json' },
        { name: 'data_fechamento', type: 'date', required: true },
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(fechamentos)

    // 9. configuracoes
    const configuracoes = new Collection({
      name: 'configuracoes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'percentual_imobiliaria', type: 'number', required: true },
        { name: 'percentual_corretor', type: 'number', required: true },
        { name: 'percentual_captador', type: 'number', required: true },
        { name: 'percentual_comissao_padrao', type: 'number', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(configuracoes)

    // Also add `perfil` to users if not present
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      if (!users.fields.getByName('perfil')) {
        users.fields.add(
          new SelectField({
            name: 'perfil',
            values: ['socio', 'corretor', 'administrador'],
            maxSelect: 1,
          }),
        )
        app.save(users)
      }
    } catch (_) {}
  },
  (app) => {
    const collections = [
      'configuracoes',
      'fechamentos',
      'notas_fiscais',
      'despesas',
      'transacoes',
      'metas_vgv',
      'comissoes',
      'vendas',
      'corretores',
    ]
    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
