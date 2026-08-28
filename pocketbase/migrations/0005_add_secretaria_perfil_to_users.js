migrate(
  (app) => {
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      const perfilField = users.fields.getByName('perfil')
      if (perfilField) {
        users.fields.removeByName('perfil')
      }
      users.fields.add(
        new SelectField({
          name: 'perfil',
          values: ['socio', 'secretaria', 'corretor', 'administrador'],
          maxSelect: 1,
        }),
      )
      app.save(users)
    } catch (e) {
      console.log('Error updating users perfil field:', e)
    }
  },
  (app) => {
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      const perfilField = users.fields.getByName('perfil')
      if (perfilField) {
        users.fields.removeByName('perfil')
      }
      users.fields.add(
        new SelectField({
          name: 'perfil',
          values: ['socio', 'corretor', 'administrador'],
          maxSelect: 1,
        }),
      )
      app.save(users)
    } catch (_) {}
  },
)
