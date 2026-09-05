migrate(
  (app) => {
    const corretores = [
      {
        nome: 'Iris Ap.',
        email: 'iris.ap@imobgestor.local',
        telefone: '',
        creci: '',
        ativo: true,
      },
      {
        nome: 'Luciana Mara',
        email: 'luciana.mara@imobgestor.local',
        telefone: '',
        creci: '',
        ativo: true,
      },
      {
        nome: 'Felipe Augusto',
        email: 'felipe.augusto@imobgestor.local',
        telefone: '',
        creci: '',
        ativo: true,
      },
      {
        nome: 'Alexandre',
        email: 'alexandre@imobgestor.local',
        telefone: '',
        creci: '',
        ativo: true,
      },
      {
        nome: 'Jessica',
        email: 'jessica@imobgestor.local',
        telefone: '',
        creci: '',
        ativo: true,
      },
      {
        nome: 'Hector',
        email: 'hector@imobgestor.local',
        telefone: '',
        creci: '',
        ativo: true,
      },
      {
        nome: 'Carlos Oliveira',
        email: 'carlos.oliveira@imobgestor.local',
        telefone: '',
        creci: '',
        ativo: true,
      },
    ]

    const col = app.findCollectionByNameOrId('corretores')

    for (const c of corretores) {
      try {
        app.findFirstRecordByData('corretores', 'nome', c.nome)
        // Já existe, não duplicar
      } catch (_) {
        const record = new Record(col)
        record.set('nome', c.nome)
        record.set('email', c.email)
        record.set('telefone', c.telefone)
        record.set('creci', c.creci)
        record.set('ativo', c.ativo)
        app.save(record)
      }
    }
  },
  (app) => {
    const nomes = [
      'Iris Ap.',
      'Luciana Mara',
      'Felipe Augusto',
      'Alexandre',
      'Jessica',
      'Hector',
      'Carlos Oliveira',
    ]

    for (const nome of nomes) {
      try {
        const record = app.findFirstRecordByData('corretores', 'nome', nome)
        app.delete(record)
      } catch (_) {}
    }
  },
)
